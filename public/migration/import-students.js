/**
 * migration/import-students.js
 * ----------------------------------------------------------------
 * One-time / repeatable loader: reads students.json (keyed by
 * adminNo, already shaped to match the app's expected schema) and
 * writes each entry to Firestore as students/{adminNo}.
 *
 * Usage:
 *   1. npm install firebase-admin
 *   2. Download a service-account key from Firebase Console
 *      (Project Settings > Service Accounts) and save it as
 *      ./serviceAccountKey.json (keep this OUT of version control).
 *   3. node migration/import-students.js ../students.json
 * ----------------------------------------------------------------
 */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const dataPath = process.argv[2] || path.join(__dirname, "..", "students.json");
const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  const raw = fs.readFileSync(dataPath, "utf8");
  const students = JSON.parse(raw); // { adminNo: {...}, ... }
  const entries = Object.entries(students);

  console.log(`Loaded ${entries.length} students from ${dataPath}`);

  const BATCH_SIZE = 400; // stay under Firestore's 500-op batch limit
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = entries.slice(i, i + BATCH_SIZE);
    chunk.forEach(([adminNo, student]) => {
      batch.set(db.collection("students").doc(String(adminNo)), student, { merge: true });
    });
    await batch.commit();
    console.log(`  committed ${Math.min(i + BATCH_SIZE, entries.length)} / ${entries.length}`);
  }

  console.log("Done.");
}

run().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
