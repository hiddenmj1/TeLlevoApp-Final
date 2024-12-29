// src/app/services/firebase.service.ts

import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment'; // Asegúrate de tener tu configuración de Firebase aquí
export interface TravelHistory {
  aceptadoEn: Date;
  aceptadoPor: string;
  createdAt: Date;
  destino: string;
  destinoNombre: string;
  driverId: string;
  espacio: number;
  estado: string;
  horaSalida: string;
  id: string;
  inicio: string;
  nombre: string;
  precio: number;
  takenBy: string;
}
@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private tripsCollection: AngularFirestoreCollection<any>;
  historialDeViajesCollection = this.firestore.collection('historialDeViajes'); // Add this line
  viajesTomadosCollection = this.firestore.collection('ViajesTomados'); // Add this line

  
  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router,
    private http: HttpClient // Inyecta HttpClient
  ) {
    this.tripsCollection = this.firestore.collection<any>('viajes');
  }

  // Métodos de autenticación
  async register(email: string, password: string, tipoUsuario: string, additionalData: any) {
    try {
      const userCredential = await this.afAuth.createUserWithEmailAndPassword(email, password);
      const uid = userCredential.user?.uid;

      await this.firestore.collection('USUARIO').doc(uid).set({
        uid,
        email,
        tipoUsuario,
        ...additionalData,
        createdAt: new Date(),
      });

      return userCredential;
    } catch (error) {
      throw error;
    }
  }

  async login(email: string, password: string) {
    try {
      return await this.afAuth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      throw error;
    }
  }

  getCurrentUser() {
    return this.afAuth.currentUser;
  }

  async logout() {
    try {
      await this.afAuth.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  getAuthState(): Observable<any> {
    return this.afAuth.authState;
  }

  async getUserData(uid: string): Promise<any> {
    try {
      const userDoc = await this.firestore.collection('USUARIO').doc(uid).get().toPromise();
      if (!userDoc || !userDoc.exists) {
        throw new Error('Usuario no encontrado');
      }
      return userDoc.data();
    } catch (error) {
      console.error('Error al obtener los datos del usuario:', error);
      throw error;
    }
  }

  async guardarHistorialDeViajes(viaje: any) {
    try {
      const user = await this.afAuth.currentUser;
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Asigna el ID del conductor al viaje
      viaje.driverId = user.uid;
      viaje.estado = 'pendiente'; // Estado inicial
      viaje.createdAt = new Date();

      await this.historialDeViajesCollection.add(viaje); // Use the new collection reference
      console.log('Viaje guardado exitosamente en el historial de viajes en Firebase.');
    } catch (error) {
      console.error('Error al guardar el viaje en el historial de viajes:', error);
    }
  }

  async guardarViajeTomado(viaje: any) {
    try {
      await this.firestore.collection('ViajesTomados').add(viaje);
      console.log('Viaje guardado exitosamente en ViajesTomados.');
    } catch (error) {
      console.error('Error al guardar el viaje en ViajesTomados:', error);
    }
  }

  getTravelHistory(conductorId: string) {
    return this.firestore.collection('historialDeViajes', ref => ref.where('driverId', '==', conductorId)).valueChanges();
  }

  getviajestomados(clientId: string): Observable<TravelHistory[]> {
    return this.firestore.collection<TravelHistory>('ViajesTomados', ref => ref.where('takenBy', '==', clientId)).valueChanges();
  }

  async guardarViaje(viaje: any) { 
    try {
      const user = await this.afAuth.currentUser;
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Asigna el ID del conductor al viaje
      viaje.driverId = user.uid;
      viaje.estado = 'pendiente'; // Estado inicial
      viaje.createdAt = new Date();

      await this.tripsCollection.add(viaje);
      console.log('Viaje guardado exitosamente en Firebase.');
    } catch (error) {
      console.error('Error al guardar el viaje:', error);
    }
  }

  obtenerViajes(): Observable<any[]> {
    return this.firestore.collection('viajes').valueChanges({ idField: 'id' });
  }

 // Método para aceptar un viaje
 async aceptarViaje(viaje: any) {
  try {
    const user = await this.afAuth.currentUser;
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Agregar el ID del usuario que acepta el viaje
    viaje.takenBy = user.uid;

    await this.firestore.collection('ViajesTomados').add(viaje);
    console.log('Viaje aceptado y guardado en ViajesTomados.');
  } catch (error) {
    console.error('Error al aceptar el viaje:', error);
  }
}

async finalizarViaje(viajeId: string) {
  try {
    await this.firestore.collection('viajes').doc(viajeId).update({ estado: 'finalizado' });
    console.log('Viaje finalizado exitosamente.');
  } catch (error) {
    console.error('Error al finalizar el viaje:', error);
    throw error;
  }
}

  // Método para eliminar un viaje
  async eliminarViaje(viaje: any) {
    try {
      await this.tripsCollection.doc(viaje.id).delete();
      console.log('Viaje eliminado exitosamente.');
    } catch (error) {
      console.error('Error al eliminar el viaje:', error);
      throw error;
    }
  }
}
