import { RequestStatus } from '../enums/request-status.enum';

export class RequestEntity {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public title: string,
    public description: string,
    public status: RequestStatus,
    public readonly createdBy: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static create(params: {
    id: string;
    tenantId: string;
    title: string;
    description: string;
    createdBy: string;
  }): RequestEntity {
    const now = new Date();
    return new RequestEntity(
      params.id,
      params.tenantId,
      params.title,
      params.description,
      RequestStatus.REGISTRADA,
      params.createdBy,
      now,
      now,
    );
  }

  static fromPersistence(data: {
    id: string;
    tenantId: string;
    title: string;
    description: string;
    status: RequestStatus;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }): RequestEntity {
    return new RequestEntity(
      data.id,
      data.tenantId,
      data.title,
      data.description,
      data.status,
      data.createdBy,
      data.createdAt,
      data.updatedAt,
    );
  }

  applyTransition(newStatus: RequestStatus): void {
    this.status = newStatus;
    this.updatedAt = new Date();
  }

  toPlain(): Record<string, unknown> {
    return {
      id: this.id,
      tenantId: this.tenantId,
      title: this.title,
      description: this.description,
      status: this.status,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
