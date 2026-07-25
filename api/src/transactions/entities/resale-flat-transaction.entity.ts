import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, ValueTransformer } from 'typeorm';

const numericTransformer: ValueTransformer = {
  to: (value?: number) => value,
  from: (value?: string) => (value === null || value === undefined ? value : Number(value)),
};

@Entity('resale_flat_transactions')
@Unique('uq_resale_flat_transaction_natural_key', [
  'month',
  'town',
  'block',
  'streetName',
  'storeyRange',
  'floorAreaSqm',
  'resalePrice',
])
@Index('idx_town', ['town'])
@Index('idx_flat_type', ['flatType'])
@Index('idx_month', ['month'])
@Index('idx_resale_price', ['resalePrice'])
@Index('idx_remaining_lease_months', ['remainingLeaseMonths'])
@Index('idx_town_flat_type_resale_price', ['town', 'flatType', 'resalePrice'])
export class ResaleFlatTransaction {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'date' })
  month: string;

  @Column({ type: 'varchar', length: 50 })
  town: string;

  @Column({ name: 'flat_type', type: 'varchar', length: 20 })
  flatType: string;

  @Column({ type: 'varchar', length: 10 })
  block: string;

  @Column({ name: 'street_name', type: 'varchar', length: 100 })
  streetName: string;

  @Column({ name: 'storey_range', type: 'varchar', length: 20 })
  storeyRange: string;

  @Column({ name: 'floor_area_sqm', type: 'numeric', precision: 6, scale: 2, transformer: numericTransformer })
  floorAreaSqm: number;

  @Column({ name: 'flat_model', type: 'varchar', length: 50 })
  flatModel: string;

  @Column({ name: 'lease_commence_date', type: 'smallint' })
  leaseCommenceDate: number;

  @Column({ name: 'remaining_lease_raw', type: 'varchar', length: 30 })
  remainingLeaseRaw: string;

  @Column({ name: 'remaining_lease_months', type: 'integer' })
  remainingLeaseMonths: number;

  @Column({ name: 'resale_price', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  resalePrice: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
