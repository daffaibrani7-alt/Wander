export interface FriendLocation {
  uid: string;
  displayName: string;
  avatarUrl: string;
  avatarEmoji: string;
  latitude: number;
  longitude: number;
  originalLatitude?: number; // for blurry mode drawing
  originalLongitude?: number; // for blurry mode drawing
  batteryLevel: number;
  isCharging: boolean;
  ghostMode: "precise" | "blurry" | "frozen";
  activity?: "online" | "idle" | "driving" | "sleeping" | "walking" | "traveling" | "home" | "work" | "school" | "cafe";
  geofence?: "home" | "work" | "school" | "cafe" | "custom" | null; // added for geofencing status
  distanceText?: string;
  statusText?: string;
  updatedAt: string;
}

// Initial Mock Friends around central Jakarta / user center (default user at -6.2088, 106.8456)
const MOCK_FRIENDS: FriendLocation[] = [
  {
    uid: "sim-1",
    displayName: "Aria",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    avatarEmoji: "⚡️",
    latitude: -6.2045,
    longitude: 106.8490,
    batteryLevel: 87,
    isCharging: false,
    ghostMode: "precise",
    activity: "driving",
    geofence: "work",
    statusText: "Active 2m ago",
    updatedAt: "Baru saja",
  },
  {
    uid: "sim-2",
    displayName: "Bastian",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    avatarEmoji: "🥶",
    latitude: -6.2150,
    longitude: 106.8390,
    batteryLevel: 34,
    isCharging: true,
    ghostMode: "frozen",
    activity: "sleeping",
    geofence: "home",
    statusText: "Frozen (2 hours ago)",
    updatedAt: "2 jam lalu",
  },
  {
    uid: "sim-3",
    displayName: "Chloe",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    avatarEmoji: "👻",
    latitude: -6.2110,
    longitude: 106.8520, // offset coordinates shown
    originalLatitude: -6.2070, // actual coordinate hidden
    originalLongitude: 106.8480,
    batteryLevel: 14,
    isCharging: false,
    ghostMode: "blurry",
    activity: "idle",
    geofence: "school",
    statusText: "Blurry (1.5km radius)",
    updatedAt: "Aktif",
  }
];

export class MockService {
  private static friends: FriendLocation[] = [...MOCK_FRIENDS];
  private static ticks: number = 0;

  static getFriends(userLat?: number, userLng?: number): FriendLocation[] {
    this.ticks++;
    
    // Simulate slight movement on every tick
    this.friends = this.friends.map(friend => {
      // Aria circles the user
      if (friend.uid === "sim-1" && userLat && userLng) {
        const radius = 0.006; // roughly 600m
        const angle = (this.ticks * 0.05) % (2 * Math.PI);
        const nextLat = userLat + radius * Math.sin(angle);
        const nextLng = userLng + radius * Math.cos(angle);
        
        return {
          ...friend,
          latitude: nextLat,
          longitude: nextLng,
          batteryLevel: Math.max(1, friend.batteryLevel - (this.ticks % 20 === 0 ? 1 : 0)),
          updatedAt: "Baru saja",
        };
      }

      // Bastian is frozen, doesn't move, but battery increases because charging
      if (friend.uid === "sim-2") {
        let battery = friend.batteryLevel;
        if (this.ticks % 10 === 0) {
          battery = friend.batteryLevel >= 100 ? 100 : friend.batteryLevel + 1;
        }
        return {
          ...friend,
          batteryLevel: battery,
        };
      }

      // Chloe (blurry) wanders slowly with random walk
      if (friend.uid === "sim-3") {
        const speed = 0.0002;
        const dx = (Math.random() - 0.5) * speed;
        const dy = (Math.random() - 0.5) * speed;
        
        const origLat = (friend.originalLatitude || friend.latitude) + dy;
        const origLng = (friend.originalLongitude || friend.longitude) + dx;
        
        // Add random offset for map display to simulate blurry offset
        const displayOffsetLat = 0.004; // ~400m north
        const displayOffsetLng = 0.004; // ~400m east

        return {
          ...friend,
          originalLatitude: origLat,
          originalLongitude: origLng,
          latitude: origLat + displayOffsetLat,
          longitude: origLng + displayOffsetLng,
          batteryLevel: Math.max(1, friend.batteryLevel - (this.ticks % 30 === 0 ? 1 : 0)),
          updatedAt: "Aktif",
        };
      }

      return friend;
    });

    // Calculate distances if user coordinates are available
    if (userLat && userLng) {
      return this.friends.map(friend => {
        const dist = this.calculateDistance(userLat, userLng, friend.latitude, friend.longitude);
        return {
          ...friend,
          distanceText: dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`,
        };
      });
    }

    return this.friends.map(f => ({ ...f, distanceText: "1.2 km" }));
  }

  // Calculate distance in km
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  static addMockFriend(name: string): FriendLocation {
    const newFriend: FriendLocation = {
      uid: `sim-${Date.now()}`,
      displayName: name,
      avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 900000)}?w=150`,
      avatarEmoji: ["🍕", "🍦", "🦄", "🧸", "🛹", "🎈", "🦊", "🍟"][Math.floor(Math.random() * 8)],
      latitude: -6.2088 + (Math.random() - 0.5) * 0.02,
      longitude: 106.8456 + (Math.random() - 0.5) * 0.02,
      batteryLevel: Math.floor(Math.random() * 60) + 40,
      isCharging: Math.random() > 0.7,
      ghostMode: "precise",
      statusText: "Just added",
      updatedAt: "Baru saja",
    };
    this.friends.push(newFriend);
    return newFriend;
  }
}
