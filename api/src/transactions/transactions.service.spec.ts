import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResaleFlatTransaction } from './entities/resale-flat-transaction.entity';
import { TransactionsService } from './transactions.service';

function createQueryBuilderMock() {
  const qb: any = {};
  const chainable = ['select', 'addSelect', 'where', 'andWhere', 'orderBy', 'groupBy', 'skip', 'take'];
  chainable.forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb);
  });
  qb.getManyAndCount = jest.fn();
  qb.getRawMany = jest.fn();
  qb.getRawOne = jest.fn();
  return qb;
}

describe('TransactionsService', () => {
  let service: TransactionsService;
  let qb: ReturnType<typeof createQueryBuilderMock>;
  let repo: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    qb = createQueryBuilderMock();
    repo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };

    const module = await Test.createTestingModule({
      providers: [TransactionsService, { provide: getRepositoryToken(ResaleFlatTransaction), useValue: repo }],
    }).compile();

    service = module.get(TransactionsService);
  });

  describe('buildFilteredQuery', () => {
    it('applies town, flatType, and price range filters', () => {
      service.buildFilteredQuery({
        town: 'BEDOK',
        flatType: '4 ROOM',
        minPrice: 300000,
        maxPrice: 500000,
        page: 1,
        limit: 20,
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('txn.town = :town', { town: 'BEDOK' });
      expect(qb.andWhere).toHaveBeenCalledWith('txn.flat_type = :flatType', { flatType: '4 ROOM' });
      expect(qb.andWhere).toHaveBeenCalledWith('txn.resale_price >= :minPrice', { minPrice: 300000 });
      expect(qb.andWhere).toHaveBeenCalledWith('txn.resale_price <= :maxPrice', { maxPrice: 500000 });
    });

    it('applies the minLeaseMonths filter', () => {
      service.buildFilteredQuery({ minLeaseMonths: 300, page: 1, limit: 20 } as any);
      expect(qb.andWhere).toHaveBeenCalledWith('txn.remaining_lease_months >= :minLeaseMonths', {
        minLeaseMonths: 300,
      });
    });

    it('applies free-text search across street name, block, and town', () => {
      service.buildFilteredQuery({ search: 'Ang Mo', page: 1, limit: 20 } as any);
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(txn.street_name ILIKE :search OR txn.block ILIKE :search OR txn.town ILIKE :search)',
        { search: '%Ang Mo%' },
      );
    });

    it('defaults sort to month:desc when sort is omitted', () => {
      service.buildFilteredQuery({ page: 1, limit: 20 } as any);
      expect(qb.orderBy).toHaveBeenCalledWith('txn.month', 'DESC');
    });

    it('maps a valid sort param to its column and direction', () => {
      service.buildFilteredQuery({ sort: 'resalePrice:asc', page: 1, limit: 20 } as any);
      expect(qb.orderBy).toHaveBeenCalledWith('txn.resale_price', 'ASC');
    });
  });

  describe('findAll', () => {
    it('paginates using skip/take derived from page and limit', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ page: 3, limit: 10 } as any);
      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('returns data with pagination meta', async () => {
      const rows = [{ id: '1' }] as any;
      qb.getManyAndCount.mockResolvedValue([rows, 42]);
      const result = await service.findAll({ page: 2, limit: 10 } as any);
      expect(result).toEqual({ data: rows, meta: { page: 2, limit: 10, total: 42, totalPages: 5 } });
    });
  });

  describe('getPriceVsLease', () => {
    it('labels lease bands as 5-year ranges and coerces numeric strings', async () => {
      qb.getRawMany.mockResolvedValue([{ bandStart: '60', avgPrice: '450000', count: '10' }]);
      const result = await service.getPriceVsLease();
      expect(result).toEqual([{ leaseBand: '60-65', avgPrice: 450000, count: 10 }]);
    });
  });

  describe('getAvgPriceByTown', () => {
    it('coerces numeric strings from the raw query result', async () => {
      qb.getRawMany.mockResolvedValue([{ town: 'BEDOK', avgPrice: '412345.67', count: '8' }]);
      const result = await service.getAvgPriceByTown();
      expect(result).toEqual([{ town: 'BEDOK', avgPrice: 412345.67, count: 8 }]);
    });
  });

  describe('getMetadata', () => {
    it('maps the five parallel queries into towns/flatTypes/storeyRanges/priceRange/leaseMonthsRange', async () => {
      // Promise.all evaluates array elements left-to-right, and since repo.createQueryBuilder
      // returns the same shared qb mock for every call, the getRawMany/getRawOne resolutions
      // must be queued in the same order the service issues them: towns, flatTypes,
      // storeyRanges (all getRawMany), then priceRange, leaseRange (both getRawOne).
      qb.getRawMany
        .mockResolvedValueOnce([{ town: 'ANG MO KIO' }, { town: 'BEDOK' }])
        .mockResolvedValueOnce([{ flatType: '3 ROOM' }, { flatType: '4 ROOM' }])
        .mockResolvedValueOnce([{ storeyRange: '01 TO 03' }, { storeyRange: '04 TO 06' }]);
      qb.getRawOne
        .mockResolvedValueOnce({ min: '150000', max: '900000' })
        .mockResolvedValueOnce({ min: '12', max: '99' });

      const result = await service.getMetadata();

      expect(repo.createQueryBuilder).toHaveBeenCalledTimes(5);
      expect(result).toEqual({
        towns: ['ANG MO KIO', 'BEDOK'],
        flatTypes: ['3 ROOM', '4 ROOM'],
        storeyRanges: ['01 TO 03', '04 TO 06'],
        priceRange: { min: 150000, max: 900000 },
        leaseMonthsRange: { min: 12, max: 99 },
      });
    });
  });

  describe('getPriceTrend', () => {
    it('does not add any andWhere filters when no town or flatType is given', async () => {
      qb.getRawMany.mockResolvedValue([]);
      await service.getPriceTrend();
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('applies both town and flatType filters when provided', async () => {
      qb.getRawMany.mockResolvedValue([]);
      await service.getPriceTrend('BEDOK', '4 ROOM');
      expect(qb.andWhere).toHaveBeenCalledWith('txn.town = :town', { town: 'BEDOK' });
      expect(qb.andWhere).toHaveBeenCalledWith('txn.flat_type = :flatType', { flatType: '4 ROOM' });
    });

    it('coerces numeric strings from the raw query result', async () => {
      qb.getRawMany.mockResolvedValue([{ month: '2024-01', avgPrice: '512345.5', count: '15' }]);
      const result = await service.getPriceTrend();
      expect(result).toEqual([{ month: '2024-01', avgPrice: 512345.5, count: 15 }]);
    });
  });
});
