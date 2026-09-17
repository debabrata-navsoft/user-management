import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch paginated users with X-Total-Count', () => {
    const mockUsers = [
      { id: 1, name: 'User 1', email: 'u1@demo.com', role: 'employee', status: 'active' },
      { id: 2, name: 'User 2', email: 'u2@demo.com', role: 'employee', status: 'active' },
    ];

    service.getUsers({ page: 1, limit: 10 }).subscribe((result) => {
      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/users`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('_page')).toBe('1');
    expect(req.request.params.get('_limit')).toBe('10');
    req.flush(mockUsers, { headers: { 'X-Total-Count': '2' } });
  });

  it('should create new user via POST', () => {
    const newUser = {
      name: 'Test User',
      email: 'test@example.com',
      role: 'employee' as const,
      status: 'active' as const,
    };

    service.createUser(newUser).subscribe((created) => {
      expect(created.name).toBe('Test User');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/users`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...newUser, id: 10 });
  });
});
