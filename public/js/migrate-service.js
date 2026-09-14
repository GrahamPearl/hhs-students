/**
 * migrate-service.js
 * Commits a diff (toCreate + toUpdate) to Firestore in chunks of
 * 400 writes (under the 500-op batch limit), reporting progress
 * as it goes. Unchanged records are never written — this is the
 * whole point of diffing first: an "update" run only costs writes
 * proportional to what actually changed.
 */
import { db, collection, doc, writeBatch } from "./firebase-init.js";

const CHUNK_SIZE = 400;
const { STUDENTS_COLLECTION } = window.APP_CONFIG;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * @param {Array} changes  array of { adminNo, record }, create + update combined
 * @param {(done: number, total: number) => void} onProgress
 */
export async function commitChanges(changes, onProgress) {
  const chunks = chunk(changes, CHUNK_SIZE);
  let done = 0;

  for (const group of chunks) {
    const batch = writeBatch(db);
    group.forEach(({ adminNo, record }) => {
      batch.set(doc(collection(db, STUDENTS_COLLECTION), String(adminNo)), record, {
        merge: false, // migration is authoritative: replace the doc, don't merge stale fields
      });
    });
    await batch.commit();
    done += group.length;
    onProgress?.(done, changes.length);
  }
}
