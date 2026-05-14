# SmartGuard AI Presentation Slide Plan

Target length: 8-10 slides  
Discussion date: Monday, 18 May  
Goal: Explain the project clearly and prove that each team member understands the technical workflow.

## Slide 1: Title

Title: SmartGuard AI  
Subtitle: AI-Powered Smart Contract Vulnerability Detection D-App  
Course: AID 325 Blockchain Technology  
Team:

- Yassin Bassam
- Mohamed Hani
- Yousef Hamed

Speaker note:

Introduce the idea in one sentence: SmartGuard AI audits Solidity contracts using Slither and Gemini, stores reports on IPFS, and records audit metadata on Sepolia.

## Slide 2: Problem and Motivation

Main points:

- Smart contracts are hard to fix after deployment.
- Security mistakes can cause major financial loss.
- Static analysis tools are useful but often technical.
- Developers need both detection and understandable explanations.

Speaker note:

Explain that the project is not only a scanner; it also connects the scanner result to blockchain transparency and AI explanations.

## Slide 3: Solution Overview

Main points:

- User connects MetaMask.
- User submits Solidity code.
- Smart contract creates an audit request on Sepolia.
- Backend scans with Slither.
- Gemini explains findings.
- Report is uploaded to IPFS.
- Smart contract records final IPFS hash and status.

Speaker note:

Emphasize the complete lifecycle from wallet transaction to audit dashboard.

## Slide 4: Architecture

Suggested diagram:

```text
Frontend + MetaMask
        |
        | ethers.js transactions
        v
AuditRegistry on Sepolia
        |
        | audit ID + Solidity code
        v
Flask Backend -> Slither -> Gemini -> Pinata/IPFS
        |
        | vulnerabilities + IPFS hash
        v
Frontend Dashboard
```

Speaker note:

Explain the separation of responsibilities: blockchain for trusted metadata, backend for heavy analysis, IPFS for report storage, frontend for user interaction.

## Slide 5: Smart Contract Design

Main points:

- Contract: `AuditRegistry.sol`
- Main struct: `Audit`
- Main statuses:
  - `PENDING`
  - `COMPLETED`
  - `VERIFIED`
- Main functions:
  - `requestAudit()`
  - `completeAudit()`
  - `verifyAudit()`
  - `transferCredits()`
  - `spendCreditsForAdvancedAudit()`
  - `spendCreditsForPdfReport()`

Speaker note:

Explain that `requestAudit()` starts the lifecycle and `completeAudit()` finalizes it after backend processing.

## Slide 6: Security Features

Main points:

- `onlyOwner`
- `onlyValidator`
- `ReentrancyGuard`
- Checks-Effects-Interactions
- Descriptive `require()` messages
- Events for off-chain auditability
- Internal credit system with `balanceOf()` and `transferCredits()`
- Credits are spent for optional advanced AI explanations and PDF reports

Speaker note:

Connect this slide directly to the rubric requirements.

## Slide 7: Backend AI and IPFS Flow

Main points:

- Flask receives audit ID and Solidity code.
- `scanner.py` runs Slither.
- `ai_explain.py` uses Gemini.
- `ipfs_upload.py` uploads report to Pinata.
- Backend returns vulnerability list and IPFS hash.

Speaker note:

Explain that Slither detects, Gemini explains, and IPFS preserves the report.

## Slide 8: Testing and Deployment

Main points:

- Framework: Hardhat
- Tests:
  - Happy path
  - Duplicate completion edge case
  - Access control
  - Credit transfer
  - Credit spending
- Deployment network: Sepolia
- Gas report generated with `hardhat-gas-reporter`

Speaker note:

Mention that `npm test` currently gives 4 passing tests.

## Slide 9: Live Demo Plan

Main points:

1. Open frontend.
2. Connect MetaMask.
3. Load sample vulnerable contract.
4. Click Analyze.
5. Confirm `requestAudit()` transaction.
6. Wait for backend scan.
7. Confirm `completeAudit()` transaction.
8. Show dashboard, IPFS link, and Etherscan link.

Speaker note:

This slide prepares the audience for the live demonstration.

## Slide 10: Conclusion

Main points:

- SmartGuard AI combines blockchain, AI, and security analysis.
- Blockchain records audit lifecycle.
- IPFS stores full reports.
- Gemini makes findings understandable.
- Hardhat provides professional development workflow.

Speaker note:

End by saying the project demonstrates a real transaction lifecycle, not just a normal web app with wallet login.
