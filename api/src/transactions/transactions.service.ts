import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResaleFlatTransaction } from './entities/resale-flat-transaction.entity';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

const SORT_COLUMN_MAP: Record<string, string> = {
  month: 'txn.month',
  town: 'txn.town',
  flatType: 'txn.flat_type',
  resalePrice: 'txn.resale_price',
  remainingLeaseMonths: 'txn.remaining_lease_months',
  floorAreaSqm: 'txn.floor_area_sqm',
};

export interface PaginatedResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(ResaleFlatTransaction)
    private readonly repo: Repository<ResaleFlatTransaction>,
  ) {}

  buildFilteredQuery(query: QueryTransactionsDto) {
    const qb = this.repo.createQueryBuilder('txn');

    if (query.town) qb.andWhere('txn.town = :town', { town: query.town });
    if (query.flatType) qb.andWhere('txn.flat_type = :flatType', { flatType: query.flatType });
    if (query.storeyRange) qb.andWhere('txn.storey_range = :storeyRange', { storeyRange: query.storeyRange });
    if (query.minPrice != null) qb.andWhere('txn.resale_price >= :minPrice', { minPrice: query.minPrice });
    if (query.maxPrice != null) qb.andWhere('txn.resale_price <= :maxPrice', { maxPrice: query.maxPrice });
    if (query.minLeaseMonths != null) {
      qb.andWhere('txn.remaining_lease_months >= :minLeaseMonths', { minLeaseMonths: query.minLeaseMonths });
    }
    if (query.search) {
      qb.andWhere('(txn.street_name ILIKE :search OR txn.block ILIKE :search OR txn.town ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [sortField, sortDir] = (query.sort ?? 'month:desc').split(':');
    const column = SORT_COLUMN_MAP[sortField] ?? SORT_COLUMN_MAP.month;
    qb.orderBy(column, sortDir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC');

    return qb;
  }

  async findAll(query: QueryTransactionsDto): Promise<PaginatedResult<ResaleFlatTransaction>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.buildFilteredQuery(query).skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getMetadata() {
    const [towns, flatTypes, storeyRanges, priceRange, leaseRange] = await Promise.all([
      this.repo.createQueryBuilder('txn').select('DISTINCT txn.town', 'town').orderBy('txn.town', 'ASC').getRawMany(),
      this.repo
        .createQueryBuilder('txn')
        .select('DISTINCT txn.flat_type', 'flatType')
        .orderBy('txn.flat_type', 'ASC')
        .getRawMany(),
      this.repo
        .createQueryBuilder('txn')
        .select('DISTINCT txn.storey_range', 'storeyRange')
        .orderBy('txn.storey_range', 'ASC')
        .getRawMany(),
      this.repo
        .createQueryBuilder('txn')
        .select('MIN(txn.resale_price)', 'min')
        .addSelect('MAX(txn.resale_price)', 'max')
        .getRawOne(),
      this.repo
        .createQueryBuilder('txn')
        .select('MIN(txn.remaining_lease_months)', 'min')
        .addSelect('MAX(txn.remaining_lease_months)', 'max')
        .getRawOne(),
    ]);

    return {
      towns: towns.map((r: any) => r.town),
      flatTypes: flatTypes.map((r: any) => r.flatType),
      storeyRanges: storeyRanges.map((r: any) => r.storeyRange),
      priceRange: { min: Number(priceRange.min), max: Number(priceRange.max) },
      leaseMonthsRange: { min: Number(leaseRange.min), max: Number(leaseRange.max) },
    };
  }

  async getAvgPriceByTown() {
    const rows = await this.repo
      .createQueryBuilder('txn')
      .select('txn.town', 'town')
      .addSelect('AVG(txn.resale_price)', 'avgPrice')
      .addSelect('COUNT(*)', 'count')
      .groupBy('txn.town')
      .orderBy('txn.town', 'ASC')
      .getRawMany();

    return rows.map((r: any) => ({ town: r.town, avgPrice: Number(r.avgPrice), count: Number(r.count) }));
  }

  async getPriceTrend(town?: string, flatType?: string) {
    const qb = this.repo
      .createQueryBuilder('txn')
      .select("to_char(txn.month, 'YYYY-MM')", 'month')
      .addSelect('AVG(txn.resale_price)', 'avgPrice')
      .addSelect('COUNT(*)', 'count')
      .groupBy("to_char(txn.month, 'YYYY-MM')")
      .orderBy("to_char(txn.month, 'YYYY-MM')", 'ASC');

    if (town) qb.andWhere('txn.town = :town', { town });
    if (flatType) qb.andWhere('txn.flat_type = :flatType', { flatType });

    const rows = await qb.getRawMany();
    return rows.map((r: any) => ({ month: r.month, avgPrice: Number(r.avgPrice), count: Number(r.count) }));
  }

  async getPriceVsLease() {
    const rows = await this.repo
      .createQueryBuilder('txn')
      .select('FLOOR(txn.remaining_lease_months / 60) * 5', 'bandStart')
      .addSelect('AVG(txn.resale_price)', 'avgPrice')
      .addSelect('COUNT(*)', 'count')
      .groupBy('FLOOR(txn.remaining_lease_months / 60)')
      .orderBy('"bandStart"', 'ASC')
      .getRawMany();

    return rows.map((r: any) => ({
      leaseBand: `${r.bandStart}-${Number(r.bandStart) + 5}`,
      avgPrice: Number(r.avgPrice),
      count: Number(r.count),
    }));
  }
}
