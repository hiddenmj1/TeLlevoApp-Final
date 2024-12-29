import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private firebaseService: FirebaseService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.firebaseService.getAuthState().pipe(
      take(1),
      map(user => {
        if (user) {
          console.log('Usuario autenticado: acceso permitido');
          return true;
        } else {
          console.log('Usuario no autenticado: redirigiendo al login');
          this.router.navigate(['/login']);
          return false;
        }
      })
    );
  }
}
