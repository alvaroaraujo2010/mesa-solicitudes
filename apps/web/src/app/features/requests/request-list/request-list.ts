import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap, catchError, of, startWith, tap } from 'rxjs';
import { RequestsApiService } from '../../../core/services/requests-api.service';
import { IdentityService } from '../../../core/services/identity.service';
import {
  PaginatedRequests,
  RequestStatus,
  STATUS_LABELS,
  ServiceRequest,
} from '../../../core/models/request.model';

@Component({
  selector: 'app-request-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './request-list.html',
  styleUrl: './request-list.scss',
})
export class RequestListComponent implements OnInit {
  private readonly api = inject(RequestsApiService);
  readonly identity = inject(IdentityService);

  readonly statusLabels = STATUS_LABELS;
  readonly statuses: Array<RequestStatus | ''> = [
    '',
    'REGISTRADA',
    'EN_ATENCION',
    'RESUELTA',
    'CERRADA',
  ];

  statusFilter: RequestStatus | '' = '';
  searchTerm = '';
  page = 1;
  readonly pageSize = 20;

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly result = signal<PaginatedRequests | null>(null);

  readonly requests = computed(() => this.result()?.data ?? []);
  readonly total = computed(() => this.result()?.total ?? 0);
  readonly totalPages = computed(() => this.result()?.totalPages ?? 0);
  readonly isEmpty = computed(
    () => !this.loading() && !this.errorMessage() && this.requests().length === 0,
  );

  private readonly reload$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.page = 1;
        this.reload$.next();
      });

    this.reload$
      .pipe(
        startWith(void 0),
        tap(() => {
          this.loading.set(true);
          this.errorMessage.set(null);
        }),
        switchMap(() =>
          this.api
            .list({
              status: this.statusFilter,
              q: this.searchTerm,
              page: this.page,
              pageSize: this.pageSize,
            })
            .pipe(
              catchError((err) => {
                const message =
                  err?.error?.message ??
                  'No fue posible consultar las solicitudes. Intente de nuevo.';
                this.errorMessage.set(message);
                return of(null);
              }),
            ),
        ),
      )
      .subscribe((data) => {
        this.loading.set(false);
        this.result.set(data);
      });
  }

  selectedPresetIndex(): number {
    const current = this.identity.session();
    const index = this.identity.presets.findIndex(
      (preset) =>
        preset.tenantId === current.tenantId &&
        preset.userId === current.userId &&
        preset.userRole === current.userRole,
    );
    return index >= 0 ? index : 0;
  }

  onSessionChange(index: string | number): void {
    const preset = this.identity.presets[Number(index)];
    if (preset) {
      this.identity.select(preset);
      this.page = 1;
      this.reload$.next();
    }
  }

  onStatusChange(): void {
    this.page = 1;
    this.reload$.next();
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.search$.next(value);
  }

  goToPage(next: number): void {
    if (next < 1 || next > this.totalPages()) {
      return;
    }
    this.page = next;
    this.reload$.next();
  }

  trackById(_: number, item: ServiceRequest): string {
    return item.id;
  }

  statusClass(status: RequestStatus): string {
    return `status status--${status.toLowerCase()}`;
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}
