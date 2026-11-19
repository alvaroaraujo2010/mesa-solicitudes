import { DomainError } from './domain.error';

export class ForbiddenOperationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
