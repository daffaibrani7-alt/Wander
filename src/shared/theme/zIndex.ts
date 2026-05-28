/**
 * zIndex.ts
 *
 * zIndex tokens for layout layering consistency.
 */
export const ZINDEX = {
  map: 0,
  markers: 10,
  overlays: 100, // Top bar, search results, floating controls
  sheets: 500,   // Friend bottom sheet, carousels
  modals: 1000,  // Consent modal, simulator overrides
  toasts: 9999,  // Banners, alerts

  // Keep backward compatibility
  base: 0,
  marker: 10,
  friendCarousel: 90,
  controls: 100,
  searchResults: 150,
  ghostPicker: 200,
  replayHud: 300,
  modal: 999,
  islandAlert: 9999,
  offlineBanner: 9999,
  lockScreen: 99999,
};
