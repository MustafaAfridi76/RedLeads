import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

// Firebase web configuration identifies the existing project. Access is still
// controlled by Firebase Authentication and the deployed Firestore rules.
export const app = initializeApp({
  apiKey: "AIzaSyBBSJEbWCtYE3TCHILu5Vqkm-gKTn-mQ8s",
  authDomain: "leadred-bcf1a.firebaseapp.com",
  projectId: "leadred-bcf1a",
  storageBucket: "leadred-bcf1a.firebasestorage.app",
  messagingSenderId: "158880150450",
  appId: "1:158880150450:web:8bd19cfa2272209c316aab",
});

// Local development uses the registered browser debug token. Production builds
// use the site's reCAPTCHA Enterprise key when one has been configured.
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
if (typeof self !== "undefined" && (import.meta.env.DEV || appCheckSiteKey)) {
  if (import.meta.env.DEV) {
    (
      self as typeof self & { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(
      appCheckSiteKey || "local-debug-only",
    ),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const OFFER_MANAGER_UID = "nmc60HzQVMbmejGjDIkNs2yOz8t1";
