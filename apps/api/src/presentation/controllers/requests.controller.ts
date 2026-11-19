import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateRequestDto } from '../../application/dto/create-request.dto';
import { ListRequestsQueryDto } from '../../application/dto/list-requests-query.dto';
import { TransitionRequestDto } from '../../application/dto/transition-request.dto';
import { CreateRequestUseCase } from '../../application/use-cases/create-request.use-case';
import { GetRequestUseCase } from '../../application/use-cases/get-request.use-case';
import { ListRequestsUseCase } from '../../application/use-cases/list-requests.use-case';
import { TransitionRequestUseCase } from '../../application/use-cases/transition-request.use-case';
import { GetTenantContext, TenantContext } from '../decorators/tenant-context.decorator';
import { TenantHeadersGuard } from '../guards/tenant-headers.guard';

@Controller('requests')
@UseGuards(TenantHeadersGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class RequestsController {
  constructor(
    private readonly createRequest: CreateRequestUseCase,
    private readonly listRequests: ListRequestsUseCase,
    private readonly getRequest: GetRequestUseCase,
    private readonly transitionRequest: TransitionRequestUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateRequestDto,
    @GetTenantContext() ctx: TenantContext,
  ) {
    const entity = await this.createRequest.execute({
      dto,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      userRole: ctx.userRole,
    });
    return entity.toPlain();
  }

  @Get()
  async list(
    @Query() query: ListRequestsQueryDto,
    @GetTenantContext() ctx: TenantContext,
  ) {
    const result = await this.listRequests.execute(query, ctx.tenantId);
    return {
      data: result.data.map((e) => e.toPlain()),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetTenantContext() ctx: TenantContext,
  ) {
    const entity = await this.getRequest.execute(id, ctx.tenantId);
    return entity.toPlain();
  }

  @Post(':id/transitions')
  @HttpCode(HttpStatus.OK)
  async transition(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: TransitionRequestDto,
    @GetTenantContext() ctx: TenantContext,
  ) {
    const entity = await this.transitionRequest.execute({
      id,
      tenantId: ctx.tenantId,
      action: dto.action,
      userRole: ctx.userRole,
    });
    return entity.toPlain();
  }
}
