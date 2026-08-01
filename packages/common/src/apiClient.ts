export interface ApiClientConfig {
  baseUrl?: string;
  getToken?: () => string | undefined | null | Promise<string | undefined | null>;
  onUnauthorized?: () => void | Promise<void>;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  statusText: string;
  data: any;

  constructor(status: number, statusText: string, data: any) {
    const message =
      typeof data === 'object' && data !== null && data.message
        ? data.message
        : typeof data === 'string'
        ? data
        : `HTTP Error ${status}: ${statusText}`;
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
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || '';
    this.getToken = config.getToken;
    this.onUnauthorized = config.onUnauthorized;
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

  public async raw(path: string, options: RequestInit = {}): Promise<Response> {
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
