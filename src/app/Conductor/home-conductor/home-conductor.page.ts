import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { FirebaseService } from '../../services/firebase.service';
import { AlertController, AnimationController, LoadingController, PopoverController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';  // Importa AngularFireAuth para acceder a la autenticación
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { TravelHistoryPopoverComponent } from '../travel-history-popover/travel-history-popover.component';


declare var google: any; // Declaramos google para que sea accesible

@Component({
  selector: 'app-home-conductor',
  templateUrl: 'home-conductor.page.html',
  styleUrls: ['home-conductor.page.scss'],
})
export class HomeConductorPage implements OnInit, AfterViewInit {
  @ViewChild('mapElement', { static: false }) mapElement!: ElementRef;
  map: any;
  conductorMarker: any;
  destinoMarker: any; // Marcador del destino
  directionsService: any; // Servicio de rutas de Google
  directionsRenderer: any; // Renderizador de rutas en el mapa
  currentLocationLatLng: any; // Guardar la ubicación actual del conductor
  nombreConductor: string = 'Usuario'; // Asignar el nombre del conductor

  viaje = {
    nombre: '',
    inicio: '',  // Geolocalización del conductor
    destino: '',
    precio: '',
    espacio: '',
    horaSalida: '' // Nuevo campo para la hora de salida
  };

  viajes: any[] = []; // Lista de viajes realizados
  nombreUsuario: string | undefined;
  

  constructor(
    private cd: ChangeDetectorRef, // Inyecta el servicio
    private afAuth: AngularFireAuth,
    private firebaseService: FirebaseService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private routerobj: Router,
    private animationCtrl: AnimationController,
    private popoverController: PopoverController
  ) {}

  ngAfterViewInit(): void {}

  ngOnInit() {
    this.loadMap();
    this.obtenerMisViajes();
    
    this.afAuth.authState.subscribe(async (user) => {
      if (user) {
        console.log('Usuario autenticado:', user);
  
        // Si ya tiene un displayName, lo usamos directamente
        if (user.displayName) {
          console.log('Nombre del Usuario:', user.displayName);
          this.nombreUsuario = user.displayName; // Asigna el displayName del usuario
          this.nombreConductor = this.nombreUsuario; // Asigna el mismo nombre a nombreConductor
          this.cd.detectChanges(); // Forzar la detección de cambios si es necesario
        } else {
          // Si no tiene displayName, lo asignamos
          try {
            const nombreDefault = 'Usuario Nuevo'; // Cambia esto según lo necesario
            await user.updateProfile({
              displayName: nombreDefault,
            });
  
            const updatedUser = await this.afAuth.currentUser;
            if (updatedUser) {
              this.nombreUsuario = updatedUser.displayName || nombreDefault;
              this.nombreConductor = this.nombreUsuario; // Asigna el nombre a nombreConductor
              this.cd.detectChanges(); // Forzar la detección de cambios si es necesario
              console.log('Nombre asignado automáticamente:', this.nombreUsuario);
            }
          } catch (error) {
            console.error('Error al actualizar el displayName:', error);
            this.nombreUsuario = 'Usuario';
            this.nombreConductor = 'Usuario'; // Asignar valor por defecto a nombreConductor
            this.cd.detectChanges(); // Forzar la detección de cambios
          }
        }
      } else {
        console.log('No hay un usuario autenticado, redirigiendo a login.');
        this.routerobj.navigate(['/login']);
        
      }
    });
  }


  async finalizarViaje(viaje: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar',
      message: '¿Estás seguro de que deseas finalizar este viaje?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Finalizar',
          handler: async () => {
            try {
              await this.firebaseService.finalizarViaje(viaje.id);
              const successAlert = await this.alertController.create({
                header: 'Éxito',
                message: 'El viaje ha sido finalizado.',
                buttons: ['OK'],
              });
              await successAlert.present();
              this.viajes = this.viajes.filter(v => v.id !== viaje.id);
            } catch (error) {
              const errorAlert = await this.alertController.create({
                header: 'Error',
                message: 'Hubo un problema al finalizar el viaje. Inténtalo de nuevo.',
                buttons: ['OK'],
              });
              await errorAlert.present();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async presentPopover(ev: any) {
    const popover = await this.popoverController.create({
      component: TravelHistoryPopoverComponent,
      event: ev,
      translucent: true
    });
    await popover.present();
  }
  
  logout() {
    this.firebaseService.logout();
  }

  // Cargamos el mapa y obtenemos la ubicación actual del conductor
  async loadMap() {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      });

      // Guardamos la ubicación actual como el inicio del viaje
      this.currentLocationLatLng = new google.maps.LatLng(
        position.coords.latitude,
        position.coords.longitude
      );

      this.viaje.inicio = `${position.coords.latitude}, ${position.coords.longitude}`;

      // Creamos el mapa centrado en la ubicación actual
      this.map = new google.maps.Map(this.mapElement.nativeElement, {
        center: this.currentLocationLatLng,
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
      });

      // Colocamos un marcador para la ubicación actual
      this.conductorMarker = new google.maps.Marker({
        position: this.currentLocationLatLng,
        map: this.map,
        title: 'Tu ubicación actual (Inicio del viaje)',
      });

      // Inicializamos el servicio de direcciones y el renderizador
      this.directionsService = new google.maps.DirectionsService();
      this.directionsRenderer = new google.maps.DirectionsRenderer();
      this.directionsRenderer.setMap(this.map);

    } catch (error) {
      this.showErrorAlert('No se pudo obtener tu ubicación. Por favor, verifica tus permisos.');
    }
  }

  // Método para actualizar el mapa con la ubicación del destino
  async updateMapWithDestino() {
    const geocoder = new google.maps.Geocoder();

    try {
      geocoder.geocode({ address: this.viaje.destino }, (results: any, status: string) => {
        if (status === 'OK') {
          const destinoLatLng = results[0].geometry.location;

          // Actualizamos o creamos el marcador del destino
          if (this.destinoMarker) {
            this.destinoMarker.setPosition(destinoLatLng);
          } else {
            this.destinoMarker = new google.maps.Marker({
              position: destinoLatLng,
              map: this.map,
              title: `${this.viaje.nombre} - Destino`,
            });
          }

          // Guardamos las coordenadas del destino
          this.viaje.destino = `${destinoLatLng.lat()}, ${destinoLatLng.lng()}`;

          // Centramos el mapa en el destino
          this.map.setCenter(destinoLatLng);
          this.map.setZoom(15);

          // Dibujar la ruta entre la ubicación actual y el destino
          this.dibujarRuta();
        } else {
          this.showErrorAlert('No se pudo encontrar la dirección ingresada.');
        }
      });
    } catch (error) {
      console.error('Error al geocodificar la dirección del destino:', error);
      this.showErrorAlert('Error al geocodificar la dirección del destino.');
    }
  }

  // Método para dibujar la ruta entre la ubicación actual y el destino usando el servicio de direcciones
  dibujarRuta() {
    if (this.viaje.inicio && this.viaje.destino) {
      const destinoCoords = this.viaje.destino.split(',').map(Number);
      const destinoLatLng = new google.maps.LatLng(destinoCoords[0], destinoCoords[1]);

      // Configuramos la solicitud de direcciones desde la ubicación actual al destino
      const request = {
        origin: this.currentLocationLatLng, // Usamos la ubicación actual como origen
        destination: destinoLatLng,
        travelMode: google.maps.TravelMode.DRIVING, // O puedes cambiar a WALKING, BICYCLING, TRANSIT, etc.
      };

      // Solicitamos las direcciones
      this.directionsService.route(request, (result: any, status: string) => {
        if (status === 'OK') {
          this.directionsRenderer.setDirections(result);
        } else {
          this.showErrorAlert('No se pudo calcular la ruta.');
        }
      });
    }
  }

  async createViaje() {
    try {
      // Asegúrate de que los campos "precio", "espacio" y "horaSalida" estén bien formateados
      if (!this.viaje.precio || !this.viaje.espacio || !this.viaje.horaSalida) {
        throw new Error('Por favor, completa todos los campos del formulario.');
      }
      
       // Guardar el viaje en el historial de viajes
      await this.firebaseService.guardarHistorialDeViajes(this.viaje);
      // Guardar el viaje en Firebase con los campos adicionales
      await this.firebaseService.guardarViaje(this.viaje);
  
      // Mensaje de éxito
      this.showAlert('Éxito', 'El viaje ha sido guardado exitosamente.', true);
  
      // Recargar los viajes y ocultar el formulario si se ha creado un viaje
      this.obtenerMisViajes();
  
    } catch (error) {
      console.error('Error al crear el viaje:', error);
      this.showAlert('Error', 'Error al crear el viaje.', false);
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
  // Obtener los viajes guardados del conductor actual
  // Obtener los viajes guardados del conductor actual
  obtenerMisViajes() {
    this.firebaseService.obtenerViajes().subscribe(
      (viajes) => {
        this.viajes = viajes;
      },
      (error) => {
        console.error('Error al obtener los viajes:', error);
        this.presentAlert('Error', 'Error al cargar los viajes.');
      }
    );
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  // Función para eliminar un viaje
  async eliminarViaje(viaje: any) {
    try {
      await this.firebaseService.eliminarViaje(viaje);
      this.obtenerMisViajes(); // Actualizamos la lista de viajes después de eliminar
    } catch (error) {
      console.error('Error al eliminar el viaje:', error);
      this.showErrorAlert('Error al eliminar el viaje.');
    }
  }

  async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }
}
