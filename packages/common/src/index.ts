export interface JwtTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserContext {
  id: string;
  mobileNumber: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
}

export * from './apiClient';

