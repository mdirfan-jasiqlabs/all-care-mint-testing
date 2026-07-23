import { Injectable } from '@nestjs/common';
import { JwtTokenPair, UserContext } from '@all-care-mint/common';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

export interface IPlatformAuthPublicFacade {
  verifyFirebaseToken(dto: { firebaseToken: string; role: 'CUSTOMER' | 'PROVIDER' }): Promise<JwtTokenPair>;
  rotateRefreshTokens(refreshToken: string): Promise<JwtTokenPair>;
  verifyAdminCredentials(dto: { email: string; password: string }): Promise<JwtTokenPair>;
  getUserContext(userId: string, role: string): Promise<UserContext>;
}

@Injectable()
export class PlatformAuthPublicFacade implements IPlatformAuthPublicFacade {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  async verifyFirebaseToken(dto: { firebaseToken: string; role: 'CUSTOMER' | 'PROVIDER' }): Promise<JwtTokenPair> {
    return this.authService.verifyFirebaseToken(dto);
  }

  async rotateRefreshTokens(refreshToken: string): Promise<JwtTokenPair> {
    return this.tokenService.rotateRefreshTokens(refreshToken);
  }

  async verifyAdminCredentials(dto: { email: string; password: string }): Promise<JwtTokenPair> {
    return this.authService.verifyAdminCredentials(dto);
  }

  async getUserContext(userId: string, role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN'): Promise<UserContext> {
    return this.authService.getUserContext(userId, role);
  }
}
