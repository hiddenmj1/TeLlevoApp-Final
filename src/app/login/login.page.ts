import { Component } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import { Router } from '@angular/router';
import { AlertController, AnimationController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  email: string = '';
  password: string = '';

  constructor(private authService: FirebaseService, private router: Router,private alertController: AlertController
    ,private animationCtrl: AnimationController
  ) {}

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
    } catch (error: any) {
      console.error('Error en el inicio de sesión:', error);
      if (error.code === 'auth/invalid-credential') {
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
          header: 'Error',
          message: 'Credenciales inválidas',
          buttons: ['OK'],
          enterAnimation,
          leaveAnimation
        });
        await alert.present();
      }
    }
  }
} 
