import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { FirebaseService } from '../../services/firebase.service';
import { AlertController, LoadingController } from '@ionic/angular';

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

  viaje = {
    nombre: '',
    inicio: '',  // Geolocalización del conductor
    destino: '',
    precio: '',
    espacio: '',
    horaSalida: '' // Nuevo campo para la hora de salida
  };

  viajes: any[] = []; // Lista de viajes realizados

  constructor(
    private firebaseService: FirebaseService,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  ngAfterViewInit(): void {}

  ngOnInit() {
    this.loadMap();
    this.obtenerMisViajes(); // Obtener los viajes al cargar la página
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

  // Función para crear un viaje y guardarlo en Firebase
  async createViaje() {
    try {
      // Asegúrate de que los campos "precio", "espacio" y "horaSalida" estén bien formateados
      if (!this.viaje.precio || !this.viaje.espacio || !this.viaje.horaSalida) {
        throw new Error('Por favor, completa todos los campos del formulario.');
      }

      // Guardar el viaje en Firebase con los campos adicionales
      await this.firebaseService.guardarViaje(this.viaje);

      // Mensaje de éxito
      const alert = await this.alertController.create({
        header: 'Éxito',
        message: 'El viaje ha sido guardado exitosamente.',
        buttons: ['OK'],
      });
      await alert.present();

      // Recargar los viajes y ocultar el formulario si se ha creado un viaje
      this.obtenerMisViajes();

    } catch (error) {
      console.error('Error al crear el viaje:', error);
      this.showErrorAlert('Error al crear el viaje.');
    }
  }

  // Obtener los viajes guardados del conductor actual
  async obtenerMisViajes() {
    try {
      this.viajes = await this.firebaseService.obtenerViajes();
    } catch (error) {
      console.error('Error al obtener los viajes:', error);
      this.showErrorAlert('Error al cargar los viajes.');
    }
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
