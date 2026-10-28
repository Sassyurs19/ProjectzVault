# Project Vault

React + Vite, Firebase Email/Password Auth, Firestore, wagmi/viem, and a Render-ready backend service. Mobile layout, PWA installation, Today view, distinct Profile and Settings screens, account labels, dark mode, and password-free JSON exports.

## Current deployment

- Website: https://projectzvault.web.app
- Firebase project: `projectzvault`.
- Firestore database created and owner-only rules deployed.
- Firebase Email/Password authentication enabled; passwords required. Hosting domains and localhost are authorized.
- The backend is prepared for Render's free service. Until it has a Render URL, live points, linked-wallet verification, live contract loading, and transaction submission remain unavailable. Manual points and account storage work independently.
- WalletConnect project ID is still blank. Injected MetaMask and Binance Wallet connectors are included; cross-browser WalletConnect needs a project ID.

## Run and deploy

```sh
npm ci
npm run dev
npm run build
npx firebase deploy --only hosting,firestore:rules --project projectzvault
```

## Render backend

Deploy this directory through Render's **New → Blueprint** flow after placing the project in a GitHub repository. Render discovers `render.yaml` and creates the free `project-vault-api` service.

1. Select the repository and approve the Blueprint. No payment method or Firebase service-account secret is needed.
2. After the deploy finishes, copy its HTTPS address such as `https://project-vault-api.onrender.com` into `backendUrl` in `src/config.js`.
3. Run `npm run build` and `npx firebase deploy --only hosting --project projectzvault`.
4. Optionally set `BSCSCAN_API_KEY` in Render to enable on-chain history import. It stays on Render, never in the website.

The service checks the signed Firebase ID token with Firebase's public signing keys, accepts requests only from the Firebase-hosted website, and keeps the 10-minute points cache in memory. Free Render instances may sleep while idle, so the first points request can take a short time to wake it. `src/config.js` holds public Firebase web settings, the WalletConnect project ID, backend URL, and RPC URL. Firebase web API keys identify a project; Firestore rules and Firebase Auth enforce access. Do not put service-account keys or wallet keys in this file.

## Authentication and references

Sign up with an email, matching password/confirmation, and required terms checkbox. Log in later with that same email/password. Firebase keeps the session signed in; no verification email is required. Profile contains identity, password-reset email, and logout. Settings contains application preferences and backup export.

Each new account uses a deterministic wallet-address document ID and a Firestore transaction, so the same wallet cannot be created twice if two tabs or phones attempt to add it simultaneously.

Reference passwords use AES-256-GCM with a fresh 128-bit salt, a fresh 96-bit IV, and PBKDF2-SHA256 with 600,000 iterations. The session PIN stays in memory. Use a strong PIN; short numeric PINs have limited entropy. A forgotten PIN cannot be recovered. Exports exclude encrypted passwords and Privy tokens.

## Check-in safety

- No private-key or seed-phrase input or storage. Import an existing wallet into your own wallet app, then connect it.
- Wallet address must match the selected account, and network must be BNB Chain (56).
- The Cloud Function loads `https://dapp.4dlabs.space/api/task/task-config`; the verified address field is `["checkin-contract"].contract_address`. It fails closed if unavailable or malformed. The address in `src/settings.js` is a reference setting, not a silent fallback.
- Before review and again immediately before signing, verify the Privy token's linked wallet, refresh the contract, call `legal_location("ASN")`, simulate the zero-value call, estimate gas, and check BNB balance.
- Show account, wallet, contract, region, network, and estimated gas for approval. Chain state can change after a successful simulation; a simulation cannot guarantee a later transaction succeeds.
- Signing occurs only through the wallet on a deliberate tap. No scheduled or automatic transactions.
- A public pending transaction hash is stored locally per UID/account, so a confirmed transaction can be recovered without resending after a network/storage error.
- Receipt must succeed and match the wallet, contract, calldata, and zero value. Save the UTC date derived from its block timestamp after two confirmations. Firestore transaction de-duplicates check-ins.
- The interface locks the check-in button while a request is preparing or awaiting a wallet. A second browser or phone can still independently prompt a signature; the 4D Labs contract and its fresh pre-send simulation remain the final protection against a duplicate on-chain check-in.
- Leaving an account disconnects the wallet. UTC reset is 5:30 AM IST.

## 4D Labs points and linked wallets

An optional per-account Privy token field is session-only. A valid token is required to verify wallet linkage before sending a check-in. Connecting MetaMask does not create a Privy session. Obtain the token from your own existing 4D Labs session; Project Vault does not impersonate or automate their login.

The Render API requires Firebase authentication, verifies `/api/profile/linked-accounts`, fetches `/api/rank/me-by-season?season_phase=S1`, and caches points for 10 minutes in process memory. Token expiry or unfamiliar API response formats produce a visible fallback. Tokens are never stored or logged. Points parsing supports `score`, `total_score`, `totalScore`, `points`, and `season_score` on the top-level/data/rank objects. Private response formats require validation with a real user token; none was provided during development.

Manual points are separate from the estimate: 5 per distinct check-in day plus 10 on every seventh consecutive day. Other rewards are excluded.

## Optional on-chain history

The Render API supports importing indexed `CheckIn(address,string)` events for the selected wallet and live contract through the Etherscan V2 API for BNB Chain (BscScan data). Set `BSCSCAN_API_KEY` in the Render environment; the API plan must support chain 56. Keep this key server-side. Imports accept only ASN events and de-duplicate by day/transaction. Historical contracts require an explicit adapter extension; the import currently follows the live contract.

## PWA and reminders

The manifest includes 192/512px icons and standalone display. Add to Home Screen from a phone browser. The service worker caches only an offline notice, never account/API responses or credentials. Check-ins need an internet connection. Background evening push reminders are not implemented: they require a separate push delivery/scheduling service and notification consent. No reminders are presented as active.

## Validation

- Production Vite build passed.
- Seven automated tests passed: UTC/IST reset, streak gaps and duplicates, repeated bonuses, AES-GCM wrong PIN/tamper rejection, fresh randomness, and exact `checkIn(string)` selector/ASN encoding.
- Five Firebase emulator rules tests passed: owner operations allowed; cross-user and unauthenticated operations rejected; malformed data/plaintext secret fields rejected; client cache writes and wallet identity changes rejected.
- Live task-config response verified.
- Hosted login and sign-up fields/terms visually verified; responsive layout inspected at phone width.
- No real wallet was connected or transaction signed during testing. Android MetaMask/Binance end-to-end signing still requires user-device testing.
- Render backend dependencies installed and reported no advisories. Frontend transitive wallet packages still include Zod 3 advisories; an automatic major-version override was deliberately avoided because it could break wallet validation. Review upstream connector updates before treating this as an audited financial application.

```sh
npm test
# Java 21+ required for the Firestore emulator:
npm run test:rules
```

WalletConnect, explorer API key, Render deployment URL, and optional push delivery remain setup items. Start with the single 4D Labs project and no accounts.
