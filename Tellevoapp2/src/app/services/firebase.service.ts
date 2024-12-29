// src/app/services/firebase.service.ts

import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment'; // Asegúrate de tener tu configuración de Firebase aquí

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private tripsCollection: AngularFirestoreCollection<any>;
  
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

  // Método para obtener los viajes
  async obtenerViajes(): Promise<any[]> {
    try {
      const snapshot = await this.tripsCollection.get().toPromise();

      if (snapshot && !snapshot.empty) {
        return snapshot.docs.map(doc => {
          const data = doc.data();
          return { id: doc.id, ...data };
        });
      } else {
        console.error('No se encontraron viajes.');
        return [];
      }
    } catch (error) {
      console.error('Error al obtener los viajes:', error);
      return [];
    }
  }

  // Método para aceptar un viaje
  async aceptarViaje(viaje: any) {
    try {
      const user = await this.afAuth.currentUser;
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      await this.tripsCollection.doc(viaje.id).update({
        estado: 'aceptado',
        aceptadoPor: user.uid,
        aceptadoEn: new Date(),
      });

      console.log('Viaje aceptado y actualizado en Firestore.');
    } catch (error) {
      console.error('Error al aceptar el viaje:', error);
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
