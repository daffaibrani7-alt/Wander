import React from "react";
import { StyleSheet } from "react-native";
import { MapboxView, MapboxViewRef } from "@/features/map/components/MapboxView";

interface HomeMapLayerProps {
  mapRef: React.RefObject<MapboxViewRef | null>;
  latitude: number;
  longitude: number;
  isDark: boolean;
  friends: any[];
  userProfile: any;
  batteryLevel: number;
  isCharging: boolean;
  ghostMode: "precise" | "blurry" | "frozen";
  selfActivity: any;
  activeGeofenceType: any;
  followUser: boolean;
  onMapPan: () => void;
  isMapPickMode: boolean;
  onMapPress: (coords: { latitude: number; longitude: number }) => void;
}

function HomeMapLayerComponent({
  mapRef,
  latitude,
  longitude,
  isDark,
  friends,
  userProfile,
  batteryLevel,
  isCharging,
  ghostMode,
  selfActivity,
  activeGeofenceType,
  followUser,
  onMapPan,
  isMapPickMode,
  onMapPress,
}: HomeMapLayerProps) {
  return (
    <MapboxView
      ref={mapRef}
      latitude={latitude}
      longitude={longitude}
      isDark={isDark}
      friends={friends}
      userProfile={userProfile}
      userBatteryLevel={batteryLevel}
      userIsCharging={isCharging}
      userGhostMode={ghostMode}
      userActivity={selfActivity}
      userGeofence={activeGeofenceType}
      followUser={followUser}
      onMapPan={onMapPan}
      onMapPress={(coords) => {
        if (isMapPickMode) {
          onMapPress(coords);
        }
      }}
      style={StyleSheet.absoluteFill}
    />
  );
}

// Highly optimized memoizer checking strict map dependencies to eliminate redundant canvas/GL context re-draws
export const HomeMapLayer = React.memo(HomeMapLayerComponent, (prev, next) => {
  return (
    prev.latitude === next.latitude &&
    prev.longitude === next.longitude &&
    prev.isDark === next.isDark &&
    prev.followUser === next.followUser &&
    prev.isMapPickMode === next.isMapPickMode &&
    prev.ghostMode === next.ghostMode &&
    prev.selfActivity === next.selfActivity &&
    prev.activeGeofenceType === next.activeGeofenceType &&
    prev.batteryLevel === next.batteryLevel &&
    prev.isCharging === next.isCharging &&
    prev.friends.length === next.friends.length &&
    prev.userProfile?.uid === next.userProfile?.uid &&
    // Check if any friend's coordinates updated specifically
    prev.friends.every((f, idx) => {
      const nextFriend = next.friends[idx];
      return (
        nextFriend &&
        f.uid === nextFriend.uid &&
        f.latitude === nextFriend.latitude &&
        f.longitude === nextFriend.longitude &&
        f.activity === nextFriend.activity &&
        f.isOnline === nextFriend.isOnline &&
        f.batteryLevel === nextFriend.batteryLevel &&
        f.isCharging === nextFriend.isCharging
      );
    })
  );
});
