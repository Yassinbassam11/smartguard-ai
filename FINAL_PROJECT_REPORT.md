# SmartGuard AI Final Project Report

Course: AID 325 Blockchain Technology  
Instructors: Dr. Muhammad Hataba, Eng Salma Walid  
Project Title: SmartGuard AI  
Team Members:

- Yassin Bassam (320230141)
- Mohamed Hani (320230150)
- Yousef Hamed (320230192)

## 1. Project Description

SmartGuard AI is an AI-powered decentralized application for smart contract vulnerability detection. The project solves a common blockchain development problem: developers often deploy smart contracts without understanding security risks such as reentrancy, unsafe authorization, or dangerous Solidity patterns.

The application allows a user to connect MetaMask, submit Solidity source code, create an on-chain audit request, scan the code using Slither, receive AI-generated explanations using Google Gemini, upload the final report to IPFS through Pinata, and complete the audit lifecycle on Ethereum Sepolia.

The key idea is to combine blockchain transparency with automated security analysis. The blockchain stores audit metadata and lifecycle state, while IPFS stores the full report.

## 2. Motivation and Real-World Problem

Smart contracts are difficult to patch after deployment. A small mistake can cause loss of funds, broken access control, or permanent contract failure. Many beginner developers also struggle to understand static analysis output because tools like Slither can produce technical findings.

SmartGuard AI addresses this by:

- Detecting Solidity vulnerabilities using Slither.
- Explaining findings in plain language using Gemini AI.
- Recording audit metadata on Sepolia for transparency.
- Storing detailed reports permanently on IPFS.
- Showing users a clear dashboard with severity counts and remediation suggestions.

## 3. System Architecture

The system has four layers:

### Smart Contract Layer

The smart contract `AuditRegistry.sol` stores audit metadata and manages audit lifecycle transitions. It records the audit requester, timestamp, IPFS hash, vulnerability count, severity, and status.

Audit statuses are:

- `PENDING`
- `COMPLETED`
- `VERIFIED`

### Backend Layer

The Flask backend exposes:

- `POST /analyze`
- `GET /health`

The backend receives Solidity code, validates it, runs Slither, sends findings to Gemini, uploads the final report to Pinata/IPFS, and returns normalized results to the frontend.

### Frontend Layer

The frontend is built with HTML, CSS, and vanilla JavaScript. It uses ethers.js v6 to connect to MetaMask and call smart contract functions.

The frontend handles:

- Wallet connection
- Sepolia network validation
- Contract submission
- Transaction lifecycle
- Backend communication
- Results dashboard
- IPFS and Etherscan links

### Storage Layer

The project uses two storage systems:

- Ethereum Sepolia stores audit metadata and state transitions.
- IPFS stores the full JSON audit report.

## 4. Data Model

The main on-chain struct is:

```solidity
struct Audit {
    uint256 id;
    address requester;
    uint256 timestamp;
    string ipfsHash;
    AuditStatus status;
    uint8 vulnerabilityCount;
    string severity;
}
```

Important mappings:

```solidity
mapping(uint256 => Audit) public audits;
mapping(address => uint256[]) public auditsByAddress;
mapping(address => uint256) public securityCredits;
```

These mappings allow efficient lookup of audit records, user audit history, and internal credit balances.

## 5. Blockchain Workflow

The full transaction flow is:

1. User connects MetaMask.
2. User enters Solidity code.
3. Frontend calls `requestAudit()` on Sepolia.
4. Smart contract creates an audit with status `PENDING`.
5. Contract emits `AuditRequested`.
6. Frontend extracts the audit ID from the transaction receipt.
7. Frontend sends audit ID and Solidity code to Flask backend.
8. Backend runs Slither.
9. Backend asks Gemini to explain findings.
10. Backend uploads the report to IPFS.
11. Backend returns IPFS hash, severity, and vulnerability count.
12. Frontend calls `completeAudit()`.
13. Smart contract changes status from `PENDING` to `COMPLETED`.
14. Frontend displays results, transaction hash, IPFS link, and Etherscan link.
15. Optional: validator calls `verifyAudit()` to change status to `VERIFIED`.

This demonstrates a real state-dependent blockchain workflow rather than a frontend-only audit tool.

## 6. Smart Contract Security Analysis

### Access Control

The contract uses:

- `onlyOwner`
- `onlyValidator`
- `auditExists`

Only the validator can complete or verify audits. Only the owner can change the validator.

