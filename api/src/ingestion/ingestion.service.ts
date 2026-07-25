import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResaleFlatTransaction } from '../transactions/entities/resale-flat-transaction.entity';
import { parseMonthToDate, parseRemainingLeaseToMonths } from '../common/utils/lease-parser.util';
import { sleep } from '../common/utils/sleep.util';
import { DatastoreRecord, DatastoreResponse } from './datastore.types';

const PAGE_SIZE = 1000;
const MAX_RETRY_ATTEMPTS = 5;
const INTER_PAGE_DELAY_MS = 300;

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly datastoreUrl: string;
  private readonly resourceId: string;

  constructor(
    @InjectRepository(ResaleFlatTransaction)
    private readonly repo: Repository<ResaleFlatTransaction>,
    private readonly config: ConfigService,
  ) {
    this.datastoreUrl = this.config.get<string>('DATASTORE_URL') || 'https://data.gov.sg/api/action/datastore_search';
    this.resourceId = this.config.get<string>('DATASTORE_RESOURCE_ID') || 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';
  }

  private mapRecord(record: DatastoreRecord): Partial<ResaleFlatTransaction> {
    return {
      month: parseMonthToDate(record.month),
      town: record.town,
      flatType: record.flat_type,
      block: record.block,
      streetName: record.street_name,
      storeyRange: record.storey_range,
      floorAreaSqm: parseFloat(record.floor_area_sqm),
      flatModel: record.flat_model,
      leaseCommenceDate: parseInt(record.lease_commence_date, 10),
      remainingLeaseRaw: record.remaining_lease,
      remainingLeaseMonths: parseRemainingLeaseToMonths(record.remaining_lease),
      resalePrice: parseFloat(record.resale_price),
    };
  }

  private async fetchPage(offset: number, attempt = 1): Promise<DatastoreResponse> {
    const url = `${this.datastoreUrl}?resource_id=${this.resourceId}&limit=${PAGE_SIZE}&offset=${offset}`;
    const response = await fetch(url);

    if (response.status === 429 && attempt <= MAX_RETRY_ATTEMPTS) {
      const retryAfterSeconds = Number(response.headers.get('retry-after'));
      const delayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : attempt * 2000;
      this.logger.warn(`Rate limited at offset ${offset}, retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`);
      await sleep(delayMs);
      return this.fetchPage(offset, attempt + 1);
    }

    if (!response.ok) {
      throw new Error(`datastore_search failed with status ${response.status}`);
    }
    return response.json() as Promise<DatastoreResponse>;
  }

  async run(): Promise<{ fetched: number; inserted: number }> {
    let offset = 0;
    let total = Infinity;
    let fetched = 0;
    let inserted = 0;

    while (offset < total) {
      const page = await this.fetchPage(offset);
      total = page.result.total;
      const records = page.result.records;
      if (records.length === 0) break;

      fetched += records.length;
      const mapped = records.map((r) => this.mapRecord(r));
      // orIgnore() -> ON CONFLICT DO NOTHING; identifiers.length is a best-effort
      // count since TypeORM returns an entry per input row regardless of conflict.
      const result = await this.repo
        .createQueryBuilder()
        .insert()
        .into(ResaleFlatTransaction)
        .values(mapped as ResaleFlatTransaction[])
        .orIgnore()
        .execute();
      inserted += result.identifiers.length;

      this.logger.log(`Fetched ${fetched}/${total} records (offset ${offset})`);
      offset += PAGE_SIZE;
      if (offset < total) await sleep(INTER_PAGE_DELAY_MS);
    }

    return { fetched, inserted };
  }
}
