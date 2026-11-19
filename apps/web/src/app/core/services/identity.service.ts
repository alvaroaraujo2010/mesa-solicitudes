import { Injectable, signal, computed } from '@angular/core';
import { SessionIdentity, UserRole } from '../models/request.model';

const STORAGE_KEY = 'mesa.session';

const PRESETS: SessionIdentity[] = [
  {
    tenantId: 'filial-cementos',
    userId: 'usr-filial-01',
    userRole: 'filial',
    displayName: 'Ana Pérez · Cementos',
  },
  {
    tenantId: 'filial-energia',
    userId: 'usr-filial-02',
    userRole: 'filial',
    displayName: 'Carlos Ruiz · Energía',
  },
  {
    tenantId: 'filial-cementos',
    userId: 'usr-analista-01',
    userRole: 'analista',
    displayName: 'Laura Gómez · Analista CSC',
  },
];

@Injectable({ providedIn: 'root' })
export class IdentityService {
  private readonly sessionSignal = signal<SessionIdentity>(this.readInitial());

  readonly session = this.sessionSignal.asReadonly();
  readonly tenantId = computed(() => this.sessionSignal().tenantId);
  readonly userRole = computed(() => this.sessionSignal().userRole);

  readonly presets = PRESETS;

  select(identity: SessionIdentity): void {
    this.sessionSignal.set(identity);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  }

  headers(): Record<string, string> {
    const current = this.sessionSignal();
    return {
      'X-Tenant-Id': current.tenantId,
      'X-User-Id': current.userId,
      'X-User-Role': current.userRole as UserRole,
    };
  }

  private readInitial(): SessionIdentity {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as SessionIdentity;
      }
    } catch {
      // ignore corrupt storage
    }
    return PRESETS[0];
  }
}
