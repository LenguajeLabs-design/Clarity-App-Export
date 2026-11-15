for (const suffix of ["API_KEY", "AUTH_DOMAIN", "PROJECT_ID", "STORAGE_BUCKET", "MESSAGING_SENDER_ID", "APP_ID"]) {
  const name = `VITE_FIREBASE_${suffix}`;
  if (!process.env[name]?.trim()) throw new Error(`Missing public Firebase configuration: ${name}`);
}
if (process.env.VITE_FIREBASE_PROJECT_ID !== "my-notes-e2010") {
  throw new Error("Migration must retain the existing Firebase project my-notes-e2010.");
}
if (process.env.VITE_FIREBASE_AUTH_DOMAIN !== "my-notes-e2010.firebaseapp.com") {
  throw new Error("Migration must retain the existing Firebase authentication domain.");
}
console.log("Existing Firebase project configuration verified. No values printed.");
