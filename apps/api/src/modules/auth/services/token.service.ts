import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { PrismaAuthRepository } from '../adapters/prisma-auth.repository';
import { JwtTokenPair } from '@all-care-mint/common';

@Injectable()
export class TokenService {
  private readonly privateKey: string;
  private readonly publicKey: string;

  constructor(private readonly authRepository: PrismaAuthRepository) {
    // Replace literal escape sequences with actual newlines
    this.privateKey = (process.env.JWT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    this.publicKey = (process.env.JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n');
    if (!this.privateKey || !this.publicKey) {
      throw new Error(
        'JWT cryptographic keys are not configured. Failing closed.',
      );
    }
  }

  async generateTokenPair(
    userId: string,
    role: string,
    tokenFamilyId?: string,
    parentId?: string,
  ): Promise<JwtTokenPair> {
    const accessPayload = { sub: userId, role };

    const pKey = this.privateKey;
    if (!pKey) {
      throw new Error('JWT private key is missing. Failing closed.');
    }

    const accessToken = jwt.sign(accessPayload, pKey, {
      algorithm: 'RS256',
      expiresIn: '15m',
    });

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    const familyId = tokenFamilyId || crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.authRepository.saveRefreshToken(
      userId,
      role,
      refreshHash,
      expiresAt,
      familyId,
      parentId,
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 15 * 60, // 15 minutes
    };
  }

  async rotateRefreshTokens(rawRefreshToken: string): Promise<JwtTokenPair> {
    const refreshHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');
    const tokenRecord = await this.authRepository.findRefreshToken(refreshHash);

    if (!tokenRecord) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'ERR_AUTH_INVALID',
          message: 'Invalid refresh token.',
        },
      });
    }

    const {
      id,
      userId,
      userRole,
      tokenFamilyId,
      expiresAt,
      lastActivity,
      isRevoked,
    } = tokenRecord;

    // 1. Theft / Reuse Detection
    if (isRevoked) {
      // Replay attack: revoke entire family immediately
      await this.authRepository.revokeTokenFamily(
        tokenFamilyId,
        'REUSE_REPLAY_ATTACK',
      );
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'ERR_AUTH_INVALID',
          message:
            'Refresh token reuse detected. Access revoked for the entire session.',
        },
      });
    }

    // 2. Expiry check (7 days total lifetime)
    if (new Date() > new Date(expiresAt)) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'ERR_AUTH_EXPIRED',
          message: 'Refresh token has expired.',
        },
      });
    }

    // 3. Inactivity check (8 hours)
    const inactiveLimit = 8 * 60 * 60 * 1000; // 8 hours in ms
    if (Date.now() - new Date(lastActivity).getTime() > inactiveLimit) {
      await this.authRepository.revokeTokenFamily(tokenFamilyId, 'INACTIVITY');
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'ERR_AUTH_EXPIRED',
          message: 'Session expired due to inactivity.',
        },
      });
    }

    // 4. Update last activity of current token, revoke it, and generate a new one
    await this.authRepository.updateLastActivity(id);
    await this.authRepository.revokeToken(id, 'ROTATED');

    return this.generateTokenPair(userId, userRole, tokenFamilyId, id);
  }

  verifyAccessToken(token: string): any {
    const pubKey = this.publicKey;
    if (!pubKey) {
      throw new Error('JWT public key is missing. Failing closed.');
    }
    return jwt.verify(token, pubKey, { algorithms: ['RS256'] });
  }
}
