import { Component } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  email: string = '';
  password: string = '';

  constructor(private authService: FirebaseService, private router: Router) {}

  async login() {
    try {
      const userCredential = await this.authService.login(this.email, this.password);
      const uid = userCredential.user?.uid;

      if (uid) {
        const userData = await this.authService.getUserData(uid);

        if (userData?.tipoUsuario === 'conductor') {
          this.router.navigate(['/home-conductor']);
        } else {
          this.router.navigate(['/home']);
        }
      }
    } catch (error) {
      console.error('Error en el inicio de sesión:', error);
    }
  }
}
