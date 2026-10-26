const admin = require("firebase-admin");
// Initialize with your admin service account credentials
admin.initializeApp();

async function grantApproverAccess(email) {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, {
    admin: true,
    awardsApprover: true
  });
  console.log(`Claims granted to ${email}`);
}

grantApproverAccess("teacher@hhs.co.za");