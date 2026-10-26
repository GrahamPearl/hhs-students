const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setStaffClaims(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      awardsApprover: true
    });
    console.log(`Successfully granted admin & awardsApprover claims to ${email}`);
  } catch (err) {
    console.error("Error setting custom claims:", err);
  }
}

// Run for your staff lead email
setStaffClaims("teacher@hhs.co.za");