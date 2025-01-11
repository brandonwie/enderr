import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('/health', () => {
    it('GET /health/ping should return ok status', () => {
      return request(app.getHttpServer())
        .get('/health/ping')
        .expect(200)
        .expect({ status: 'ok' });
    });

    it('GET /health should return health check results', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('info');
          expect(res.body.info).toHaveProperty('postgresql');
          expect(res.body.info).toHaveProperty('dynamodb');
          expect(res.body.info).toHaveProperty('storage');
          expect(res.body.info).toHaveProperty('memory_heap');
        });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
