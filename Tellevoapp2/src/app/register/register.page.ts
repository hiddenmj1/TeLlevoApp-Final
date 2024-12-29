import { Component } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage {
  name: string = '';
  rut: string = '';
  email: string = '';
  password: string = '';
  tipoUsuario: string = ''; // Captura del tipo de usuario

  constructor(private firebaseService: FirebaseService, private router: Router) {}

  async register() {
    try {
      const additionalData = { name: this.name, rut: this.rut };
      await this.firebaseService.register(this.email, this.password, this.tipoUsuario, additionalData);
      this.router.navigate(['/login']); // Redirige tras el registro
    } catch (error) {
      console.error('Error en el registro:', error);
    }
  }
}
