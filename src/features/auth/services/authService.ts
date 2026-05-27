import { Platform } from "react-native";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/shared/config/firebase";

// ─── Google Sign-In Configuration ──────────────────────────────────
const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";

export function configureGoogleSignIn() {
  GoogleSignin.configure({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
}

// ─── Google Sign-In ────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<User> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase is not configured");
  }

  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new Error("Google Sign-In failed: no idToken");
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    return result.user;
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error("CANCELLED");
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error("Sign-in already in progress");
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Google Play Services not available");
    }
    throw error;
  }
}

// ─── Apple Sign-In ─────────────────────────────────────────────────
export async function signInWithApple(): Promise<User> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase is not configured");
  }

  if (Platform.OS !== "ios") {
    throw new Error("Apple Sign-In is only available on iOS");
  }

  // Generate a random nonce for security
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  try {
    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    const { identityToken } = appleCredential;
    if (!identityToken) {
      throw new Error("Apple Sign-In failed: no identityToken");
    }

    const provider = new OAuthProvider("apple.com");
    const credential = provider.credential({
      idToken: identityToken,
      rawNonce: rawNonce,
    });

    const result = await signInWithCredential(auth, credential);

    // Apple only provides name on first sign-in, so we store it
    // The name might be null on subsequent sign-ins
    if (appleCredential.fullName) {
      const displayName = [
        appleCredential.fullName.givenName,
        appleCredential.fullName.familyName,
      ]
        .filter(Boolean)
        .join(" ");
      if (displayName && !result.user.displayName) {
        // We'll handle display name in userService
        (result.user as any)._appleDisplayName = displayName;
      }
    }

    return result.user;
  } catch (error: any) {
    if (error.code === "ERR_REQUEST_CANCELED") {
      throw new Error("CANCELLED");
    }
    throw error;
  }
}

// ─── Sign Out ──────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  try {
    // Sign out from Google if was using it
    const isGoogleSignedIn = await GoogleSignin.getCurrentUser();
    if (isGoogleSignedIn) {
      await GoogleSignin.signOut();
    }
  } catch {
    // Ignore Google sign-out errors
  }

  if (auth) {
    await firebaseSignOut(auth);
  }
}

// ─── Auth State Listener ───────────────────────────────────────────
export function onAuthStateChanged(
  callback: (user: User | null) => void
): () => void {
  if (!auth) {
    // Firebase not configured – call back with null immediately
    callback(null);
    return () => {};
  }
  return firebaseOnAuthStateChanged(auth, callback);
}
