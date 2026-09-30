# RedLeads

A mobile first lead workspace for Bell and Virgin Plus reps, backed by Firebase Authentication, Cloud Firestore, and Firebase AI Logic.

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL and sign in using the existing Firebase account. `npm run build` checks TypeScript and produces a production bundle. `npm test` checks the PDF table reader with an unfamiliar plan code and the rate-sheet revision grouping.

## Features

- Four step lead wizard with browser speech recognition and typed notes
- Live owner scoped leads, due follow ups, AI heat scoring, and drafted texts
- Shared offer library with manual entry and PDF extraction through Firebase AI Logic
- Activity history, won/lost reasons, analytics, and account settings
- Existing lead records from the earlier Firebase app remain readable

The default model is `gemini-3.5-flash-lite`. Override it with `VITE_FIREBASE_AI_MODEL` in `.env.local` if needed. A local App Check debug token is registered for this browser; it stays in browser storage and is not part of the source code. Before a production deployment, register its domain with reCAPTCHA Enterprise and Firebase App Check, then set `VITE_FIREBASE_APPCHECK_SITE_KEY` to that site's public key for the build.

## Firestore access

The rules are in `firestore.rules`. They keep leads, activity, and user profiles private to their owner. All signed-in users can read the shared offers; only the Firebase account `mustafajafridi@gmail.com` can create, edit, or delete them. The offer manager is matched by Firebase UID in the rules.

## PDF imports

The selected PDF is split into pages in the browser and sent directly to Firebase AI Logic. The model reads each page and generates plan names, descriptions, prices, eligibility, brand, and category. There are no hardcoded plan rows or prices. The importer checks generic SOC and data columns when present, excludes tablets, watches, no-data Basic plans, and other unsupported products, and removes repeated pages. Each completed page is checkpointed locally, so selecting the same file resumes after a failed request.

Saving a reviewed replacement sheet updates matching offers and retires older imported rows from the same named sheet when they disappear. Retired rows remain in Firestore for recovery but are excluded from the live library and scoring. The filename may change its date while still identifying the same sheet. Manual offers and PDFs with different names are left alone. The current Best Buy Express sheet produced 58 distinct Bell and Virgin Plus offers, effective September 18, 2026. Its net Line 1 rates already include the default AutoPay discount; the app does not subtract it again. No PDF is stored in Firebase Storage.

AI extraction can still misread a new rate sheet's prices or eligibility. Review the preview against the source PDF before saving; the app does not send messages to leads automatically.

## Deploy

The `firebase.json` Hosting configuration serves `dist` and rewrites client routes to `index.html`. Build with `npm run build`, then deploy Hosting and the reviewed Firestore rules with the Firebase CLI. Set the App Check site key before building for production.
