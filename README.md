# SmartGuard AI

SmartGuard AI is a full-stack decentralized application for AI-assisted smart contract vulnerability detection. It lets a user connect MetaMask, submit Solidity source code, create an audit record on Ethereum Sepolia, scan the contract with Slither, enrich the findings with Google Gemini, store the final audit report on IPFS through Pinata, and then complete the audit record on-chain.

This project was built for the AID 325 Blockchain Technology course.

## Team

- Yassin Bassam (320230141)
- Mohamed Hani (320230150)
- Yousef Hamed (320230192)

## Main Features

- MetaMask wallet connection
- Sepolia testnet integration
- On-chain audit lifecycle using `requestAudit()`, `completeAudit()`, and `verifyAudit()`
- Solidity vulnerability scanning with Slither
- Optional AI explanations and fix suggestions using Gemini
- Optional human-readable PDF report generation
- Permanent report storage on IPFS using Pinata
- Audit dashboard with vulnerability statistics
- Etherscan transaction links
- Downloadable JSON audit report
- Hardhat tests and gas reporting
- Threat model documentation

## Submission Support Files

- `SUBMISSION_CHECKLIST.md`: maps the project to the AID 325 technical specification.
- `FINAL_PROJECT_REPORT.md`: draft content for the final Word/PDF report.
- `PRESENTATION_SLIDES.md`: slide-by-slide plan for the discussion presentation.
- `VIDEO_DEMO_SCRIPT.md`: 5-7 minute video demonstration script.
- `THREAT_MODEL.md`: adversarial model and mitigations.

## Project Structure

```text
smartguard-ai/
|-- contracts/
|   `-- AuditRegistry.sol
|-- scripts/
|   `-- deploy.js
|-- test/
|   |-- AuditRegistry.test.js
|   `-- sample_contracts/
|       `-- vulnerable_demo.sol
|-- backend/
|   |-- app.py
|   |-- scanner.py
|   |-- ai_explain.py
|   |-- ipfs_upload.py
|   `-- requirements.txt
|-- frontend/
|   |-- index.html
|   |-- style.css
|   |-- app.js
|   `-- contractConfig.js
|-- THREAT_MODEL.md
|-- FINAL_PROJECT_REPORT.md
|-- PRESENTATION_SLIDES.md
|-- VIDEO_DEMO_SCRIPT.md
|-- SUBMISSION_CHECKLIST.md
|-- README.md
|-- hardhat.config.js
|-- package.json
|-- .env.example
`-- .gitignore
```

## Architecture

SmartGuard AI has four main parts:

- Smart contract: `AuditRegistry.sol` stores audit metadata, requester addresses, IPFS hashes, audit status, vulnerability counts, severity, and security credits.
- Backend: Flask receives Solidity code, runs Slither, asks Gemini for explanations, uploads the report to Pinata/IPFS, and returns normalized results.
- Frontend: Vanilla HTML, CSS, and JavaScript connect to MetaMask through ethers.js v6 and guide the user through the audit flow.
- Blockchain network: Ethereum Sepolia records the audit request and completion transactions.

## Audit Lifecycle

The project demonstrates state-dependent blockchain transitions:

1. User connects MetaMask.
2. User submits Solidity code.
3. Frontend calls `requestAudit()` on-chain.
4. Smart contract creates a new audit with status `PENDING`.
5. Frontend extracts the audit ID from the `AuditRequested` event.
6. Frontend sends the audit ID and Solidity code to the Flask backend.
7. User optionally spends 5 credits to unlock advanced Gemini AI explanations.
8. User optionally spends 3 credits to unlock a human-readable PDF report.
9. Backend runs Slither static analysis.
10. If advanced AI is selected, backend asks Gemini to explain each vulnerability.
11. Backend uploads the full JSON report to IPFS using Pinata.
12. Backend returns vulnerabilities, IPFS hash, highest severity, and vulnerability count.
13. Frontend calls `completeAudit()` on-chain.
14. Smart contract changes status from `PENDING` to `COMPLETED`.
15. Optional validator action can call `verifyAudit()` to change status from `COMPLETED` to `VERIFIED`.
16. Frontend displays the audit report, transaction hash, Etherscan link, IPFS link, credit usage, and vulnerability statistics.

## Security Design

The Solidity contract includes:

- `onlyOwner` access control
- `onlyValidator` access control
- `nonReentrant` protection for credit transfers and credit spending
- Checks-Effects-Interactions pattern
- Immutable deployer address
- Constant credit award, advanced audit cost, and PDF report cost
- Descriptive `require()` messages
- State-dependent transitions: `PENDING -> COMPLETED -> VERIFIED`
- Events for important state-changing actions

The backend includes:

- 50KB maximum contract size
- Solidity pragma validation
- Slither timeout handling
- Malformed JSON handling
- Temporary file cleanup
- Flask-Limiter rate limiting
- Safe error responses

More details are in `THREAT_MODEL.md`.

## Internal Credit System

SmartGuard AI uses Choice C from the asset standards requirement: a custom internal credit system.

- Users can see their credit balance before analysis in the wallet panel.
- Users receive 10 security credits when they call `requestAudit()`.
- Advanced AI explanations are optional and cost 5 credits through `spendCreditsForAdvancedAudit()`.
- A human-readable PDF report is optional and costs 3 credits through `spendCreditsForPdfReport()`.
- Users can check their balance with `balanceOf(address)`.
- Users can transfer credits to another wallet with `transferCredits(address,uint256)`.

This gives credits real project uses: they work like internal reward points that can be spent on optional SmartGuard AI services.

## Requirements

Install these before running the project:

- Node.js 18 or newer
- Python 3.10 or newer
- MetaMask browser extension
- Sepolia ETH in the deployment wallet
- Google Gemini API key
- Pinata JWT
- Alchemy Sepolia RPC URL
- Slither Analyzer

## Environment Variables

Create a `.env` file in the project root:

```powershell
cd "D:\Yassin Bassam\Projects\smartguard-ai"
copy .env.example .env
notepad .env
```

Fill it with your real values:

```env
GEMINI_API_KEY=your_gemini_api_key
PINATA_JWT=your_pinata_jwt
ALCHEMY_URL=https://eth-sepolia.g.alchemy.com/v2/your_alchemy_key
PRIVATE_KEY=0xyour_64_character_test_wallet_private_key
```

Important: use a Sepolia test wallet only. Never use a mainnet wallet private key in this project.

## First-Time Setup

Run these commands from the project root:

```powershell
cd "D:\Yassin Bassam\Projects\smartguard-ai"
npm install
```

Set up the Python backend:

```powershell
cd "D:\Yassin Bassam\Projects\smartguard-ai\backend"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Install Slither if it is not already available:

