import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { PrismaAuthRepository } from '../adapters/prisma-auth.repository';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let authRepository: jest.Mocked<PrismaAuthRepository>;
  let tokenService: jest.Mocked<TokenService>;

  const mockTokenPair = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 900,
  };

  beforeEach(async () => {
    const mockRepo = {
      findCustomerByMobile: jest.fn(),
      createCustomer: jest.fn(),
      findProviderByMobile: jest.fn(),
      findAdminByEmail: jest.fn(),
      findAdminById: jest.fn(),
      findCustomerById: jest.fn(),
      findProviderById: jest.fn(),
      incrementAdminFailedAttempts: jest.fn(),
      lockAdminAccount: jest.fn(),
      resetAdminFailedAttempts: jest.fn(),
    };

    const mockTokenSvc = {
      generateTokenPair: jest.fn().mockResolvedValue(mockTokenPair),
      rotateRefreshTokens: jest.fn(),
      verifyAccessToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaAuthRepository, useValue: mockRepo },
        { provide: TokenService, useValue: mockTokenSvc },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    authRepository = module.get(PrismaAuthRepository);
    tokenService = module.get(TokenService);
  });

  describe('verifyFirebaseToken (TC-UNIT-000-001)', () => {
    it('should verify customer mock token and return token pair', async () => {
      authRepository.findCustomerByMobile.mockResolvedValue({
        id: 'cust-123',
        mobileNumber: '+919876543210',
        isSuspended: false,
      });

      const result = await authService.verifyFirebaseToken({
        firebaseToken: 'mock-token-customer',
        role: 'CUSTOMER',
      });

      expect(result).toEqual(mockTokenPair);
      expect(tokenService.generateTokenPair).toHaveBeenCalledWith('cust-123', 'CUSTOMER');
    });

    it('should create customer if customer mobile does not exist', async () => {
      authRepository.findCustomerByMobile.mockResolvedValue(null);
      authRepository.createCustomer.mockResolvedValue({
        id: 'cust-new',
        mobileNumber: '+919876543210',
        isSuspended: false,
      });

      const result = await authService.verifyFirebaseToken({
        firebaseToken: 'mock-token-customer',
        role: 'CUSTOMER',
      });

      expect(authRepository.createCustomer).toHaveBeenCalledWith('+919876543210', 'mock-uid-customer');
      expect(result).toEqual(mockTokenPair);
    });

    it('should throw ForbiddenException if customer is suspended', async () => {
      authRepository.findCustomerByMobile.mockResolvedValue({
        id: 'cust-123',
        mobileNumber: '+919876543210',
        isSuspended: true,
      });

      await expect(
        authService.verifyFirebaseToken({
          firebaseToken: 'mock-token-customer',
          role: 'CUSTOMER',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for unapproved provider (TC-INT-000-002)', async () => {
      authRepository.findProviderByMobile.mockResolvedValue({
        id: 'prov-123',
        mobileNumber: '+919876543211',
        status: 'PENDING_REVIEW',
      });

      await expect(
        authService.verifyFirebaseToken({
          firebaseToken: 'mock-token-provider',
          role: 'PROVIDER',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('verifyAdminCredentials (TC-INT-000-003)', () => {
    it('should return token pair on valid credentials', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      authRepository.findAdminByEmail.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@allcaremint.com',
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
      });

      const result = await authService.verifyAdminCredentials({
        email: 'admin@allcaremint.com',
        password: 'secret123',
      });

      expect(result).toEqual(mockTokenPair);
      expect(authRepository.resetAdminFailedAttempts).toHaveBeenCalledWith('admin-1');
    });

    it('should throw UnauthorizedException on invalid email', async () => {
      authRepository.findAdminByEmail.mockResolvedValue(null);

      await expect(
        authService.verifyAdminCredentials({
          email: 'invalid@allcaremint.com',
          password: 'secret123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should lock account and throw ForbiddenException after 5 failed attempts (TC-INT-000-003)', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      authRepository.findAdminByEmail.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@allcaremint.com',
        passwordHash,
        failedAttempts: 4,
        lockedUntil: null,
      });

      authRepository.incrementAdminFailedAttempts.mockResolvedValue(5);

      await expect(
        authService.verifyAdminCredentials({
          email: 'admin@allcaremint.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(authRepository.lockAdminAccount).toHaveBeenCalledWith('admin-1', expect.any(Date));
    });
  });
});
