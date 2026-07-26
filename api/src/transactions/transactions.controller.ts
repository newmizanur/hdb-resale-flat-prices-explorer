import { Controller, Get, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

@Controller('resale-flats')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async findAll(@Query() query: QueryTransactionsDto) {
    return await this.transactionsService.findAll(query);
  }

  @Get('metadata')
  async getMetadata() {
    return await this.transactionsService.getMetadata();
  }

  @Get('insights/avg-price-by-town')
  async getAvgPriceByTown() {
    return await this.transactionsService.getAvgPriceByTown();
  }

  @Get('insights/price-trend')
  async getPriceTrend(@Query('town') town?: string, @Query('flatType') flatType?: string) {
    return await this.transactionsService.getPriceTrend(town, flatType);
  }

  @Get('insights/price-vs-lease')
  async getPriceVsLease() {
    return await this.transactionsService.getPriceVsLease();
  }
}
