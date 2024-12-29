// src/app/home-cliente/home.page.ts

import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import { LoadingController, AlertController,PopoverController} from '@ionic/angular';
import { Router } from '@angular/router';
declare var google: any; // Asegúrate de tener la API de Google Maps cargada
import { TravelHistoryPopoverComponents } from '../travel-history-popover/travel-history-popover.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, AfterViewInit {
  viajes: any[] = [];
  map: any;
  marker: any;
  directionsService: any; // Definir el servicio para obtener la ruta
  directionsRenderer: any; // Definir el servicio para renderizar la ruta
  geocoder: any; // Definir el geocoder

  constructor(
    private firebaseService: FirebaseService,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private popoverController: PopoverController,
    private router: Router
  ) {}

  ngOnInit() {
    this.obtenerViajes();
  }

  ngAfterViewInit() {
    this.initMap(); // Inicializa el mapa después de que la vista haya sido cargada
    this.geocoder = new google.maps.Geocoder(); // Inicializamos el servicio de geocodificación
  }

  logout() {
    this.firebaseService.logout();
  }

 

  // Inicializar el Mapa
  async initMap() {
    const loading = await this.loadingController.create({
      message: 'Inicializando mapa...',
    });
    await loading.present();

    // Configura una ubicación por defecto (por ejemplo, Santiago, Chile)
    const defaultLocation = { lat: -33.4489, lng: -70.6693 };

    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Elemento del mapa no encontrado.');
      loading.dismiss();
      return;
    }

    this.map = new google.maps.Map(mapElement, {
      center: defaultLocation,
      zoom: 12,
    });

    // Inicializar DirectionsService y DirectionsRenderer
    this.directionsService = new google.maps.DirectionsService(); // Inicializa DirectionsService
    this.directionsRenderer = new google.maps.DirectionsRenderer(); // Inicializa DirectionsRenderer
    this.directionsRenderer.setMap(this.map); // Conectar DirectionsRenderer al mapa

    loading.dismiss();
  }

  // Obtener Viajes desde Firestore
  async obtenerViajes() {
    const loading = await this.loadingController.create({
      message: 'Cargando viajes...',
    });
    await loading.present();

    try {
      this.firebaseService.obtenerViajes().subscribe(viajes => {
        // Filtrar los viajes que ya han sido tomados
        this.viajes = viajes.filter(viaje => !viaje.takenBy);

        // Para cada viaje, convertir las coordenadas de destino a un nombre de lugar
        for (const viaje of this.viajes) {
          const [lat, lng] = viaje.destino.split(',').map(Number);
          if (!isNaN(lat) && !isNaN(lng)) {
            // Llamada a la API de geocodificación para obtener el nombre del lugar
            this.geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
              if (status === 'OK' && results[0]) {
                viaje.destinoNombre = results[0].formatted_address; // Asignamos el nombre del lugar
              } else {
                viaje.destinoNombre = 'Destino desconocido';
                console.error('Geocodificación fallida:', status);
              }
            });
          } else {
            viaje.destinoNombre = 'Coordenadas inválidas';
          }
        }

        console.log('Viajes obtenidos:', this.viajes);
      });
    } catch (error) {
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'No se pudieron cargar los viajes.',
        buttons: ['OK'],
      });
      await alert.present();
    } finally {
      loading.dismiss();
    }
  }
  async presentPopover(ev: any) {
    const popover = await this.popoverController.create({
      component: TravelHistoryPopoverComponents,
      event: ev,
      translucent: true
    });
    await popover.present();
  }


  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  // Ver Viaje: Calcular y mostrar la ruta en el mapa
  verViaje(viaje: any) {
    console.log('Viaje seleccionado:', viaje);

    if (!viaje.inicio || !viaje.destino) {
      this.presentAlert('Error', 'Coordenadas del viaje no disponibles.');
      return;
    }

    const [inicioLat, inicioLng] = viaje.inicio.split(',').map(Number);
    const [destinoLat, destinoLng] = viaje.destino.split(',').map(Number);

    if (isNaN(inicioLat) || isNaN(inicioLng) || isNaN(destinoLat) || isNaN(destinoLng)) {
      this.presentAlert('Error', 'Coordenadas del viaje no válidas.');
      return;
    }

    const request = {
      origin: { lat: inicioLat, lng: inicioLng },
      destination: { lat: destinoLat, lng: destinoLng },
      travelMode: google.maps.TravelMode.DRIVING,
    };

    // Usamos DirectionsService para calcular la ruta y DirectionsRenderer para mostrarla
    this.directionsService.route(request, (result: any, status: any) => {
      if (status === 'OK') {
        this.directionsRenderer.setDirections(result); // Renderiza la ruta en el mapa
      } else {
        console.error('Error al obtener la ruta:', status);
        this.presentAlert('Error', 'No se pudo calcular la ruta.');
      }
    });
  }

  async aceptarViaje(viaje: any, event: any) {
    try {
      if (viaje.espacio <= 0) {
        const alert = await this.alertController.create({
          header: 'Sin asientos disponibles',
          message: 'No hay asientos disponibles para este viaje.',
          buttons: ['OK']
        });
        await alert.present();
        return;
      }

      const user = await this.firebaseService.getCurrentUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Add the ID of the person who accepts the trip
      viaje.takenBy = user.uid;
      viaje.espacio -= 1; // Reducir el número de asientos disponibles

      await this.firebaseService.guardarViajeTomado(viaje);

      const alert = await this.alertController.create({
        header: 'Éxito',
        message: 'El viaje ha sido aceptado y guardado en ViajesTomados.',
        buttons: ['OK']
      });
      await alert.present();

      // Remove the accepted trip from the list
      this.viajes = this.viajes.filter(v => v.id !== viaje.id);

      // Navigate to the trip details page
      this.router.navigate(['/trip-details'], { state: { viaje } });

    } catch (error) {
      console.error('Error al aceptar el viaje:', error);
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'Hubo un problema al aceptar el viaje. Inténtalo de nuevo.',
        buttons: ['OK']
      });
      await alert.present();
    }
}
}
