/**
 * student-edit-service.js
 * Writes a single student's edits inside a transaction: re-reads the
 * latest doc, aborts if it has changed since the drawer was opened
 * (optimistic concurrency), then writes the update and an audit log
 * entry together so they can never end up out of sync.
 */
import { db, doc, collection, runTransaction, serverTimestamp } from "./firebase-init.js";
import { stableStringify, describeChanges } from "./migrate-parse.js";

const { STUDENTS_COLLECTION } = window.APP_CONFIG;

/**
 * @param {Object} params
 * @param {string} params.adminNo
 * @param {Object} params.original       student doc as loaded when the drawer opened
 * @param {Object} params.updatedRecord  full record to write (from edit-form.buildUpdatedRecord)
 * @param {Object} params.adminUser      Firebase Auth user performing the edit
 */
export async function saveStudentEdits({ adminNo, original, updatedRecord, adminUser }) {
  const studentRef = doc(collection(db, STUDENTS_COLLECTION), String(adminNo));
  const auditRef = doc(collection(db, "auditLog"));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(studentRef);
    if (!snap.exists()) {
      throw new Error("This student record no longer exists.");
    }
    const latest = snap.data();
    if (stableStringify(latest) !== stableStringify(original)) {
      throw new Error(
        "This record was changed by someone else since you opened it. Close and reopen to see the latest version.",
      );
    }

    const changes = describeChanges(latest, updatedRecord);
    tx.set(studentRef, updatedRecord, { merge: false });
    tx.set(auditRef, {
      adminNo: String(adminNo),
      adminUid: adminUser.uid,
      adminEmail: adminUser.email,
      changes,
      timestamp: serverTimestamp(),
    });
  });

  return updatedRecord;
}