```powershell
pip install slither-analyzer
```

Check that Slither is available:

```powershell
slither --version
```

## Deploy the Smart Contract

Before using the frontend, deploy the contract to Sepolia:

```powershell
cd "D:\Yassin Bassam\Projects\smartguard-ai"
npm run deploy:sepolia
```

The deploy script will:

- Deploy `AuditRegistry`
- Wait for deployment confirmation
- Set the validator to the deployer address
- Write the deployed contract address and ABI into `frontend/contractConfig.js`

If the frontend says `Deploy the contract first`, it means this step has not completed successfully yet.

## Start the Project

You need two terminals: one for the backend and one for the frontend.

### Terminal 1: Start Backend

```powershell
cd "D:\Yassin Bassam\Projects\smartguard-ai\backend"
.\.venv\Scripts\activate
python app.py
```

The backend runs at:

```text
http://127.0.0.1:5000
```

Check backend health:

```powershell
curl http://127.0.0.1:5000/health
```

Expected response:

```json
{
  "status": "ok",
  "slither": true,
  "gemini": true
}
```

### Terminal 2: Start Frontend

```powershell
cd "D:\Yassin Bassam\Projects\smartguard-ai"
python -m http.server 8080
```

Open this URL in Chrome or Edge with MetaMask installed:

```text
http://127.0.0.1:8080/frontend/
```

Do not open `index.html` by double-clicking it. The sample contract loader and browser security rules work best when served through `http://127.0.0.1:8080`.

## How to Use the App

1. Open `http://127.0.0.1:8080/frontend/`.
2. Unlock MetaMask.
3. Switch MetaMask to Sepolia.
4. Click `Connect MetaMask`.
5. Click `Load Sample` or paste your own Solidity contract.
6. Click `Analyze Contract`.
7. Confirm the `requestAudit()` transaction in MetaMask.
8. Wait for Slither, Gemini, and IPFS processing.
9. Confirm the `completeAudit()` transaction in MetaMask.
10. View the vulnerabilities, severity counts, IPFS link, and Etherscan transaction link.
11. Click `Download Report` if you want a local JSON copy.

The connected wallet must be the validator to call `completeAudit()`. By default, the deploy script sets the deployer wallet as the validator, so use the same MetaMask account that deployed the contract.

## Running Tests

Run the Hardhat test suite:

```powershell
cd "D:\Yassin Bassam\Projects\smartguard-ai"
npm test
```

The tests cover:

- Requesting an audit and completing it
- Preventing duplicate completion
- Blocking non-validator completion
- Transferring security credits
- Spending credits for optional advanced AI and PDF report services

## Gas Report

Gas reporting is enabled in `hardhat.config.js`.

Running tests creates:

```text
gas-report.txt
```

This file shows gas usage for deployment and contract function calls.

## Backend API

### `GET /health`

Checks whether Slither is installed and whether the Gemini key is configured.

### `POST /analyze`

Request:

```json
{
  "audit_id": 1,
  "code": "pragma solidity ^0.8.20; contract Example {}"
}
```

Response:

```json
{
  "success": true,
  "audit_id": 1,
  "vulnerabilities": [],
  "total_issues": 0,
  "highest_severity": "Informational",
  "ipfs_hash": "Qm...",
  "ipfs_url": "https://gateway.pinata.cloud/ipfs/Qm..."
}
```

## Troubleshooting

### MetaMask says it is required

Open the frontend in Chrome or Edge with the MetaMask extension installed and unlocked. The Codex preview browser does not provide MetaMask.

### Unknown network or wrong network warning

Switch MetaMask to Sepolia. The required chain ID is:

```text
11155111
```

### Deploy the contract first warning

Run:

```powershell
npm run deploy:sepolia
```

Then refresh the frontend page.

### Private key too short

The `.env` file needs a real private key, not a wallet address. It should look like:

```env
PRIVATE_KEY=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

### `PINATA_JWT is not configured`

Make sure `.env` is in the project root:

```text
D:\Yassin Bassam\Projects\smartguard-ai\.env
```

Then restart the Flask backend.

### Slither is false in `/health`

Install Slither inside the active Python environment:

```powershell
cd "D:\Yassin Bassam\Projects\smartguard-ai\backend"
.\.venv\Scripts\activate
pip install slither-analyzer
```

Then restart the backend.

## Important Security Note

API keys and private keys must never be committed to GitHub or shared publicly. If a key is exposed, revoke it and create a new one.

Use `.env` for real secrets and keep `.env.example` as placeholders only.

