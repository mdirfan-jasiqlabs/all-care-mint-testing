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
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('OTP Auth Flow (US-000-001 E2E)', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Delete test OTP attempts to avoid cooldown locks
    await prisma.otpAttempt.deleteMany({
      where: {
        mobileNumber: {
          in: ['+919876543201', '+919876543202', '+919876543203', '+919876543204'],
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/otp/send should dispatch mock OTP without returning code in payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({
        mobileNumber: '9876543201',
        role: 'CUSTOMER',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('OTP sent');
    expect(res.body.data.otp).toBeUndefined();
    expect(res.body.data.otpCode).toBeUndefined();
  });

  it('POST /api/v1/auth/otp/verify should return 400 for wrong OTP', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({
        mobileNumber: '9876543202',
        role: 'CUSTOMER',
      });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({
        mobileNumber: '9876543202',
        otp: '000000',
        role: 'CUSTOMER',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ERR_INVALID_OTP');
  });

  it('POST /api/v1/auth/otp/verify should verify valid mock OTP (123456) and return access & refresh tokens', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({
        mobileNumber: '9876543203',
        role: 'CUSTOMER',
      });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({
        mobileNumber: '9876543203',
        otp: '123456',
        role: 'CUSTOMER',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.role).toBe('CUSTOMER');
  });

  it('POST /api/v1/auth/token/refresh should rotate refresh token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({
        mobileNumber: '9876543204',
        role: 'PROVIDER',
      });

    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({
        mobileNumber: '9876543204',
        otp: '123456',
        role: 'PROVIDER',
      })
      .expect(200);

    const refreshToken = verifyRes.body.data.refreshToken;

    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/token/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();
  });
});
