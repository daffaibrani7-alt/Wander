import { FriendLocation } from "../services/mockService";

export interface ClusterNode {
  id: string;
  isCluster: boolean;
  latitude: number;
  longitude: number;
  friends: FriendLocation[];
  avatarEmojis: string[];
}

/**
 * Custom Centroid-based spatial marker clustering algorithm.
 * Groups nearby coordinates dynamically depending on map zoom level.
 * 
 * @param friends Array of FriendLocation coordinates
 * @param zoom Current Map Zoom Level (approx 1 - 20)
 * @returns Array of clustered or precise single nodes
 */
export function getClusteredNodes(friends: FriendLocation[], zoom: number): ClusterNode[] {
  // If map is zoomed in close (street-level Zoom >= 15), show precise markers!
  if (zoom >= 15) {
    return friends.map((f) => ({
      id: f.uid,
      isCluster: false,
      latitude: f.latitude,
      longitude: f.longitude,
      friends: [f],
      avatarEmojis: [f.avatarEmoji],
    }));
  }

  // Determine dynamic clustering degree threshold depending on map scale zoom
  let radius = 0.001; // default approx ~100m at zoom 14
  if (zoom <= 10) radius = 0.015;      // ~1.5km
  else if (zoom === 11) radius = 0.01;  // ~1km
  else if (zoom === 12) radius = 0.006; // ~600m
  else if (zoom === 13) radius = 0.003; // ~300m
  else if (zoom === 14) radius = 0.0015; // ~150m

  const clustered: ClusterNode[] = [];
  const visited = new Set<string>();

  for (let i = 0; i < friends.length; i++) {
    const f1 = friends[i];
    if (visited.has(f1.uid)) continue;

    const clusterFriends: FriendLocation[] = [f1];
    visited.add(f1.uid);

    // Scan subsequent friends to form centroid grouping
    for (let j = i + 1; j < friends.length; j++) {
      const f2 = friends[j];
      if (visited.has(f2.uid)) continue;

      const latDiff = Math.abs(f1.latitude - f2.latitude);
      const lngDiff = Math.abs(f1.longitude - f2.longitude);

      if (latDiff < radius && lngDiff < radius) {
        clusterFriends.push(f2);
        visited.add(f2.uid);
      }
    }

    if (clusterFriends.length > 1) {
      // Calculate exact centroid (mean average lat/lng)
      let sumLat = 0;
      let sumLng = 0;
      clusterFriends.forEach((f) => {
        sumLat += f.latitude;
        sumLng += f.longitude;
      });
      const centroidLat = sumLat / clusterFriends.length;
      const centroidLng = sumLng / clusterFriends.length;

      // Create stable cluster ID based on sorted friend uids
      const uids = clusterFriends.map((f) => f.uid).sort().join("_");

      clustered.push({
        id: `cluster_${uids}`,
        isCluster: true,
        latitude: centroidLat,
        longitude: centroidLng,
        friends: clusterFriends,
        avatarEmojis: clusterFriends.map((f) => f.avatarEmoji),
      });
    } else {
      clustered.push({
        id: f1.uid,
        isCluster: false,
        latitude: f1.latitude,
        longitude: f1.longitude,
        friends: [f1],
        avatarEmojis: [f1.avatarEmoji],
      });
    }
  }

  return clustered;
}
export type { FriendLocation };
