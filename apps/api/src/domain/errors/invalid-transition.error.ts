import { DomainError } from './domain.error';

export class InvalidTransitionError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
