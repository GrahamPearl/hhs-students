/**
 * subjects-catalog.js
 * Loads the canonical subject list from Firestore (/subjects) so the
 * "add subject" control offers consistent names instead of free text.
 * Falls back to names already seen in the roster if the catalog hasn't
 * been populated yet, so editing still works before that cleanup pass.
 */
import { db, collection, getDocs } from "./firebase-init.js";

let cache = null;

export async function getSubjectsCatalog(fallbackRoster = []) {
  if (cache) return cache;

  try {
    const snap = await getDocs(collection(db, "subjects"));
    if (!snap.empty) {
      cache = snap.docs.map((d) => d.data().name || d.id).sort();
      return cache;
    }
  } catch {
    /* collection may not exist yet — fall through to roster-derived list */
  }

  const fromRoster = new Set();
  fallbackRoster.forEach((s) => (s.subjectsSummary || []).forEach((n) => fromRoster.add(n)));
  cache = Array.from(fromRoster).sort();
  return cache;
}
