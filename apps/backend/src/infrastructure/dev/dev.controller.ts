// Infrastructure endpoint (not a use case, not exposed over MCP): wipe + reseed demo data.
import { Controller, ForbiddenException, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { seedDatabase, truncateAll } from '../seed/seed';

@ApiTags('dev')
@Controller('dev')
export class DevController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Post('reset')
  @HttpCode(200)
  @ApiOperation({ summary: 'Wipe all data and reseed deterministic demo data (disabled when ENABLE_DEV_RESET=false)' })
  async reset() {
    if (process.env.ENABLE_DEV_RESET === 'false') {
      throw new ForbiddenException('Dev reset is disabled (ENABLE_DEV_RESET=false)');
    }
    await this.dataSource.transaction(async (manager) => {
      await truncateAll(manager);
      await seedDatabase(manager);
    });
    return { ok: true };
  }
}
