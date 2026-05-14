# SmartGuard AI Video Demonstration Script

Target length: 5-7 minutes

## Before Recording

Prepare:

- Backend running at `http://127.0.0.1:5000`
- Frontend running at `http://127.0.0.1:8080/frontend/`
- MetaMask unlocked
- MetaMask set to Sepolia
- Deployer/validator account selected
- `frontend/contractConfig.js` contains the deployed Sepolia contract address and ABI
- Sample contract ready through the `Load Sample` button

## 0:00-0:40 Project Introduction

Say:

> This is SmartGuard AI, an AI-powered smart contract vulnerability detection D-App. It allows users to connect MetaMask, submit Solidity code, scan the contract using Slither, generate AI explanations using Gemini, upload the final report to IPFS, and record the audit lifecycle on Ethereum Sepolia.

Show:

- Frontend homepage
- Wallet area
- Contract input area

## 0:40-1:20 Architecture Overview

Say:

> The system has four parts: a Solidity smart contract, a Flask backend, a vanilla JavaScript frontend, and external services. The smart contract stores audit metadata and status. The backend runs Slither and Gemini. Pinata stores the report on IPFS. The frontend connects everything through MetaMask and ethers.js.

Show:

- Briefly open README architecture section or explain from frontend.

## 1:20-2:10 Smart Contract Flow

Say:

> The important blockchain part is the audit lifecycle. First, the frontend calls `requestAudit()`, which creates an audit with status pending. After the backend finishes analysis and IPFS upload, the frontend calls `completeAudit()`, which changes the status to completed. Optionally, a validator can call `verifyAudit()` later.

Show:

- `contracts/AuditRegistry.sol`
- `AuditStatus`
- `requestAudit()`
- `completeAudit()`

## 2:10-3:40 Live Frontend Demo

Steps:

1. Click `Connect MetaMask`.
2. Confirm wallet connection.
3. Show Sepolia network.
4. Click `Load Sample`.
5. Explain the vulnerable sample includes reentrancy, `tx.origin`, `selfdestruct`, and missing access control.
6. Click `Analyze Contract`.
7. Confirm `requestAudit()` transaction in MetaMask.

Say:

> The first transaction creates the audit on-chain and emits an event containing the audit ID. The frontend extracts this audit ID and sends it with the Solidity code to the Flask backend.

## 3:40-4:40 Backend Processing

Say:

> The backend validates the Solidity input, runs Slither, parses the vulnerabilities, asks Gemini for plain-English explanations and fix suggestions, then uploads the final report to IPFS using Pinata.

Show:

- Loading states on frontend.
- Flask terminal output if visible.

## 4:40-5:40 Completing the Audit

Steps:

1. Confirm `completeAudit()` transaction in MetaMask.
2. Show dashboard after completion.
3. Show vulnerability count.
4. Show severity counts.
5. Open IPFS link.
6. Open Etherscan link.

Say:

> The second transaction completes the audit on-chain. The contract now stores the IPFS hash, vulnerability count, severity, and completed status.

## 5:40-6:30 Testing and Security

Say:

> We used Hardhat for testing and deployment. The tests cover the happy path, duplicate completion edge case, validator access control, and credit transfer. The smart contract uses role modifiers, ReentrancyGuard, Checks-Effects-Interactions, descriptive require messages, and events for auditability.

Show:

- Terminal with `npm test`
- `4 passing`

## 6:30-7:00 Closing

Say:

> In conclusion, SmartGuard AI demonstrates a complete blockchain transaction lifecycle, not only a backend scanner. The blockchain records trusted audit metadata, IPFS stores the full report, and AI makes the security results easier to understand.

End on:

- Final dashboard
- IPFS link
- Etherscan transaction link
