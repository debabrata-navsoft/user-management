import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResult, PaginationParams } from '../models/pagination.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/users`;

  getUsers(params: PaginationParams): Observable<PagedResult<User>> {
    let httpParams = new HttpParams()
      .set('_page', params.page.toString())
      .set('_limit', params.limit.toString());

    if (params.search && params.search.trim()) {
      httpParams = httpParams.set('q', params.search.trim());
    }

    const appendParam = (key: string, val: string | string[] | undefined) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach((item) => {
          if (item && item !== 'all') httpParams = httpParams.append(key, item);
        });
      } else if (val !== 'all') {
        httpParams = httpParams.set(key, val);
      }
    };

    appendParam('role', params.role);
    appendParam('status', params.status);
    appendParam('department', params.department);

    if (params.startDate) {
      httpParams = httpParams.set('createdAt_gte', params.startDate);
    }
    if (params.endDate) {
      httpParams = httpParams.set('createdAt_lte', params.endDate);
    }

    if (params.sort) {
      httpParams = httpParams.set('_sort', params.sort);
      httpParams = httpParams.set('_order', params.order || 'asc');
    } else {
      httpParams = httpParams.set('_sort', 'id');
      httpParams = httpParams.set('_order', 'desc');
    }

    return this.http
      .get<User[]>(this.baseUrl, {
        params: httpParams,
        observe: 'response',
      })
      .pipe(
        map((response) => {
          const totalHeader = response.headers.get('X-Total-Count');
          const data = response.body || [];
          const total = totalHeader ? parseInt(totalHeader, 10) : data.length;
          const totalPages = Math.ceil(total / params.limit) || 1;

          return {
            data,
            total,
            page: params.page,
            limit: params.limit,
            totalPages,
          };
        }),
      );
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}?_sort=createdAt&_order=desc`);
  }

  getUserById(id: string | number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }

  createUser(user: Partial<User>): Observable<User> {
    const payload: Partial<User> = {
      ...user,
      status: user.status || 'active',
      createdAt: user.createdAt || new Date().toISOString(),
    };
    return this.http.post<User>(this.baseUrl, payload);
  }

  updateUser(id: string | number, user: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/${id}`, user);
  }

  deleteUser(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
