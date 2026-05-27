/**
 * geohash.ts
 *
 * Production-grade base32 Geohash Spatial Indexing Utility.
 * Encodes, decodes, and finds neighbor coordinates for high-performance localized queries.
 */

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
const BITS = [16, 8, 4, 2, 1];

export interface GeohashBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface GeohashCenter {
  latitude: number;
  longitude: number;
}

export const geohashUtil = {
  /**
   * Encodes latitude and longitude into a geohash string of a specific precision.
   */
  encode: (latitude: number, longitude: number, precision: number = 9): string => {
    let isEven = true;
    let latMin = -90.0;
    let latMax = 90.0;
    let lngMin = -180.0;
    let lngMax = 180.0;

    let geohash = "";
    let bit = 0;
    let ch = 0;

    while (geohash.length < precision) {
      let mid = 0;
      if (isEven) {
        mid = (lngMin + lngMax) / 2.0;
        if (longitude > mid) {
          ch |= BITS[bit];
          lngMin = mid;
        } else {
          lngMax = mid;
        }
      } else {
        mid = (latMin + latMax) / 2.0;
        if (latitude > mid) {
          ch |= BITS[bit];
          latMin = mid;
        } else {
          latMax = mid;
        }
      }

      isEven = !isEven;
      if (bit < 4) {
        bit++;
      } else {
        geohash += BASE32.charAt(ch);
        bit = 0;
        ch = 0;
      }
    }

    return geohash;
  },

  /**
   * Decodes a geohash string into its latitude and longitude bounding box coordinates.
   */
  decodeBounds: (geohash: string): GeohashBounds => {
    let isEven = true;
    let latMin = -90.0;
    let latMax = 90.0;
    let lngMin = -180.0;
    let lngMax = 180.0;

    for (let i = 0; i < geohash.length; i++) {
      const c = geohash.charAt(i);
      const cd = BASE32.indexOf(c);
      if (cd === -1) continue;

      for (let j = 0; j < 5; j++) {
        const mask = BITS[j];
        if (isEven) {
          const mid = (lngMin + lngMax) / 2.0;
          if ((cd & mask) !== 0) {
            lngMin = mid;
          } else {
            lngMax = mid;
          }
        } else {
          const mid = (latMin + latMax) / 2.0;
          if ((cd & mask) !== 0) {
            latMin = mid;
          } else {
            latMax = mid;
          }
        }
        isEven = !isEven;
      }
    }

    return {
      minLat: latMin,
      minLng: lngMin,
      maxLat: latMax,
      maxLng: lngMax,
    };
  },

  /**
   * Decodes a geohash string to find the center coordinate.
   */
  decodeCenter: (geohash: string): GeohashCenter => {
    const bounds = geohashUtil.decodeBounds(geohash);
    return {
      latitude: (bounds.minLat + bounds.maxLat) / 2.0,
      longitude: (bounds.minLng + bounds.maxLng) / 2.0,
    };
  },

  /**
   * Computes the neighboring geohash in a specified direction.
   */
  calculateNeighbor: (geohash: string, direction: [number, number]): string => {
    const center = geohashUtil.decodeCenter(geohash);
    const bounds = geohashUtil.decodeBounds(geohash);

    const latHeight = bounds.maxLat - bounds.minLat;
    const lngWidth = bounds.maxLng - bounds.minLng;

    const neighborLat = center.latitude + direction[0] * latHeight;
    let neighborLng = center.longitude + direction[1] * lngWidth;

    // Wrap around boundaries
    if (neighborLng > 180.0) neighborLng -= 360.0;
    if (neighborLng < -180.0) neighborLng += 360.0;

    return geohashUtil.encode(neighborLat, neighborLng, geohash.length);
  },

  /**
   * Retrieves all 8 immediate neighboring geohashes of a given geohash.
   */
  getNeighbors: (geohash: string): Record<string, string> => {
    return {
      north: geohashUtil.calculateNeighbor(geohash, [1, 0]),
      south: geohashUtil.calculateNeighbor(geohash, [-1, 0]),
      east: geohashUtil.calculateNeighbor(geohash, [0, 1]),
      west: geohashUtil.calculateNeighbor(geohash, [0, -1]),
      northEast: geohashUtil.calculateNeighbor(geohash, [1, 1]),
      northWest: geohashUtil.calculateNeighbor(geohash, [1, -1]),
      southEast: geohashUtil.calculateNeighbor(geohash, [-1, 1]),
      southWest: geohashUtil.calculateNeighbor(geohash, [-1, -1]),
    };
  },
};
