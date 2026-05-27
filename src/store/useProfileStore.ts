/**
 * useProfileStore.ts
 *
 * Zustand store to manage UI states during profile customization,
 * including saving overlays, image upload progress bar values, and error messaging.
 */
import { create } from "zustand";
import { updateProfileData } from "../services/profileService";
import { uploadAvatarImageAsync } from "../utils/imageUpload";
import { useAuthStore } from "./useAuthStore";
import type { UserProfile } from "../services/userService";

interface ProfileState {
  isSaving: boolean;
  uploadProgress: number;
  error: string | null;

  updateProfile: (
    uid: string,
    fields: Partial<UserProfile>
  ) => Promise<boolean>;
  uploadProfilePicture: (
    uid: string,
    localUri: string
  ) => Promise<string | null>;
  clearError: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  isSaving: false,
  uploadProgress: 0,
  error: null,

  updateProfile: async (uid: string, fields: Partial<UserProfile>) => {
    set({ isSaving: true, error: null });
    try {
      await updateProfileData(uid, fields);

      // Reactively sync auth store's active user state
      useAuthStore.getState().updateLocalUser(fields);

      set({ isSaving: false });
      return true;
    } catch (err: any) {
      console.error("❌ Error updating profile data:", err);
      set({
        isSaving: false,
        error: err.message || "Gagal menyimpan perubahan profil.",
      });
      return false;
    }
  },

  uploadProfilePicture: async (uid: string, localUri: string) => {
    set({ isSaving: true, uploadProgress: 0, error: null });
    try {
      const downloadUrl = await uploadAvatarImageAsync(uid, localUri, (pct) => {
        set({ uploadProgress: pct });
      });

      if (!downloadUrl) throw new Error("Gagal mendapatkan URL unduhan gambar.");

      // Persist the updated avatar photoURL in the database
      await updateProfileData(uid, { photoURL: downloadUrl });

      // Reactively sync auth store's photoURL
      useAuthStore.getState().updateLocalUser({ photoURL: downloadUrl });

      set({ isSaving: false, uploadProgress: 100 });
      return downloadUrl;
    } catch (err: any) {
      console.error("❌ Error uploading profile picture:", err);
      set({
        isSaving: false,
        error: err.message || "Gagal mengunggah foto profil.",
      });
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));
