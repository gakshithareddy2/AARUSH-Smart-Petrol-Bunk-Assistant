# AARUSH – Smart Petrol Bunk Assistant

Updated React + Vite application with a public landing page using the supplied AARUSH logo, a petrol-station hero image, feature overview, “How it works” steps, and a quick “How to use AARUSH” guide. The secure application workspace remains available after login.

## Public landing page

- The root URL (`/`) opens the AARUSH welcome page.
- The supplied illustrated AARUSH logo is used in the navigation and login screen.
- The page explains the available modules, how the workflow works, and how staff can use the system.
- The Login button opens `/login`.

## Included pages

- Login (Firebase Authentication, at `/login`)
- Dashboard
- Fuel Tracker
- Calculator
- Reports (existing PDF/Excel features retained)
- Attendance and leave workspace
- AI Image Analyzer (new)

All authenticated staff/manager accounts use the same navigation and page access. Existing Firebase user records and report data are retained. No customer credit, payments/accounts, or inventory modules have been added.

## Run in VS Code

1. Install Node.js (LTS).
2. Open this project folder in VS Code.
3. Open Terminal and run:

   ```bash
   npm install
   npm run dev
   ```

4. Open the local URL printed by Vite.

## Gmail access restriction

Copy `.env.example` to `.env` and set `VITE_ALLOWED_EMAILS` to the authorised Gmail address (or comma-separated addresses). Leave it blank to use Firebase Authentication without an additional email allowlist. Restart Vite after changing `.env`.

Firebase Authentication and Firestore must be configured for the project. Existing users still need a matching `users/{uid}` Firestore document because the current application uses that document for account details.

## AI Image Analyzer setup and limitation

The page supports image upload/camera capture, preview, editable extracted text, numeric summaries (sum and average), and saving the review locally on the device. **Automatic AI understanding/OCR is not active by default.** To enable it, configure `VITE_IMAGE_ANALYSIS_ENDPOINT` to a secure server endpoint that accepts `multipart/form-data` with an `image` field and returns JSON. The UI reads `text`, `description`, or `analysis` from the response and displays the returned data.

Do not put a Gemini/OpenAI secret key in frontend code or a `VITE_` variable. Keep provider credentials on the server and call the provider from the secure backend.

## Android / Capacitor

After installing dependencies and building the web app, run:

```bash
npm run build
npx cap sync android
npx cap open android
```

The generated `dist` folder is recreated by `npm run build`; it is intentionally not included as a stale prebuilt bundle.

## Admin account and staff registration setup

The predefined administrator email for this AARUSH project is `urreddy978@gmail.com`. The administrator is **not** created through the staff registration form. For security, the administrator password is not hard-coded into the React source code or included in this ZIP.

### Create the administrator in Firebase

1. Open the Firebase Console for project `fuel-station-70c82`.
2. Go to **Authentication → Users → Add user**.
3. Create the user with `urreddy978@gmail.com` and set a strong password privately. Do not put the password in source code or share it in screenshots.
4. Copy the new user's **UID**.
5. Go to **Firestore Database → Data** and create a collection named `users` if it does not exist.
6. Create a document whose document ID is exactly the Authentication UID. Add these fields:
   - `uid` (string): the Authentication UID
   - `name` (string): `Admin`
   - `email` (string): `urreddy978@gmail.com`
   - `role` (string): `admin`
   - `approved` (boolean): `true`
7. Sign in through the AARUSH Login page with the admin email and the password you set in Firebase.

### Staff registration

Staff can use **New staff member? Register** to create an account. New staff are saved with role `staff` and `approved: false`; they cannot sign in until an administrator changes their `approved` field to `true` in the matching `users/{uid}` Firestore document.

### Security reminder

The frontend checks the user's Firebase Authentication identity and Firestore role/approval record. Before deploying this app for real use, configure Firestore Security Rules so users cannot edit their own `role` or `approved` fields; only the administrator should be able to approve staff or change roles. Never store passwords in Firestore, `.env` files, or frontend code.

## Firebase setup

This project is configured to use the AARUSH Firebase project in `src/firebase.js`. In the Firebase Console, enable **Authentication → Email/Password** and create a Cloud Firestore database. Create the administrator's Firestore profile at `users/{AUTH_UID}` with `role: "admin"`, and ensure its email is the configured administrator email in `src/App.jsx`. Staff registration creates a `users/{AUTH_UID}` profile with `role: "staff"` and `approved: false`; the administrator must approve the staff profile in Firestore by setting `approved: true` before the staff member can sign in.

Configure Firestore security rules before using real station data. Do not use open rules such as `allow read, write: if true`. Restrict access to authenticated users and validate roles/ownership in rules appropriate to your deployment.

Optional environment settings are documented in `.env.example`. `VITE_ALLOWED_EMAILS` can restrict sign-in to a comma-separated allowlist. `VITE_IMAGE_ANALYSIS_ENDPOINT` can point to a separately hosted image-analysis service; without it, the image analyzer provides upload/preview and manual numeric review rather than claiming automatic image understanding.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`. If using the Android wrapper, run `npx cap sync android` after building the web app.
