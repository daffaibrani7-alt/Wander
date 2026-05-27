import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/shared/config/firebase";

export interface SavedPlace {
  placeId: string;
  uid: string;
  label: string;
  emoji: string;
  type: "home" | "work" | "school" | "cafe" | "custom";
  latitude: number;
  longitude: number;
  radius: number; // in meters, default 150m
  createdAt: string;
}

export const geofenceService = {
  /**
   * Menghitung jarak bumi geodesik antara dua koordinat (dalam kilometer).
   */
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius bumi dalam km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Menambahkan atau memperbarui saved place pengguna.
   */
  savePlace: async (uid: string, place: Omit<SavedPlace, "uid" | "createdAt">): Promise<void> => {
    if (!isFirebaseConfigured || !db) return;
    try {
      const docId = `${uid}_${place.placeId}`;
      const docRef = doc(db, "places", docId);
      const newPlace: SavedPlace = {
        ...place,
        uid,
        createdAt: new Date().toISOString(),
      };
      await setDoc(docRef, newPlace, { merge: true });
    } catch (err) {
      console.error("Gagal menyimpan tempat favorit ke Firestore:", err);
    }
  },

  /**
   * Menghapus saved place favorit.
   */
  deletePlace: async (uid: string, placeId: string): Promise<void> => {
    if (!isFirebaseConfigured || !db) return;
    try {
      const docId = `${uid}_${placeId}`;
      const docRef = doc(db, "places", docId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Gagal menghapus tempat favorit dari Firestore:", err);
    }
  },

  /**
   * Mendapatkan daftar tempat favorit yang disimpan secara statis.
   */
  getPlaces: async (uid: string): Promise<SavedPlace[]> => {
    if (!isFirebaseConfigured || !db) {
      return geofenceService.getSimulatedPlaces(uid);
    }
    try {
      const placesCol = collection(db, "places");
      const q = query(placesCol, where("uid", "==", uid));
      const snap = await getDocs(q);
      const results: SavedPlace[] = [];
      snap.forEach((docSnap) => {
        results.push(docSnap.data() as SavedPlace);
      });
      return results;
    } catch (err) {
      console.error("Gagal mengambil tempat favorit:", err);
      return [];
    }
  },

  /**
   * Mengamati daftar saved places secara real-time.
   */
  listenToPlaces: (uid: string, callback: (places: SavedPlace[]) => void): (() => void) => {
    if (!isFirebaseConfigured || !db) {
      callback(geofenceService.getSimulatedPlaces(uid));
      return () => {};
    }

    try {
      const placesCol = collection(db, "places");
      const q = query(placesCol, where("uid", "==", uid));
      
      return onSnapshot(
        q,
        (snapshot) => {
          const results: SavedPlace[] = [];
          snapshot.forEach((docSnap) => {
            results.push(docSnap.data() as SavedPlace);
          });
          // Mengembalikan simulasi jika kosong agar ada isinya di UI awal
          if (results.length === 0) {
            callback(geofenceService.getSimulatedPlaces(uid));
          } else {
            callback(results);
          }
        },
        (err) => {
          console.error("Error listenToPlaces:", err);
        }
      );
    } catch (err) {
      console.error("Gagal listenToPlaces:", err);
      callback(geofenceService.getSimulatedPlaces(uid));
      return () => {};
    }
  },

  /**
   * Helper mock places untuk simulation/offline mode.
   */
  getSimulatedPlaces: (uid: string): SavedPlace[] => {
    return [
      {
        placeId: "home-id",
        uid,
        label: "Rumah",
        emoji: "🏡",
        type: "home",
        latitude: -6.2088,
        longitude: 106.8456,
        radius: 150,
        createdAt: new Date().toISOString(),
      },
      {
        placeId: "work-id",
        uid,
        label: "Kantor",
        emoji: "💼",
        type: "work",
        latitude: -6.2045,
        longitude: 106.8490,
        radius: 200,
        createdAt: new Date().toISOString(),
      },
      {
        placeId: "school-id",
        uid,
        label: "Sekolah",
        emoji: "🏫",
        type: "school",
        latitude: -6.2110,
        longitude: 106.8520,
        radius: 150,
        createdAt: new Date().toISOString(),
      },
      {
        placeId: "cafe-id",
        uid,
        label: "Kopi Kenangan",
        emoji: "☕",
        type: "cafe",
        latitude: -6.2065,
        longitude: 106.8475,
        radius: 100,
        createdAt: new Date().toISOString(),
      },
    ];
  },
};