### Reentrancy Protection

The contract inherits from OpenZeppelin `ReentrancyGuard`. The `transferCredits()` function uses `nonReentrant`.

### Checks-Effects-Interactions

Functions update internal state before completing execution. The credit transfer function checks balances first, updates balances second, and emits the event after state changes.

### Exception Handling

The contract uses descriptive `require()` messages such as:

- `AuditRegistry: caller is not the owner`
- `AuditRegistry: caller is not the validator`
- `AuditRegistry: audit does not exist`
- `Audit must be pending`
- `AuditRegistry: insufficient credits`

### Events

Events are emitted for audit request, completion, verification, credit awards, credit transfers, credit spending, and validator changes.

## 7. Asset Standard Choice

The project uses Choice C from the specification: a custom internal credit system.

Users earn `CREDITS_PER_AUDIT` when they request an audit. The current award is 10 credits. The user can then choose optional paid services: 5 credits with `spendCreditsForAdvancedAudit()` for Gemini AI explanations, and 3 credits with `spendCreditsForPdfReport()` for a human-readable PDF report. This makes the credits useful inside the platform instead of being only a display balance.

Credit balances are tracked in:

```solidity
mapping(address => uint256) public securityCredits;
```

The contract provides:

- `balanceOf(address)`
- `transferCredits(address,uint256)`
- `spendCreditsForAdvancedAudit(uint256)`
- `spendCreditsForPdfReport(uint256)`

This demonstrates secure internal asset accounting, transfer logic, and service payment logic without deploying a separate ERC20 token.

## 8. Testing

The project uses Hardhat for automated testing.

Tests implemented:

1. Happy path:
   - Request audit.
   - Confirm status is `PENDING`.
   - Complete audit.
   - Confirm status is `COMPLETED`.

2. Edge case:
   - Attempt to complete the same audit twice.
   - Contract reverts with `Audit must be pending`.

3. Access control:
   - Non-validator attempts to complete an audit.
   - Contract reverts with `AuditRegistry: caller is not the validator`.

4. Credit transfer:
   - User receives credits.
   - User transfers credits.
   - Balances update correctly.

5. Credit spending:
   - User receives 10 credits after requesting an audit.
   - User spends 5 credits for the advanced AI audit report.
   - User spends 3 credits for the PDF report.
   - Remaining balance and credits spent per audit update correctly.

Test command:

```powershell
npm test
```

Current result:

```text
4 passing
```

## 9. Deployment

The project uses Hardhat and Sepolia.

Deployment command:

```powershell
npm run deploy:sepolia
```

The deployment script:

- Deploys `AuditRegistry`.
- Waits for deployment confirmation.
- Sets validator to deployer.
- Writes contract address and ABI to `frontend/contractConfig.js`.

Deployed contract address:

```text
0x3746cd9b95E51D4343F32e6a13fd180a6c8d66A3
```

## 10. Gas Efficiency

Gas reporting is enabled using `hardhat-gas-reporter`.

Gas optimization choices:

- `deployer` is immutable.
- `CREDITS_PER_AUDIT` is constant.
- Structs and mappings are used for efficient storage.
- Full audit reports are not stored on-chain.
- Only the IPFS hash and summary metadata are stored on-chain.

The generated gas report is available in:

```text
gas-report.txt
```

## 11. Backend Security

The backend includes:

- Solidity pragma validation.
- 50KB maximum contract size.
- Slither timeout.
- Malformed JSON handling.
- Temporary file cleanup.
- Flask-Limiter rate limiting.
- Safe fallback explanation if Gemini output cannot be parsed.

## 12. Threat Model Summary

Main threats:

1. Denial of Service
   - Mitigated by input size limit, timeout, and rate limiting.

2. Private Key Exposure
   - Mitigated by `.env`, `.gitignore`, and `.env.example`.

3. Invalid Contract Input
   - Mitigated by input validation and scanner error handling.

The full threat model is in `THREAT_MODEL.md`.

## 13. Conclusion

SmartGuard AI satisfies the main technical requirements of the final project. It uses Solidity smart contract logic, state-dependent transitions, Hardhat testing and deployment, MetaMask wallet integration, transaction feedback, a custom internal credit asset system, gas reporting, NatSpec documentation, and threat modeling.

The project demonstrates how blockchain can be combined with AI and static analysis to create a transparent and useful security auditing workflow for smart contract developers.

