// src/app/models/trip.model.ts

export interface Trip {
  id?: string; // Opcional, Firestore lo genera automáticamente
  destination: string;
  latitude: number;
  longitude: number;
  driverId: string; // ID del conductor que creó el viaje
}
