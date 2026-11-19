import { Controller, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SeedUseCase } from '../../application/use-cases/seed.use-case';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedUseCase: SeedUseCase) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async seed(
    @Query('tenantId') tenantId?: string,
    @Query('count') countStr?: string,
  ) {
    const resolvedTenantId = tenantId ?? randomUUID();
    const count = Math.min(parseInt(countStr ?? '50000', 10), 100_000);

    const start = Date.now();
    const result = await this.seedUseCase.execute(resolvedTenantId, count);
    const durationMs = Date.now() - start;

    return { ...result, durationMs };
  }
}
