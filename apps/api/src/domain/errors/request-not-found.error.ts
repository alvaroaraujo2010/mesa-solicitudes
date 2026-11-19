import { DomainError } from './domain.error';

export class RequestNotFoundError extends DomainError {
  constructor() {
    super('Solicitud no encontrada.');
  }
}
