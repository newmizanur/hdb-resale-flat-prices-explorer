import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { ResaleFlatTransaction } from '../src/transactions/entities/resale-flat-transaction.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { seedTransactions } from './fixtures/seed-transactions';

function assertTestDatabase(dataSource: DataSource) {
  const dbName = String((dataSource.options as any).database ?? '');
  if (!/test/i.test(dbName)) {
    throw new Error(
      `Refusing to run e2e tests against database "${dbName}" — it doesn't look like a test database (expected the name to contain "test"). Set DB_NAME to a dedicated test database before running npm run test:e2e.`,
    );
  }
}

describe('Transactions (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    dataSource = moduleRef.get(DataSource);
    assertTestDatabase(dataSource);
    const repo = dataSource.getRepository(ResaleFlatTransaction);
    await repo.clear();
    await repo.save(seedTransactions as ResaleFlatTransaction[]);
  });

  afterAll(async () => {
    await dataSource.getRepository(ResaleFlatTransaction).clear();
    await app.close();
  });

  describe('GET /api/resale-flats', () => {
    it('returns paginated data with meta', async () => {
      const res = await request(app.getHttpServer()).get('/api/resale-flats').expect(200);
      expect(res.body.meta.total).toBe(seedTransactions.length);
      expect(res.body.data.length).toBeLessThanOrEqual(res.body.meta.limit);
    });

    it('serializes resalePrice and floorAreaSqm as JSON numbers, not strings', async () => {
      const res = await request(app.getHttpServer()).get('/api/resale-flats?limit=1').expect(200);
      expect(typeof res.body.data[0].resalePrice).toBe('number');
      expect(typeof res.body.data[0].floorAreaSqm).toBe('number');
    });

    it('filters by town', async () => {
      const res = await request(app.getHttpServer()).get('/api/resale-flats?town=BEDOK').expect(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((r: any) => r.town === 'BEDOK')).toBe(true);
    });

    it('filters by price range', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/resale-flats?minPrice=400000&maxPrice=500000')
        .expect(200);
      expect(res.body.data.every((r: any) => r.resalePrice >= 400000 && r.resalePrice <= 500000)).toBe(true);
    });

    it('sorts by resalePrice descending', async () => {
      const res = await request(app.getHttpServer()).get('/api/resale-flats?sort=resalePrice:desc&limit=20').expect(200);
      const prices = res.body.data.map((r: any) => Number(r.resalePrice));
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
    });

    it('rejects an invalid sort param with 400 and a consistent, descriptive error shape', async () => {
      const res = await request(app.getHttpServer()).get('/api/resale-flats?sort=badfield:asc').expect(400);
      expect(res.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        path: '/api/resale-flats?sort=badfield:asc',
      });
      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringContaining('sort must be one of')]));
      expect(typeof res.body.timestamp).toBe('string');
    });

    it('rejects page=0 with a 400 and a clear message', async () => {
      const res = await request(app.getHttpServer()).get('/api/resale-flats?page=0').expect(400);
      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringContaining('page must be at least 1')]));
    });

    it('rejects limit=101 with a 400 and a clear message', async () => {
      const res = await request(app.getHttpServer()).get('/api/resale-flats?limit=101').expect(400);
      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringContaining('limit must not exceed 100')]));
    });

    it('rejects a negative minPrice with a 400 and a clear message', async () => {
      const res = await request(app.getHttpServer()).get('/api/resale-flats?minPrice=-5').expect(400);
      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringContaining('minPrice must not be negative')]));
    });
  });

  describe('GET /api/resale-flats/metadata', () => {
    it('returns distinct filter values', async () => {
      const res = await request(app.getHttpServer()).get('/api/resale-flats/metadata').expect(200);
      expect(res.body.towns).toEqual(expect.arrayContaining(['BEDOK', 'TAMPINES']));
      expect(Array.isArray(res.body.flatTypes)).toBe(true);
      expect(Array.isArray(res.body.storeyRanges)).toBe(true);
      expect(res.body.priceRange.max).toBeGreaterThan(res.body.priceRange.min);
    });
  });

  describe('GET /api/resale-flats/insights/avg-price-by-town', () => {
    it('returns average price grouped by town', async () => {
      const res = await request(app.getHttpServer()).get('/api/resale-flats/insights/avg-price-by-town').expect(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('avgPrice');
    });
  });

  describe('GET /api/resale-flats/insights/price-trend', () => {
    it('returns price trend over time, filterable by town', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/resale-flats/insights/price-trend?town=BEDOK')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/resale-flats/insights/price-vs-lease', () => {
    it('returns price bucketed by 5-year lease bands', async () => {
      const res = await request(app.getHttpServer()).get('/api/resale-flats/insights/price-vs-lease').expect(200);
      expect(res.body[0]).toHaveProperty('leaseBand');
    });
  });
});
