import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  Subject,
  switchMap,
  catchError,
  of,
  startWith,
  tap,
} from 'rxjs';
import { RequestsApiService } from '../../../core/services/requests-api.service';
import { IdentityService } from '../../../core/services/identity.service';
import Swal from 'sweetalert2';
import {
  ACTION_LABELS,
  PaginatedRequests,
  RequestStatus,
  STATUS_LABELS,
  ServiceRequest,
  TransitionAction,
  availableActions,
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
  readonly actionLabels = ACTION_LABELS;
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

  newTitle = '';
  newDescription = '';

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly result = signal<PaginatedRequests | null>(null);

  readonly requests = computed(() => this.result()?.data ?? []);
  readonly total = computed(() => this.result()?.total ?? 0);
  readonly totalPages = computed(() => this.result()?.totalPages ?? 0);
  readonly isEmpty = computed(
    () => !this.loading() && !this.errorMessage() && this.requests().length === 0,
  );
  readonly isFilial = computed(() => this.identity.session().userRole === 'filial');
  readonly isAnalista = computed(() => this.identity.session().userRole === 'analista');

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
      this.clearFeedback();
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
    if (next < 1 || (this.totalPages() > 0 && next > this.totalPages())) {
      return;
    }
    this.page = next;
    this.reload$.next();
  }

  retry(): void {
    this.reload$.next();
  }

  actionsFor(item: ServiceRequest): TransitionAction[] {
    return availableActions(item.status, this.identity.session().userRole);
  }

  createRequest(): void {
    const title = this.newTitle.trim();
    const description = this.newDescription.trim();
    if (!title || !description) {
      void Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Título y descripción son obligatorios.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#0f6b5c',
      });
      return;
    }
    if (!this.isFilial()) {
      void Swal.fire({
        icon: 'error',
        title: 'Acción no permitida',
        text: 'Solo una filial puede registrar solicitudes.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#0f6b5c',
      });
      return;
    }

    this.acting.set(true);
    this.clearFeedback();
    this.api.create({ title, description }).subscribe({
      next: (created) => {
        this.acting.set(false);
        this.newTitle = '';
        this.newDescription = '';
        this.page = 1;
        this.reload$.next();
        void Swal.fire({
          icon: 'success',
          title: 'Solicitud registrada',
          text: `Se creó con ID ${created.id.slice(0, 8)}… en estado Registrada.`,
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#0f6b5c',
        });
      },
      error: (err) => {
        this.acting.set(false);
        const message =
          err?.error?.message ?? 'No fue posible registrar la solicitud.';
        void Swal.fire({
          icon: 'error',
          title: 'No se pudo registrar',
          text: message,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#0f6b5c',
        });
      },
    });
  }

  runTransition(item: ServiceRequest, action: TransitionAction): void {
    this.acting.set(true);
    this.clearFeedback();
    this.api.transition(item.id, action).subscribe({
      next: (updated) => {
        this.acting.set(false);
        this.reload$.next();
        void Swal.fire({
          icon: 'success',
          title: 'Estado actualizado',
          text: `Acción «${ACTION_LABELS[action]}»: la solicitud quedó en «${STATUS_LABELS[updated.status]}».`,
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#0f6b5c',
        });
      },
      error: (err) => {
        this.acting.set(false);
        const message =
          err?.error?.message ?? 'No fue posible ejecutar la transición.';
        void Swal.fire({
          icon: 'error',
          title: 'No se pudo cambiar el estado',
          text: message,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#0f6b5c',
        });
      },
    });
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

  private clearFeedback(): void {
    this.successMessage.set(null);
    this.actionError.set(null);
  }
}
