import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../services/token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'ERR_AUTH_INVALID',
          message: 'Missing or invalid Authorization header.',
        },
      });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.tokenService.verifyAccessToken(token);
      if (!decoded) {
        throw new UnauthorizedException();
      }
      
      // Attach the user context to request
      request.user = {
        id: decoded.sub,
        role: decoded.role,
      };
      return true;
    } catch (err) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'ERR_AUTH_INVALID',
          message: 'Invalid or expired access token.',
        },
      });
    }
  }
}
