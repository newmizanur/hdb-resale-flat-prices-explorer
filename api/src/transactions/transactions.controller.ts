import { Controller, Get, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

@Controller('resale-flats')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  findAll(@Query() query: QueryTransactionsDto) {
    return this.transactionsService.findAll(query);
  }

  @Get('metadata')
  getMetadata() {
    return this.transactionsService.getMetadata();
  }

  @Get('insights/avg-price-by-town')
  getAvgPriceByTown() {
    return this.transactionsService.getAvgPriceByTown();
  }

  @Get('insights/price-trend')
  getPriceTrend(@Query('town') town?: string, @Query('flatType') flatType?: string) {
    return this.transactionsService.getPriceTrend(town, flatType);
  }

  @Get('insights/price-vs-lease')
  getPriceVsLease() {
    return this.transactionsService.getPriceVsLease();
  }
}
