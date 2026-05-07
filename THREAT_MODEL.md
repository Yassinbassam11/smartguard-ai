# SmartGuard AI Threat Model

## 1. Denial of Service

**Description:** Attackers may submit very large or malformed Solidity contracts to exhaust backend CPU, memory, disk, or Slither runtime.

**Impact:** The scanner API may become unavailable, preventing legitimate users from receiving audit reports.

**Mitigation:** The backend rejects contracts larger than 50KB, requires `pragma solidity`, runs Slither with a 60-second timeout, rate-limits `/analyze`, and deletes temporary files in a `finally` block.

## 2. Private Key Exposure

**Description:** Sepolia deployment keys, Pinata JWTs, and Gemini API keys may be accidentally committed or leaked.

**Impact:** An attacker could deploy contracts from the project wallet, consume API credits, alter validator behavior if they control the owner wallet, or upload unwanted IPFS content.

**Mitigation:** Secrets are loaded from `.env`, `.env` is ignored by Git, `.env.example` contains placeholders only, and deployment should use a funded test wallet rather than a mainnet wallet.

## 3. Invalid Contract Input

**Description:** Users may submit non-Solidity input, incomplete code, or contracts designed to produce malformed scanner output.

**Impact:** The backend could return misleading results, crash, or generate unusable reports.

**Mitigation:** The scanner validates input before running Slither, handles timeouts, Slither failures, and malformed JSON, and the frontend only enables analysis when wallet and source code are present.
