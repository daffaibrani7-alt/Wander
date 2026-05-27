export interface TravelMemory {
  id: string;
  date: string;
  dayName: string;
  tilesCount: number;
  distance: number;
  description: string;
}

export const explorationService = {
  /**
   * Menghitung jarak lurus (Haversine) antara dua titik koordinat (dalam km).
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round((R * c) * 100) / 100;
  },

  /**
   * Mengompilasi linimasa memori perjalanan secara dinamis berdasarkan data harian.
   */
  compileTimeline(
    dailyExplored: Record<string, number>,
    totalDistance: number
  ): TravelMemory[] {
    const dates = Object.keys(dailyExplored).sort((a, b) => b.localeCompare(a));
    const memories: TravelMemory[] = [];

    const INDO_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const INDO_MONTHS = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    if (dates.length === 0) {
      // Add default mock memory recaps so UI looks populated instantly
      return [
        {
          id: "mock-1",
          date: new Date().toISOString().split("T")[0],
          dayName: INDO_DAYS[new Date().getDay()],
          tilesCount: 14,
          distance: 0.65,
          description: "Menjelajah daerah sekitar peta utama dan membuka 14 grid baru. Menemukan Spot menarik di sekitar kawasan Sudirman!",
        },
        {
          id: "mock-2",
          date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          dayName: INDO_DAYS[new Date(Date.now() - 86400000).getDay()],
          tilesCount: 8,
          distance: 0.25,
          description: "Membuka 8 grid wilayah baru pada petualangan santai kemarin sore.",
        }
      ];
    }

    dates.forEach((dateStr, idx) => {
      const date = new Date(dateStr);
      const dayName = INDO_DAYS[date.getDay()];
      const monthName = INDO_MONTHS[date.getMonth()];
      const dateFormatted = `${date.getDate()} ${monthName} ${date.getFullYear()}`;
      
      const count = dailyExplored[dateStr] || 0;
      // Proportional mock distance based on explored grids (approx 30m per grid)
      const mockDist = Math.round((count * 0.03) * 100) / 100;

      memories.push({
        id: `memory-${dateStr}`,
        date: dateFormatted,
        dayName,
        tilesCount: count,
        distance: mockDist > 0 ? mockDist : 0.05,
        description: `Membuka jalan baru sebanyak ${count} grid! Berhasil memperluas wawasan peta sosial Wander Anda.`,
      });
    });

    return memories;
  }
};
