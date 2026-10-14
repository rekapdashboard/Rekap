import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Sheets read-only scope
provider.addScope("https://www.googleapis.com/auth/spreadsheets.readonly");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // In a real load session, we check if we have cached token
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Since Firebase Auth doesn't persist the provider raw access token in standard profile,
        // we can flag the UI that we need to sign in again to obtain a fresh access token,
        // OR the user can press the sign in button to refresh token.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google sign-in method
export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  if (isSigningIn) {
    console.warn("Sign in is already in progress...");
    return null;
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to retrieve Google Sheets access token.");
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const code = error?.code || "";
    const msg = error?.message || "";
    if (
      code.includes("popup-closed-by-user") ||
      code.includes("cancelled-popup-request") ||
      code.includes("popup-blocked") ||
      msg.includes("popup-closed-by-user") ||
      msg.includes("cancelled-popup-request") ||
      msg.includes("popup-blocked")
    ) {
      console.warn("Google sign-in popup was closed or cancelled by the user.");
    } else {
      console.error("Authentication Error:", error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
