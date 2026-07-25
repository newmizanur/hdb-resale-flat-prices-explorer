import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResaleFlatTransaction } from '../transactions/entities/resale-flat-transaction.entity';
import { IngestionService } from './ingestion.service';

@Module({
  imports: [TypeOrmModule.forFeature([ResaleFlatTransaction])],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
