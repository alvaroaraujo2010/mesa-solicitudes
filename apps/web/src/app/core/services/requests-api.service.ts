import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PaginatedRequests,
  RequestStatus,
  ServiceRequest,
  TransitionAction,
} from '../models/request.model';
import { IdentityService } from './identity.service';

export interface ListRequestsParams {
  status?: RequestStatus | '';
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateRequestPayload {
  title: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class RequestsApiService {
  private readonly http = inject(HttpClient);
  private readonly identity = inject(IdentityService);
  private readonly baseUrl = `${environment.apiUrl}/requests`;

  list(params: ListRequestsParams): Observable<PaginatedRequests> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('pageSize', String(params.pageSize ?? 20));

    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.q?.trim()) {
      httpParams = httpParams.set('q', params.q.trim());
    }

    return this.http.get<PaginatedRequests>(this.baseUrl, {
      headers: this.buildHeaders(),
      params: httpParams,
    });
  }

  getById(id: string): Observable<ServiceRequest> {
    return this.http.get<ServiceRequest>(`${this.baseUrl}/${id}`, {
      headers: this.buildHeaders(),
    });
  }

  create(payload: CreateRequestPayload): Observable<ServiceRequest> {
    return this.http.post<ServiceRequest>(this.baseUrl, payload, {
      headers: this.buildHeaders(),
    });
  }

  transition(id: string, action: TransitionAction): Observable<ServiceRequest> {
    return this.http.post<ServiceRequest>(
      `${this.baseUrl}/${id}/transitions`,
      { action },
      { headers: this.buildHeaders() },
    );
  }

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders(this.identity.headers());
  }
}
