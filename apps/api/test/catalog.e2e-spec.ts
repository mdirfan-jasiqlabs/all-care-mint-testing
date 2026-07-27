import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaModule } from '../src/prisma/prisma.module';
import { CatalogController } from '../src/modules/catalog/controllers/catalog.controller';
import { AdminCatalogController } from '../src/modules/catalog/controllers/admin-catalog.controller';
import { CatalogService } from '../src/modules/catalog/services/catalog.service';
import { AdminCatalogService } from '../src/modules/catalog/services/admin-catalog.service';
import { PrismaCatalogRepository } from '../src/modules/catalog/adapters/prisma-catalog.repository';
import { TokenService } from '../src/modules/auth/services/token.service';

describe('Catalog Module (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const mockTokenService = {
      verifyAccessToken: jest.fn().mockImplementation((token: string) => {
        if (token === 'admin-token') return { sub: 'admin-1', role: 'ADMIN' };
        if (token === 'customer-token')
          return { sub: 'cust-1', role: 'CUSTOMER' };
        return null;
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      controllers: [CatalogController, AdminCatalogController],
      providers: [
        CatalogService,
        AdminCatalogService,
        {
          provide: 'ICatalogRepository',
          useClass: PrismaCatalogRepository,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/catalog/categories (TC-INT-001-002)', () => {
    it('should return 401 Unauthorized when no JWT token is provided', () => {
      return request(app.getHttpServer())
        .get('/api/v1/catalog/categories')
        .expect(401);
    });
  });

  describe('GET /api/v1/public/categories', () => {
    it('should return 200 OK without requiring authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/public/categories')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/v1/admin/catalog/categories (TC-SEC-001-007)', () => {
    it('should return 401 Unauthorized when unauthenticated user attempts admin create', () => {
      return request(app.getHttpServer())
        .post('/api/v1/admin/catalog/categories')
        .send({ name: 'Unauthorized Category' })
        .expect(401);
    });

    it('should return 403 Forbidden when Customer role attempts admin create', () => {
      return request(app.getHttpServer())
        .post('/api/v1/admin/catalog/categories')
        .set('Authorization', 'Bearer customer-token')
        .send({ name: 'Forbidden Category' })
        .expect(403);
    });
  });
});
