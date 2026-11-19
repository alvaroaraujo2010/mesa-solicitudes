import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestStatus } from '../../domain/enums/request-status.enum';

export class ListRequestsQueryDto {
  @IsOptional()
  @IsEnum(RequestStatus, {
    message: `El estado debe ser uno de: ${Object.values(RequestStatus).join(', ')}.`,
  })
  status?: RequestStatus;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'El tamaño de página no puede superar 100.' })
  pageSize?: number;
}
