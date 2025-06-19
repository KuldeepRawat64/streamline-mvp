// backend/config/firebaseAdmin.js
const admin = require("firebase-admin");
require("dotenv").config(); // Load environment variables from .env

// Path to your service account key file
// In production, use environment variables to store the JSON content directly
const serviceAccount = require("../serviceAccount.json"); // REMEMBER TO CHANGE THIS PATH

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL, // Example: "https://your-project-id.firebaseio.com"
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // Example: "your-project-id.appspot.com"
});

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = { db, auth, storage, admin };
