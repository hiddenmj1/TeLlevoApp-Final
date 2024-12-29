import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { AuthGuard } from './auth.guard'; // <--- Importamos la clase AuthGuard
import { of } from 'rxjs';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let firebaseServiceSpy: jasmine.SpyObj<FirebaseService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const firebaseMock = jasmine.createSpyObj('FirebaseService', ['getAuthState']);
    const routerMock = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: FirebaseService, useValue: firebaseMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    guard = TestBed.inject(AuthGuard); // Inyectamos la instancia del AuthGuard
    firebaseServiceSpy = TestBed.inject(FirebaseService) as jasmine.SpyObj<FirebaseService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('debería permitir el acceso si el usuario está autenticado', (done: DoneFn) => {
    firebaseServiceSpy.getAuthState.and.returnValue(of({ uid: '123' })); // Usuario autenticado

    guard.canActivate().subscribe((canActivate) => {
      expect(canActivate).toBeTrue(); // Permitir acceso
      done();
    });
  });

  it('debería bloquear el acceso y redirigir al login si el usuario no está autenticado', (done: DoneFn) => {
    firebaseServiceSpy.getAuthState.and.returnValue(of(null)); // Usuario no autenticado

    guard.canActivate().subscribe((canActivate) => {
      expect(canActivate).toBeFalse(); // Bloquear acceso
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']); // Redirigir al login
      done();
    });
  });
});
