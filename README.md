# Hillcrest Student Lookup

## Structure
```
index.html          structure only
css/style.css        theme (navy / gold / paper, serif + sans)
js/config.js          <-- edit this after deploy (image URL, Firebase keys)
js/firebase-init.js   Firestore connection
js/data-service.js    fetch + cache the roster
js/search.js          pure filter/sort logic
js/render.js          DOM building (table rows, detail drawer)
js/app.js             wires it all together
assets/no-photo.svg   fallback avatar
migration/import-students.js   one-time loader: students.json -> Firestore
```

## First-time setup
1. Create a Firestore database in your Firebase project.
2. Edit `js/config.js`:
   - `FIREBASE_CONFIG` — from Firebase Console > Project Settings > General > "Your apps".
   - `IMAGE_BASE_URL` — where student photos are hosted (GitHub raw URL,
     Firebase Storage public bucket, etc.). This is the one setting most
     likely to change later — editing this file is enough, no rebuild needed.
3. Load the data: `node migration/import-students.js path/to/students.json`
   (needs a service account key — see comment at top of that file).
4. Set Firestore Security Rules to allow read access appropriate for your
   staff (e.g. `allow read: if request.auth != null;` if you add Firebase Auth,
   or public read-only if the site sits behind school network/SSO already).

## Deploying to Firebase Hosting
```
firebase init hosting     # point public dir at this folder
firebase deploy
```

## Adjusting the photo location later
Only `IMAGE_BASE_URL` in `js/config.js` needs to change — e.g. moving from
a GitHub repo to Firebase Storage. No other file references photo paths.
