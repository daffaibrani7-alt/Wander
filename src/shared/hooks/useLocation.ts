import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { doc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/shared/config/firebase";

export type GhostModeType = "precise" | "blurry" | "frozen";

export function useLocation(userId: string = "user-me", batteryLevel: number = 100, isCharging: boolean = false) {
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ghostMode, setGhostModeState] = useState<GhostModeType>("precise");
  const [frozenLocation, setFrozenLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [blurryLocation, setBlurryLocation] = useState<Location.LocationObjectCoords | null>(null);

  // Request permissions and watch location
  useEffect(() => {
    let watchSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    async function startLocationTracking() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied");
          // Jakarta fallback coordinates if denied or in simulator
          if (isMounted) {
            setLocation({
              latitude: -6.2088,
              longitude: 106.8456,
              altitude: null,
              accuracy: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            });
          }
          return;
        }

        // Get initial location
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        if (isMounted) {
          setLocation(initial.coords);
        }

        // Watch location changes
        watchSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000, // every 5 seconds
            distanceInterval: 5, // every 5 meters
          },
          (newLocation) => {
            if (!isMounted) return;
            const coords = newLocation.coords;
            setLocation(coords);
          }
        );
      } catch (error) {
        console.warn("Location tracking error, falling back to simulator mock", error);
        // Fallback default coordinate (Grand Indonesia, Jakarta)
        if (isMounted) {
          setLocation({
            latitude: -6.2088,
            longitude: 106.8456,
            altitude: null,
            accuracy: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          });
        }
      }
    }

    startLocationTracking();

    return () => {
      isMounted = false;
      if (watchSubscription) {
        watchSubscription.remove();
      }
    };
  }, []);

  // Set ghost mode
  const setGhostMode = (mode: GhostModeType) => {
    setGhostModeState(mode);

    if (mode === "frozen" && location) {
      // Freeze the location at this exact coordinate
      setFrozenLocation(location);
    } else if (mode === "blurry" && location) {
      // Add a constant random offset (~800m to 1.5km) to simulate blurry location
      const randomOffsetLat = (Math.random() > 0.5 ? 1 : -1) * (0.006 + Math.random() * 0.008);
      const randomOffsetLng = (Math.random() > 0.5 ? 1 : -1) * (0.006 + Math.random() * 0.008);
      setBlurryLocation({
        ...location,
        latitude: location.latitude + randomOffsetLat,
        longitude: location.longitude + randomOffsetLng,
      });
    }
  };

  // Sync to database
  useEffect(() => {
    if (!location) return;

    // Determine what coordinates to write to DB/broadcast
    let finalCoords = { ...location };

    if (ghostMode === "frozen") {
      if (frozenLocation) {
        finalCoords = { ...frozenLocation };
      } else {
        setFrozenLocation(location);
      }
    } else if (ghostMode === "blurry") {
      if (blurryLocation) {
        finalCoords = { ...blurryLocation };
      } else {
        // Create initial offset
        const randomOffsetLat = (Math.random() > 0.5 ? 1 : -1) * (0.006 + Math.random() * 0.008);
        const randomOffsetLng = (Math.random() > 0.5 ? 1 : -1) * (0.006 + Math.random() * 0.008);
        const nextBlur = {
          ...location,
          latitude: location.latitude + randomOffsetLat,
          longitude: location.longitude + randomOffsetLng,
        };
        setBlurryLocation(nextBlur);
        finalCoords = nextBlur;
      }
    }

    // Sync to Firestore if configured
    if (isFirebaseConfigured && db) {
      const userDocRef = doc(db, "users", userId);
      setDoc(
        userDocRef,
        {
          uid: userId,
          displayName: "Me (You)",
          latitude: finalCoords.latitude,
          longitude: finalCoords.longitude,
          batteryLevel: batteryLevel,
          isCharging: isCharging,
          ghostMode: ghostMode,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch((err) => {
        console.error("Firestore sync error:", err);
      });
    }
  }, [location, ghostMode, batteryLevel, isCharging]);

  // Determine displaying coordinate for personal display on map (we always see our actual self)
  const displayLocation = location;

  return {
    location: displayLocation,
    broadcastLocation: ghostMode === "frozen" ? frozenLocation || location : (ghostMode === "blurry" ? blurryLocation || location : location),
    errorMsg,
    ghostMode,
    setGhostMode,
  };
}
