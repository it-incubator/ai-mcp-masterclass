// Thin presentation layer: validate the HTTP input (DTO) -> build a Command/Query -> execute it on the bus -> return.
// No business rules here; they live in src/domain and src/application.
import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetSummaryReportQuery } from '../../application/reports/queries/get-summary-report/get-summary-report.query';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('summary')
  @ApiOperation({ summary: 'Dashboard summary: customers, accounts, balances, pending queue, 30-day volume' })
  summary() {
    return this.queryBus.execute(new GetSummaryReportQuery());
  }
}
