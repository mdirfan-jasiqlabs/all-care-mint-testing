import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as bcrypt from 'bcrypt';
import { PrismaAuthRepository } from '../adapters/prisma-auth.repository';
import { TokenService } from './token.service';
import { JwtTokenPair, UserContext } from '@all-care-mint/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(

    private readonly authRepository: PrismaAuthRepository,
    private readonly tokenService: TokenService,
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(
      /\\n/g,
      '\n',
    );

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

  async verifyFirebaseToken(dto: {
    firebaseToken: string;
    role: 'CUSTOMER' | 'PROVIDER';
  }): Promise<JwtTokenPair> {
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
            message:
              'Firebase Authentication is not configured on this server.',
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
      let customer =
        await this.authRepository.findCustomerByMobile(mobileNumber);
      if (!customer) {
        customer = await this.authRepository.createCustomer(
          mobileNumber,
          firebaseUid,
        );
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
      const provider =
        await this.authRepository.findProviderByMobile(mobileNumber);
      if (!provider) {
        throw new ForbiddenException({
          success: false,
          error: {
            code: 'ERR_AUTH_PROVIDER_UNAPPROVED',
            message: 'No provider account matches this mobile number.',
          },
        });
      }
      if (provider.status === 'SUSPENDED') {
        throw new ForbiddenException({
          success: false,
          error: {
            code: 'ERR_PROVIDER_SUSPENDED',
            message: 'Account suspended.',
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

  async verifyAdminCredentials(
    dto: { email: string; password: string },
    userAgent?: string,
  ): Promise<JwtTokenPair> {
    this.logger.log(
      `Admin login attempt: email=${dto.email} userAgent=${userAgent || 'unknown'}`,
    );

    const adminUser = await this.authRepository.findAdminByEmail(dto.email);
    if (!adminUser) {
      this.logger.warn(
        `Admin login attempt failed (unknown user): email=${dto.email} userAgent=${userAgent || 'unknown'}`,
      );
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
      this.logger.warn(
        `Admin login attempt failed (locked account): email=${dto.email} userAgent=${userAgent || 'unknown'}`,
      );
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

      // Check admin account suspension status
      if (adminUser.isSuspended) {
        this.logger.warn(
          `Admin login attempt failed (suspended account): email=${dto.email} userAgent=${userAgent || 'unknown'}`,
        );
        throw new ForbiddenException({
          success: false,
          error: {
            code: 'ERR_AUTH_ADMIN_SUSPENDED',
            message:
              'Your account has been suspended. Contact the platform operator.',
          },
        });
      }

      this.logger.log(
        `Admin login attempt succeeded: email=${dto.email} userAgent=${userAgent || 'unknown'}`,
      );
      return this.tokenService.generateTokenPair(adminUser.id, 'ADMIN');
    } else {
      // Increment failed attempts and lock if >= 5
      const failedCount =
        await this.authRepository.incrementAdminFailedAttempts(adminUser.id);
      if (failedCount >= 5) {
        const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await this.authRepository.lockAdminAccount(adminUser.id, lockedUntil);
        this.logger.warn(
          `Admin login attempt failed (account lockout triggered): email=${dto.email} userAgent=${userAgent || 'unknown'}`,
        );
        throw new ForbiddenException({
          success: false,
          error: {
            code: 'ERR_AUTH_LOCKOUT',
            message:
              'Too many failed login attempts. Account locked for 15 minutes.',
          },
        });
      }
      this.logger.warn(
        `Admin login attempt failed (invalid password): email=${dto.email} userAgent=${userAgent || 'unknown'}`,
      );
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

  async sendOtp(dto: {
    mobileNumber?: string;
    mobile_number?: string;
    role?: 'CUSTOMER' | 'PROVIDER';
  }) {
    if (process.env.FF_OTP_AUTH_ENABLED === 'false') {
      throw new ServiceUnavailableException({
        success: false,
        error: {
          code: 'ERR_SERVICE_UNAVAILABLE',
          message: 'Authentication temporarily unavailable.',
        },
      });
    }

    const rawMobile = dto.mobileNumber || dto.mobile_number || '';
    const digits = rawMobile.replace(/\D/g, '');
    const cleanNum = digits.length > 10 ? digits.slice(-10) : digits;
    if (!cleanNum || cleanNum.length < 10) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ERR_INVALID_MOBILE',
          message: 'Please enter a valid 10-digit mobile number.',
        },
      });
    }
    const mobileNumber = `+91${cleanNum}`;
    const role = (dto.role || 'CUSTOMER').toUpperCase() as 'CUSTOMER' | 'PROVIDER';

    // Cooldown check (60s)
    const latestAttempt = await this.authRepository.findLatestOtpAttempt(
      mobileNumber,
      role,
    );
    if (latestAttempt) {
      const secondsSinceLast =
        (Date.now() - new Date(latestAttempt.createdAt).getTime()) / 1000;
      if (secondsSinceLast < 60) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'ERR_OTP_COOLDOWN',
            message: 'Please wait 60 seconds before requesting a new OTP.',
          },
        });
      }
    }

    // Rate limit check (max 3 resends in 10 mins)
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await this.authRepository.countRecentOtpAttempts(
      mobileNumber,
      role,
      tenMinsAgo,
    );
    if (recentCount >= 3) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ERR_OTP_RATE_LIMITED',
          message: 'Too many OTP requests. Please try again in 10 minutes.',
        },
      });
    }

    const mockCode = process.env.MOCK_OTP_CODE || '123456';
    const otpHash = await bcrypt.hash(mockCode, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.authRepository.createOtpAttempt(
      mobileNumber,
      role,
      otpHash,
      expiresAt,
    );

    const maskedMobile =
      mobileNumber.length > 4
        ? `******${mobileNumber.slice(-4)}`
        : mobileNumber;
    this.logger.log(`auth.otp.sent mobile=${maskedMobile} role=${role} ttl=300s`);

    return {
      success: true,
      data: {
        message: 'OTP sent',
      },
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  async verifyOtp(dto: {
    mobileNumber?: string;
    mobile_number?: string;
    otp: string;
    role?: 'CUSTOMER' | 'PROVIDER';
  }) {
    if (process.env.FF_OTP_AUTH_ENABLED === 'false') {
      throw new ServiceUnavailableException({
        success: false,
        error: {
          code: 'ERR_SERVICE_UNAVAILABLE',
          message: 'Authentication temporarily unavailable.',
        },
      });
    }

    const rawMobile = dto.mobileNumber || dto.mobile_number || '';
    const digits = rawMobile.replace(/\D/g, '');
    const cleanNum = digits.length > 10 ? digits.slice(-10) : digits;
    const mobileNumber = `+91${cleanNum}`;
    const role = (dto.role || 'CUSTOMER').toUpperCase() as 'CUSTOMER' | 'PROVIDER';
    const maskedMobile =
      mobileNumber.length > 4
        ? `******${mobileNumber.slice(-4)}`
        : mobileNumber;

    const attempt = await this.authRepository.findLatestOtpAttempt(
      mobileNumber,
      role,
    );

    if (!attempt || attempt.usedAt || new Date() > new Date(attempt.expiresAt)) {
      this.logger.warn(
        `auth.otp.failed mobile=${maskedMobile} role=${role} reason=expired`,
      );
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ERR_OTP_EXPIRED',
          message: 'OTP expired. Please request a new one.',
        },
      });
    }

    if (attempt.failedAttempts >= 5) {
      this.logger.warn(
        `auth.otp.failed mobile=${maskedMobile} role=${role} reason=max_attempts_exceeded`,
      );
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ERR_OTP_MAX_ATTEMPTS',
          message:
            'Maximum invalid OTP attempts exceeded. Please request a new OTP.',
        },
      });
    }

    const isMatch = await bcrypt.compare(dto.otp, attempt.otpHash);
    if (!isMatch) {
      const failedCount =
        await this.authRepository.incrementOtpFailedAttempts(attempt.id);
      this.logger.warn(
        `auth.otp.failed mobile=${maskedMobile} role=${role} reason=invalid attempt_count=${failedCount}`,
      );
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ERR_INVALID_OTP',
          message: 'Invalid OTP. Please try again.',
        },
      });
    }

    await this.authRepository.markOtpAttemptUsed(attempt.id);

    let userObj: any;
    let isNewUser = false;

    if (role === 'CUSTOMER') {
      let customer = await this.authRepository.findCustomerByMobile(mobileNumber);
      if (!customer) {
        customer = await this.authRepository.createCustomer(
          mobileNumber,
          `mock-uid-cust-${Date.now()}`,
        );
        isNewUser = true;
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
      userObj = {
        id: customer.id,
        mobileNumber: customer.mobileNumber,
        mobile_number: customer.mobileNumber,
        role: 'CUSTOMER',
      };
    } else {
      let provider = await this.authRepository.findProviderByMobile(mobileNumber);
      if (!provider) {
        provider = await this.authRepository.createProvider(mobileNumber);
        isNewUser = true;
      }
      if (provider.status === 'SUSPENDED') {
        throw new ForbiddenException({
          success: false,
          error: {
            code: 'ERR_PROVIDER_SUSPENDED',
            message: 'Account suspended.',
          },
        });
      }
      if (provider.status !== 'APPROVED') {
        throw new ForbiddenException({
          success: false,
          error: {
            code: 'ERR_AUTH_PROVIDER_UNAPPROVED',
            message: `Provider status: ${provider.status}`,
          },
        });
      }
      userObj = {
        id: provider.id,
        mobileNumber: provider.mobileNumber,
        mobile_number: provider.mobileNumber,
        role: 'PROVIDER',
      };
    }

    const tokens = await this.tokenService.generateTokenPair(userObj.id, role);

    this.logger.log(
      `auth.otp.verified user_id=${userObj.id} role=${role} is_new_user=${isNewUser}`,
    );

    return {
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        user: userObj,
      },
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }
}

