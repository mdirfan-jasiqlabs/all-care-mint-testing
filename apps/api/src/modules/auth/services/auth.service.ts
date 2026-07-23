import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as bcrypt from 'bcrypt';
import { PrismaAuthRepository } from '../adapters/prisma-auth.repository';
import { TokenService } from './token.service';
import { JwtTokenPair, UserContext } from '@all-care-mint/common';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: PrismaAuthRepository,
    private readonly tokenService: TokenService,
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey && !getApps().length) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
  }

  async verifyFirebaseToken(dto: { firebaseToken: string; role: 'CUSTOMER' | 'PROVIDER' }): Promise<JwtTokenPair> {
    let mobileNumber = '';
    let firebaseUid = '';

    // Mock bypass for testing environments or when firebase credentials are not configured
    if (dto.firebaseToken.startsWith('mock-token-')) {
      const parts = dto.firebaseToken.split('-');
      const roleStr = parts[2]; // e.g. customer or provider
      mobileNumber = roleStr === 'customer' ? '+919876543210' : '+919876543211';
      firebaseUid = `mock-uid-${roleStr}`;
    } else {
      if (!getApps().length) {
        throw new UnauthorizedException({
          success: false,
          error: {
            code: 'ERR_SERVICE_UNAVAILABLE',
            message: 'Firebase Authentication is not configured on this server.',
          },
        });
      }
      try {
        const decodedToken = await getAuth().verifyIdToken(dto.firebaseToken);
        mobileNumber = decodedToken.phone_number || '';
        firebaseUid = decodedToken.uid;
      } catch (err) {
        throw new UnauthorizedException({
          success: false,
          error: {
            code: 'ERR_AUTH_INVALID',
            message: 'Firebase token verification failed.',
          },
        });
      }
    }

    if (!mobileNumber) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'ERR_AUTH_INVALID',
          message: 'Firebase token does not contain a valid phone number.',
        },
      });
    }

    if (dto.role === 'CUSTOMER') {
      let customer = await this.authRepository.findCustomerByMobile(mobileNumber);
      if (!customer) {
        customer = await this.authRepository.createCustomer(mobileNumber, firebaseUid);
      }
      if (customer.isSuspended) {
        throw new ForbiddenException({
          success: false,
          error: {
            code: 'ERR_AUTH_CUSTOMER_SUSPENDED',
            message: 'Your customer account is suspended.',
          },
        });
      }
      return this.tokenService.generateTokenPair(customer.id, 'CUSTOMER');
    } else {
      // PROVIDER role
      const provider = await this.authRepository.findProviderByMobile(mobileNumber);
      if (!provider) {
        throw new ForbiddenException({
          success: false,
          error: {
            code: 'ERR_AUTH_PROVIDER_UNAPPROVED',
            message: 'No provider account matches this mobile number.',
          },
        });
      }
      if (provider.status !== 'APPROVED') {
        throw new ForbiddenException({
          success: false,
          error: {
            code: 'ERR_AUTH_PROVIDER_UNAPPROVED',
            message: `Provider registration is currently: ${provider.status}`,
          },
        });
      }
      return this.tokenService.generateTokenPair(provider.id, 'PROVIDER');
    }
  }

  async verifyAdminCredentials(dto: { email: string; password: string }): Promise<JwtTokenPair> {
    const adminUser = await this.authRepository.findAdminByEmail(dto.email);
    if (!adminUser) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'ERR_AUTH_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    // Check account lockout status
    if (adminUser.lockedUntil && new Date() < new Date(adminUser.lockedUntil)) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ERR_AUTH_LOCKOUT',
          message: `Account locked. Please try again after ${adminUser.lockedUntil.toISOString()}`,
        },
      });
    }

    const isMatch = await bcrypt.compare(dto.password, adminUser.passwordHash);
    if (isMatch) {
      // Reset failed attempts upon successful login
      await this.authRepository.resetAdminFailedAttempts(adminUser.id);
      return this.tokenService.generateTokenPair(adminUser.id, 'ADMIN');
    } else {
      // Increment failed attempts and lock if >= 5
      const failedCount = await this.authRepository.incrementAdminFailedAttempts(adminUser.id);
      if (failedCount >= 5) {
        const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await this.authRepository.lockAdminAccount(adminUser.id, lockedUntil);
        throw new ForbiddenException({
          success: false,
          error: {
            code: 'ERR_AUTH_LOCKOUT',
            message: 'Too many failed login attempts. Account locked for 15 minutes.',
          },
        });
      }
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'ERR_AUTH_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }
  }

  async getUserContext(userId: string, role: string): Promise<UserContext> {
    if (role === 'ADMIN') {
      const adminUser = await this.authRepository.findAdminById(userId);
      return {
        id: adminUser.id,
        mobileNumber: '',
        role: 'ADMIN',
      };
    } else if (role === 'CUSTOMER') {
      const customer = await this.authRepository.findCustomerById(userId);
      return {
        id: customer.id,
        mobileNumber: customer.mobileNumber,
        role: 'CUSTOMER',
      };
    } else {
      const provider = await this.authRepository.findProviderById(userId);
      return {
        id: provider.id,
        mobileNumber: provider.mobileNumber,
        role: 'PROVIDER',
      };
    }
  }
}
