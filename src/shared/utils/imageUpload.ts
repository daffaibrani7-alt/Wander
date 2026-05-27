/**
 * imageUpload.ts
 *
 * Centralized upload engine for profile avatar pictures.
 * Supports progress callbacks and handles Simulation Mode fallbacks.
 */
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, isFirebaseConfigured } from "@/shared/config/firebase";

export async function uploadAvatarImageAsync(
  userId: string,
  localUri: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!isFirebaseConfigured || !storage) {
    // ─── Simulation Mode Fallback ────────────────────────────────────
    // Simulates upload latency, triggers progress hooks, and returns
    // the local URI itself so that it can render instantly on-device.
    if (onProgress) {
      onProgress(20);
      await new Promise((r) => setTimeout(r, 200));
      onProgress(50);
      await new Promise((r) => setTimeout(r, 200));
      onProgress(85);
      await new Promise((r) => setTimeout(r, 200));
      onProgress(100);
    }
    return localUri;
  }

  // ─── Real Firebase Storage Upload ──────────────────────────────────
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();

    const fileRef = ref(storage, `avatars/${userId}.jpg`);
    const uploadTask = uploadBytesResumable(fileRef, blob);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(Math.round(progress));
          }
        },
        (error) => {
          console.error("❌ Firebase Storage upload error:", error);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  } catch (error) {
    console.error("❌ Error reading local avatar file blob:", error);
    throw error;
  }
}
