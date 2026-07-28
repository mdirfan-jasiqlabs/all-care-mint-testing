import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';
import { PrismaAuthRepository } from '../adapters/prisma-auth.repository';

describe('TokenService', () => {
  let tokenService: TokenService;
  let authRepository: jest.Mocked<PrismaAuthRepository>;

  beforeEach(async () => {
    const mockRepo = {
      saveRefreshToken: jest.fn().mockResolvedValue(undefined),
      findRefreshToken: jest.fn(),
      revokeTokenFamily: jest.fn().mockResolvedValue(undefined),
      revokeToken: jest.fn().mockResolvedValue(undefined),
      updateLastActivity: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: PrismaAuthRepository, useValue: mockRepo },
      ],
    }).compile();

    tokenService = module.get<TokenService>(TokenService);
    authRepository = module.get(PrismaAuthRepository);
  });

  describe('generateTokenPair', () => {
    it('should generate valid JWT access token and refresh token for CUSTOMER', async () => {
      const result = await tokenService.generateTokenPair(
        'user-123',
        'CUSTOMER',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.expiresIn).toBe(900);
      expect(authRepository.saveRefreshToken).toHaveBeenCalled();
    });

    it('should generate valid JWT access token with 4h expiry for ADMIN', async () => {
      const result = await tokenService.generateTokenPair(
        'admin-123',
        'ADMIN',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.expiresIn).toBe(14400); // 4 hours
    });
  });

  describe('rotateRefreshTokens (TC-UNIT-000-006 & TC-SEC-000-012)', () => {
    it('should rotate token successfully if valid', async () => {
      authRepository.findRefreshToken.mockResolvedValue({
        id: 'token-uuid-1',
        userId: 'user-123',
        userRole: 'CUSTOMER',
        tokenFamilyId: 'family-123',
        expiresAt: new Date(Date.now() + 86400000),
        lastActivity: new Date(),
        isRevoked: false,
      });

      const result =
        await tokenService.rotateRefreshTokens('raw-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(authRepository.revokeToken).toHaveBeenCalledWith(
        'token-uuid-1',
        'ROTATED',
      );
      expect(authRepository.saveRefreshToken).toHaveBeenCalled();
    });

    it('should detect token reuse attack and revoke family (TC-SEC-000-012)', async () => {
      authRepository.findRefreshToken.mockResolvedValue({
        id: 'token-uuid-1',
        userId: 'user-123',
        userRole: 'CUSTOMER',
        tokenFamilyId: 'family-123',
        expiresAt: new Date(Date.now() + 86400000),
        lastActivity: new Date(),
        isRevoked: true, // Already revoked!
      });

      await expect(
        tokenService.rotateRefreshTokens('stolen-token'),
      ).rejects.toThrow(UnauthorizedException);
      expect(authRepository.revokeTokenFamily).toHaveBeenCalledWith(
        'family-123',
        'REUSE_REPLAY_ATTACK',
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      authRepository.findRefreshToken.mockResolvedValue({
        id: 'token-uuid-1',
        userId: 'user-123',
        userRole: 'CUSTOMER',
        tokenFamilyId: 'family-123',
        expiresAt: new Date(Date.now() - 1000), // Expired!
        lastActivity: new Date(),
        isRevoked: false,
      });

      await expect(
        tokenService.rotateRefreshTokens('expired-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
