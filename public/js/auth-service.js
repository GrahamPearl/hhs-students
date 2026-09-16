/**
 * auth-service.js
 * Wraps Firebase Auth: tracks the signed-in user and whether they carry
 * the "admin" custom claim. Admin status is set via a custom claim
 * (Firebase Admin SDK / Cloud Function) rather than a Firestore doc,
 * so checking it costs a token refresh, not a read.
 */
import { auth, onAuthStateChanged } from "./firebase-init.js";

let state = { user: null, isAdmin: false, ready: false };
const listeners = new Set();

async function resolveAdmin(user) {
  if (!user) return false;
  const token = await user.getIdTokenResult();
  return Boolean(token.claims.admin);
}

onAuthStateChanged(auth, async (user) => {
  state = { user, isAdmin: await resolveAdmin(user), ready: true };
  listeners.forEach((fn) => fn(state));
});

/** Subscribe to auth/admin changes. Calls fn immediately with current state. */
export function onAuthChange(fn) {
  listeners.add(fn);
  if (state.ready) fn(state);
  return () => listeners.delete(fn);
}

export function getAuthState() {
  return state;
}
