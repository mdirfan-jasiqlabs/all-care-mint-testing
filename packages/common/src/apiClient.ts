export interface ApiClientConfig {
  baseUrl?: string;
  getToken?: () => string | undefined | null | Promise<string | undefined | null>;
  onUnauthorized?: () => void | Promise<void>;
  headers?: Record<string, string>;
  refreshToken?: () => Promise<boolean | 'unauthenticated' | 'offline'>;
}

export class ApiError extends Error {
  status: number;
  statusText: string;
  data: any;

  constructor(status: number, statusText: string, data: any) {
    let msg: string | null = null;
    if (typeof data === 'string') {
      msg = data;
    } else if (typeof data === 'object' && data !== null) {
      if (typeof data.message === 'string') {
        msg = data.message;
      } else if (data.error && typeof data.error === 'object' && typeof data.error.message === 'string') {
        msg = data.error.message;
      } else if (typeof data.error === 'string') {
        msg = data.error;
      } else if (data.response && typeof data.response === 'object') {
        if (typeof data.response.message === 'string') msg = data.response.message;
        else if (data.response.error && typeof data.response.error.message === 'string') msg = data.response.error.message;
      }
    }
    const message = msg || `HTTP Error ${status}: ${statusText}`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

export class ApiClient {
  private baseUrl: string;
  private getToken?: () => string | undefined | null | Promise<string | undefined | null>;
  private onUnauthorized?: () => void | Promise<void>;
  private refreshTokenHandler?: () => Promise<boolean | 'unauthenticated' | 'offline'>;
  private defaultHeaders: Record<string, string>;
  private refreshPromise: Promise<boolean | 'unauthenticated' | 'offline'> | null = null;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || '';
    this.getToken = config.getToken;
    this.onUnauthorized = config.onUnauthorized;
    this.refreshTokenHandler = config.refreshToken;
    this.defaultHeaders = config.headers || {};
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private resolveUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const cleanBase = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }

  public async raw(
    path: string,
    options: RequestInit & { _retry?: boolean; skipRefresh?: boolean } = {}
  ): Promise<Response> {
    const url = this.resolveUrl(path);

    let customHeaders: Record<string, string> = {};
    if (options.headers) {
      if (typeof Headers !== 'undefined' && options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          customHeaders[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          customHeaders[key] = value;
        });
      } else {
        customHeaders = { ...(options.headers as Record<string, string>) };
      }
    }

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...customHeaders,
    };

    if (options.body !== undefined && !Object.keys(headers).some((k) => k.toLowerCase() === 'content-type')) {
      headers['Content-Type'] = 'application/json';
    }

    const hasAuthHeader = Object.keys(headers).some(
      (k) => k.toLowerCase() === 'authorization'
    );
    if (!hasAuthHeader && this.getToken) {
      try {
        const token = await this.getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (e) {
        // Ignore token retrieval errors
      }
    }

    const init: RequestInit = {
      ...options,
      headers,
    };

    const res = await fetch(url, init);

    const isRefreshPath =
      path.includes('/auth/token/refresh') || path.includes('/auth/refresh');
    const shouldAttemptRefresh =
      res.status === 401 &&
      !options._retry &&
      !options.skipRefresh &&
      !isRefreshPath &&
      !!this.refreshTokenHandler;

    if (shouldAttemptRefresh) {
      if (!this.refreshPromise) {
        this.refreshPromise = (async () => {
          try {
            return await this.refreshTokenHandler!();
          } catch (err) {
            return 'offline';
          } finally {
            this.refreshPromise = null;
          }
        })();
      }

      const refreshResult = await this.refreshPromise;

      if (refreshResult === true) {
        let newToken: string | null | undefined = null;
        if (this.getToken) {
          try {
            newToken = await this.getToken();
          } catch (e) {}
        }

        const retryHeaders: Record<string, string> = { ...headers };
        if (newToken) {
          retryHeaders['Authorization'] = `Bearer ${newToken}`;
        } else {
          delete retryHeaders['Authorization'];
        }

        return this.raw(path, {
          ...options,
          headers: retryHeaders,
          _retry: true,
        });
      }

      if (refreshResult === 'offline') {
        // Network error during refresh: preserve credentials, do NOT call onUnauthorized
        return res;
      }
    }

    if (res.status === 401 && this.onUnauthorized) {
      try {
        await this.onUnauthorized();
      } catch (e) {
        // Ignore onUnauthorized callback errors
      }
    }

    return res;
  }

  public async request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await this.raw(path, options);

    if (!res.ok) {
      let errorData: any;
      try {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorData = await res.json();
        } else {
          errorData = await res.text();
        }
      } catch (e) {
        errorData = null;
      }
      throw new ApiError(res.status, res.statusText, errorData);
    }

    if (res.status === 204) {
      return {} as T;
    }

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }

    const textData = await res.text();
    try {
      return JSON.parse(textData) as T;
    } catch {
      return textData as unknown as T;
    }
  }

  public async get<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  public async post<T = any>(path: string, body?: any, options: RequestInit = {}): Promise<T> {
    const init: RequestInit = {
      ...options,
      method: 'POST',
    };
    if (body !== undefined) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    return this.request<T>(path, init);
  }

  public async put<T = any>(path: string, body?: any, options: RequestInit = {}): Promise<T> {
    const init: RequestInit = {
      ...options,
      method: 'PUT',
    };
    if (body !== undefined) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    return this.request<T>(path, init);
  }

  public async patch<T = any>(path: string, body?: any, options: RequestInit = {}): Promise<T> {
    const init: RequestInit = {
      ...options,
      method: 'PATCH',
    };
    if (body !== undefined) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    return this.request<T>(path, init);
  }

  public async delete<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}
