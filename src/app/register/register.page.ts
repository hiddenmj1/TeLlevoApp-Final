import { Component } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import { Router } from '@angular/router';
import { AlertController, AnimationController } from '@ionic/angular';

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

  constructor(private firebaseService: FirebaseService, private router: Router,
     private alertController: AlertController,
    private animationCtrl: AnimationController) {}

    async register() {
      try {
        const additionalData = { name: this.name, rut: this.rut };
        await this.firebaseService.register(this.email, this.password, this.tipoUsuario, additionalData);
        this.showAlert('Registro exitoso', 'Te has registrado correctamente.', true);
        this.router.navigate(['/login']); // Redirige tras el registro
      } catch (error) {
        console.error('Error en el registro:', error);
        this.showAlert('Error en el registro', 'Hubo un problema al registrarte. Inténtalo de nuevo.', false);
      }
    }
  
    async showAlert(header: string, message: string, isSuccess: boolean) {
      const enterAnimation = (baseEl: any) => {
        const backdropAnimation = this.animationCtrl.create()
          .addElement(baseEl.querySelector('ion-backdrop')!)
          .fromTo('opacity', '0.01', 'var(--backdrop-opacity)');
  
        const wrapperAnimation = this.animationCtrl.create()
          .addElement(baseEl.querySelector('.alert-wrapper')!)
          .keyframes([
            { offset: 0, opacity: '0', transform: 'scale(0.9)' },
            { offset: 1, opacity: '0.99', transform: 'scale(1)' }
          ]);
  
        return this.animationCtrl.create()
          .addElement(baseEl)
          .easing('ease-out')
          .duration(500)
          .addAnimation([backdropAnimation, wrapperAnimation]);
      };
  
      const leaveAnimation = (baseEl: any) => {
        return enterAnimation(baseEl).direction('reverse');
      };
  
      const alert = await this.alertController.create({
        header,
        message,
        buttons: ['OK'],
        enterAnimation,
        leaveAnimation
      });
      await alert.present();
    }
}
