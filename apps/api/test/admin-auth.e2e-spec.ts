jest.mock('jose', () => ({}));

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue('OK'),
    };
  });
});

// Mock bullmq
jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        getRepeatableJobs: jest.fn().mockResolvedValue([]),
        removeRepeatableByKey: jest.fn().mockResolvedValue(true),
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
        close: jest.fn().mockResolvedValue(undefined),
      };
    }),
    Worker: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin Authentication Flow (US-000-002 E2E)', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let prisma: PrismaService;
  let activeAdminId: string;
  let suspendedAdminId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Clean up any old test admin users
    await prisma.adminUser.deleteMany({
      where: {
        email: {
          in: ['active-admin@allcaremint.com', 'suspended-admin@allcaremint.com'],
        },
      },
    });

    const activeHash = await bcrypt.hash('ActivePass@123', 10);
    const suspendedHash = await bcrypt.hash('SuspendedPass@123', 10);

    // Create test active admin
    const activeAdmin = await prisma.adminUser.create({
      data: {
        email: 'active-admin@allcaremint.com',
        passwordHash: activeHash,
        isSuspended: false,
      },
    });
    activeAdminId = activeAdmin.id;

    // Create test suspended admin
    const suspendedAdmin = await prisma.adminUser.create({
      data: {
        email: 'suspended-admin@allcaremint.com',
        passwordHash: suspendedHash,
        isSuspended: true,
      },
    });
    suspendedAdminId = suspendedAdmin.id;
  });

  afterAll(async () => {
    // Cleanup database
    await prisma.adminUser.deleteMany({
      where: {
        id: {
          in: [activeAdminId, suspendedAdminId],
        },
      },
    });
    await app.close();
  });

  it('1. POST /api/v1/auth/admin/login - Valid active admin should log in successfully', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/admin/login')
      .send({
        email: 'active-admin@allcaremint.com',
        password: 'ActivePass@123',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.role).toBe('ADMIN');

    // Decode and verify JWT payload
    const token = res.body.data.accessToken;
    const decoded: any = jwt.decode(token);
    expect(decoded.role).toBe('ADMIN');
    
    // exp - iat should be approximately 4 hours (14400s)
    const diff = decoded.exp - decoded.iat;
    expect(diff).toBeCloseTo(14400, -1); // Close to 14400 within some bounds

    // Check refresh token cookie is set
    const cookies = res.headers['set-cookie'] || [];
    const hasRefreshCookie = cookies.some((c: string) => c.includes('admin_refresh_token='));
    expect(hasRefreshCookie).toBe(true);
  });

  it('2. POST /api/v1/auth/admin/login - Wrong password should return HTTP 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/admin/login')
      .send({
        email: 'active-admin@allcaremint.com',
        password: 'WrongPassword',
      })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Invalid email or password.');
    expect(res.body.data).toBeUndefined();
  });

  it('3. POST /api/v1/auth/admin/login - Unknown email should return HTTP 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/admin/login')
      .send({
        email: 'nonexistent-admin@allcaremint.com',
        password: 'Password123',
      })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Invalid email or password.');
  });

  it('4. POST /api/v1/auth/admin/login - Suspended admin should return HTTP 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/admin/login')
      .send({
        email: 'suspended-admin@allcaremint.com',
        password: 'SuspendedPass@123',
      })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Your account has been suspended. Contact the platform operator.');
    expect(res.body.data).toBeUndefined();
    
    // Ensure no set-cookie header is returned
    const cookies = res.headers['set-cookie'] || [];
    const hasRefreshCookie = cookies.some((c: string) => c.includes('admin_refresh_token='));
    expect(hasRefreshCookie).toBe(false);
  });

  it('5. GET /api/v1/admin/bookings - Unauthenticated access should return HTTP 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/bookings')
      .expect(401);
  });
});
