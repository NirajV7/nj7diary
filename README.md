# nj7diary

Personal logging notebook with a coding terminal aesthetic. Built with Next.js (App Router), Tailwind v4, and Firebase (Firestore). Logs and notes are persisted in Firestore.

## Local development

1. Install deps
```bash
npm install
```
2. Run dev server
```bash
npm run dev
```
Open http://localhost:3000

## Build and deploy to Firebase Hosting
This project is configured for static export (no SSR) and Firebase Hosting.

Prereqs:
- Firebase CLI installed and logged in: `npm i -g firebase-tools` then `firebase login`
- Access to project `nj-terminal-51065`

Build and deploy:
```bash
# build static export to ./out
npm run build:export

# deploy hosting
firebase deploy
# or use the npm script
npm run deploy
```

Hosting config:
- `.firebaserc` points to project `nj-terminal-51065`
- `firebase.json` serves the `out` directory

## Data export
Use the header buttons to download your data as JSON or Markdown.
