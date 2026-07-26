import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResaleFlatTransaction } from '../transactions/entities/resale-flat-transaction.entity';
import { IngestionService } from './ingestion.service';
import { DatastoreResponse } from './datastore.types';

function createQueryBuilderMock(insertedCount: number) {
  const qb: any = {};
  qb.insert = jest.fn().mockReturnValue(qb);
  qb.into = jest.fn().mockReturnValue(qb);
  qb.values = jest.fn().mockReturnValue(qb);
  qb.orIgnore = jest.fn().mockReturnValue(qb);
  qb.execute = jest.fn().mockResolvedValue({ identifiers: new Array(insertedCount).fill({}) });
  return qb;
}

describe('IngestionService', () => {
  let service: IngestionService;
  let repo: { count: jest.Mock; createQueryBuilder: jest.Mock };
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    repo = { count: jest.fn(), createQueryBuilder: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        IngestionService,
        { provide: getRepositoryToken(ResaleFlatTransaction), useValue: repo },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    }).compile();

    service = module.get(IngestionService);
    fetchSpy = jest.spyOn(global, 'fetch' as any);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('skips fetching entirely when rows already exist', async () => {
    repo.count.mockResolvedValue(5);

    const result = await service.run();

    expect(result).toEqual({ fetched: 0, inserted: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(repo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('fetches and inserts when the table is empty', async () => {
    repo.count.mockResolvedValue(0);
    const qb = createQueryBuilderMock(1);
    repo.createQueryBuilder.mockReturnValue(qb);

    const page: DatastoreResponse = {
      success: true,
      result: {
        total: 1,
        records: [
          {
            month: '2024-01',
            town: 'ANG MO KIO',
            flat_type: '3 ROOM',
            block: '123',
            street_name: 'ANG MO KIO AVE 1',
            storey_range: '01 TO 03',
            floor_area_sqm: '67',
            flat_model: 'Improved',
            lease_commence_date: '1980',
            remaining_lease: '55 years',
            resale_price: '300000',
          },
        ],
      },
    };
    fetchSpy.mockResolvedValue({ ok: true, status: 200, json: async () => page } as any);

    const result = await service.run();

    expect(result).toEqual({ fetched: 1, inserted: 1 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
