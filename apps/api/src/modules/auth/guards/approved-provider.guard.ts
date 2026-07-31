import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ApprovedProviderGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'PROVIDER') {
      return true;
    }

    const provider = await this.prisma.provider.findUnique({
      where: { id: user.id },
      select: { status: true },
    });

    if (!provider || provider.status !== 'APPROVED') {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ERR_PROVIDER_NOT_APPROVED',
          message: 'Provider account is not approved or is suspended.',
        },
      });
    }

    return true;
  }
}
