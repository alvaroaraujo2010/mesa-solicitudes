import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PersistenceModule } from './infrastructure/persistence/persistence.module';
import { CreateRequestUseCase } from './application/use-cases/create-request.use-case';
import { GetRequestUseCase } from './application/use-cases/get-request.use-case';
import { ListRequestsUseCase } from './application/use-cases/list-requests.use-case';
import { TransitionRequestUseCase } from './application/use-cases/transition-request.use-case';
import { SeedUseCase } from './application/use-cases/seed.use-case';
import { RequestsController } from './presentation/controllers/requests.controller';
import { HealthController } from './presentation/controllers/health.controller';
import { SeedController } from './presentation/controllers/seed.controller';
import { DomainExceptionFilter } from './presentation/filters/domain-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: false }),
    PersistenceModule.forRoot(),
  ],
  controllers: [RequestsController, HealthController, SeedController],
  providers: [
    CreateRequestUseCase,
    GetRequestUseCase,
    ListRequestsUseCase,
    TransitionRequestUseCase,
    SeedUseCase,
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
  ],
})
export class AppModule {}
