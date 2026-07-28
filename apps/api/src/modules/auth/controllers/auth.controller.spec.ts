import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { PrismaAuthRepository } from '../adapters/prisma-auth.repository';

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  cert: jest.fn(),
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn((token) => {
      if (token === 'mock-token-customer') {
        return Promise.resolve({
          phone_number: '+919876543210',
          uid: 'mock-uid-customer',
        });
      }
      if (token === 'mock-token-provider') {
        return Promise.resolve({
          phone_number: '+919876543211',
          uid: 'mock-uid-provider',
        });
      }
      throw new Error('Invalid token');
    }),
  })),
}));

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let tokenService: jest.Mocked<TokenService>;
  let authRepository: jest.Mocked<PrismaAuthRepository>;

  const mockTokens = {
    accessToken: 'access-123',
    refreshToken: 'refresh-123',
    expiresIn: 900,
  };

  beforeEach(async () => {
    const mockAuthSvc = {
      sendOtp: jest.fn().mockResolvedValue({
        success: true,
        data: { message: 'OTP sent' },
      }),
      verifyOtp: jest.fn().mockResolvedValue({
        success: true,
        data: { accessToken: 'access-123', refreshToken: 'refresh-123' },
      }),
      verifyFirebaseToken: jest.fn().mockResolvedValue(mockTokens),
      verifyAdminCredentials: jest.fn().mockResolvedValue(mockTokens),
      getUserContext: jest.fn(),
    };


    const mockTokenSvc = {
      rotateRefreshTokens: jest.fn().mockResolvedValue(mockTokens),
      generateTokenPair: jest.fn(),
      verifyAccessToken: jest.fn(),
    };

    const mockRepo = {
      findCustomerByMobile: jest
        .fn()
        .mockResolvedValue({ id: 'cust-1', mobileNumber: '+919876543210' }),
      findProviderByMobile: jest
        .fn()
        .mockResolvedValue({ id: 'prov-1', mobileNumber: '+919876543211' }),
      findRefreshToken: jest.fn().mockResolvedValue({ id: 'ref-1' }),
      revokeToken: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthSvc },
        { provide: TokenService, useValue: mockTokenSvc },
        { provide: PrismaAuthRepository, useValue: mockRepo },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    tokenService = module.get(TokenService);
    authRepository = module.get(PrismaAuthRepository);
  });

  it('verifyCustomerOtp should verify token and return formatted payload', async () => {
    const response = await controller.verifyCustomerOtp({
      firebaseToken: 'mock-token-customer',
      role: 'CUSTOMER',
    });

    expect(response.success).toBe(true);
    expect(response.data.accessToken).toBe('access-123');
    expect(response.data.user.role).toBe('CUSTOMER');
  });

  it('verifyProviderOtp should verify token and return formatted provider payload', async () => {
    const response = await controller.verifyProviderOtp({
      firebaseToken: 'mock-token-provider',
      role: 'PROVIDER',
    });

    expect(response.success).toBe(true);
    expect(response.data.accessToken).toBe('access-123');
    expect(response.data.user.role).toBe('PROVIDER');
  });

  it('adminLogin should verify credentials and set refresh cookie (TC-API-000-004)', async () => {
    const mockRes = {
      header: jest.fn(),
    };

    const response = await controller.adminLogin(
      { email: 'admin@allcaremint.com', password: 'password123' },
      'mock-user-agent',
      mockRes as any,
    );

    expect(response.success).toBe(true);
    expect(mockRes.header).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('admin_refresh_token=refresh-123'),
    );
  });

  it('refresh should rotate refresh tokens (TC-API-000-005)', async () => {
    const response = await controller.refresh({
      refreshToken: 'valid-refresh-token',
    });

    expect(response.success).toBe(true);
    expect(response.data).toEqual(mockTokens);
  });

  it('logout should revoke active refresh token', async () => {
    const response = await controller.logout({
      refreshToken: 'valid-refresh-token',
    });

    expect(response.success).toBe(true);
    expect(authRepository.revokeToken).toHaveBeenCalledWith('ref-1', 'LOGOUT');
  });
});
