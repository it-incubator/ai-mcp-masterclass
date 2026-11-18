// MCP presentation layer for the reports context: same Query as the REST controller, no business logic.
import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { GetSummaryReportQuery } from '../../application/reports/queries/get-summary-report/get-summary-report.query';
import { runUseCase } from './tool-result';

@Injectable()
export class ReportsTools {
  constructor(private readonly queryBus: QueryBus) {}

  @Tool({
    name: 'get_summary_report',
    description:
      'Dashboard summary: customersTotal, customersByKyc, accountsTotal, accountsByStatus, totalBalanceByCurrency (USD/EUR/GBP), '
      + 'pendingTransactions (four-eyes queue size) with pendingAmountByCurrency, and volumeLast30Days per currency '
      + '(sum of COMPLETED transaction amounts). Takes no input.',
    parameters: z.object({}),
    annotations: { readOnlyHint: true },
  })
  getSummaryReport() {
    return runUseCase(() => this.queryBus.execute(new GetSummaryReportQuery()));
  }
}
