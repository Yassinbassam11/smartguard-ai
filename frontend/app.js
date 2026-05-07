const REQUIRED_CHAIN_ID_DEC = 11155111;
const REQUIRED_CHAIN_ID_HEX = "0xaa36a7";
const BACKEND_URL = "http://127.0.0.1:5000";
const SAMPLE_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VulnerableDemo {
    mapping(address => uint256) public balances;
    address public owner;

    constructor() payable {
        owner = msg.sender;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance");

        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Transfer failed");

        balances[msg.sender] = 0;
    }

    function privilegedWithdraw(address payable to) external {
        require(tx.origin == owner, "Not owner");
        to.transfer(address(this).balance);
    }

    function destroy(address payable receiver) external {
        selfdestruct(receiver);
    }

    function drain(address payable receiver) external {
        receiver.transfer(address(this).balance);
    }
}`;

let provider;
let signer;
let contract;
let connectedAddress;
let latestReport;

const connectWalletBtn = document.getElementById("connectWalletBtn");
const walletAddress = document.getElementById("walletAddress");
const networkName = document.getElementById("networkName");
const networkWarning = document.getElementById("networkWarning");
const contractCode = document.getElementById("contractCode");
const charCount = document.getElementById("charCount");
const loadSampleBtn = document.getElementById("loadSampleBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const progressItems = Array.from(document.querySelectorAll("#progressList li"));
const resultsDashboard = document.getElementById("resultsDashboard");
const vulnerabilityList = document.getElementById("vulnerabilityList");
const downloadReportBtn = document.getElementById("downloadReportBtn");

connectWalletBtn.addEventListener("click", connectWallet);
loadSampleBtn.addEventListener("click", loadSampleContract);
contractCode.addEventListener("input", updateFormState);
analyzeBtn.addEventListener("click", analyzeContract);
downloadReportBtn.addEventListener("click", downloadReport);

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => {
    connectWallet();
  });

  window.ethereum.on("chainChanged", () => {
    connectWallet();
  });
}

updateFormState();

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask is required to use SmartGuard AI.");
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  connectedAddress = await signer.getAddress();

  const network = await provider.getNetwork();
  walletAddress.textContent = shortenAddress(connectedAddress);
  networkName.textContent = network.name === "unknown" ? `Chain ${network.chainId}` : network.name;
  connectWalletBtn.textContent = "Wallet Connected";

  const isSepolia = Number(network.chainId) === REQUIRED_CHAIN_ID_DEC;
  networkWarning.classList.toggle("hidden", isSepolia);

  if (!isSepolia) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: REQUIRED_CHAIN_ID_HEX }],
      });
    } catch (error) {
      console.warn("Network switch rejected or unavailable", error);
    }
  }

  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS.includes("PASTE_") || CONTRACT_ABI.length === 0) {
    networkWarning.textContent = "Deploy the contract first so frontend/contractConfig.js contains the address and ABI.";
    networkWarning.classList.remove("hidden");
  } else {
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }

  updateFormState();
}

async function analyzeContract() {
  try {
    analyzeBtn.disabled = true;
    resultsDashboard.classList.add("hidden");
    setProgress(3);

    const requestTx = await contract.requestAudit();
    const requestReceipt = await requestTx.wait();
    const auditId = extractAuditId(requestReceipt);

    setProgress(0);
    setProgress(1);
    setProgress(2);

    const backendResponse = await fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audit_id: Number(auditId),
        code: contractCode.value,
      }),
    });

    const backendData = await backendResponse.json();
    if (!backendResponse.ok || !backendData.success) {
      throw new Error(backendData.error || "Backend analysis failed");
    }

    setProgress(3);
    const completeTx = await contract.completeAudit(
      auditId,
      backendData.ipfs_hash,
      backendData.total_issues,
      backendData.highest_severity
    );
    const completeReceipt = await completeTx.wait();

    setProgress(4);
    latestReport = {
      ...backendData,
      audit_id: Number(auditId),
      request_tx_hash: requestReceipt.hash,
      complete_tx_hash: completeReceipt.hash,
    };
    renderResults(latestReport);
  } catch (error) {
    alert(error.message || "Audit failed");
    console.error(error);
  } finally {
    updateFormState();
  }
}

function extractAuditId(receipt) {
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed && parsed.name === "AuditRequested") {
        return parsed.args.id;
      }
    } catch (error) {
      continue;
    }
  }
  throw new Error("AuditRequested event was not found in the transaction receipt");
}

function renderResults(report) {
  const counts = countSeverities(report.vulnerabilities);
  document.getElementById("auditSummary").textContent = `Audit #${report.audit_id} completed with ${report.total_issues} finding(s).`;
  document.getElementById("totalIssues").textContent = report.total_issues;
  document.getElementById("highCount").textContent = counts.High;
  document.getElementById("mediumCount").textContent = counts.Medium;
  document.getElementById("lowCount").textContent = counts.Low;
  document.getElementById("infoCount").textContent = counts.Informational;
  document.getElementById("ipfsLink").href = report.ipfs_url;
  document.getElementById("etherscanLink").href = `https://sepolia.etherscan.io/tx/${report.complete_tx_hash}`;
  document.getElementById("txHash").textContent = shortenHash(report.complete_tx_hash);

  vulnerabilityList.innerHTML = "";
  if (report.vulnerabilities.length === 0) {
    vulnerabilityList.innerHTML = '<div class="vulnerability-card"><p>No vulnerabilities were reported by Slither.</p></div>';
  } else {
    report.vulnerabilities.forEach((vulnerability) => {
      const card = document.createElement("article");
      const badgeClass = vulnerability.severity.toLowerCase();
      card.className = "vulnerability-card";
      card.innerHTML = `
        <header>
          <h3>${escapeHtml(vulnerability.name)}</h3>
          <span class="badge ${badgeClass}">${escapeHtml(vulnerability.severity)}</span>
        </header>
        <p><strong>Affected lines:</strong> ${formatLines(vulnerability.lines)}</p>
        <p><strong>AI explanation:</strong> ${escapeHtml(vulnerability.plain_explanation || "No explanation returned.")}</p>
        <p><strong>Fix suggestion:</strong> ${escapeHtml(vulnerability.fix_suggestion || "Review this finding manually.")}</p>
      `;
      vulnerabilityList.appendChild(card);
    });
  }

  resultsDashboard.classList.remove("hidden");
}

function countSeverities(vulnerabilities) {
  return vulnerabilities.reduce(
    (counts, vulnerability) => {
      const severity = vulnerability.severity || "Informational";
      if (counts[severity] !== undefined) {
        counts[severity] += 1;
      }
      return counts;
    },
    { High: 0, Medium: 0, Low: 0, Informational: 0 }
  );
}

async function loadSampleContract() {
  try {
    const response = await fetch("../test/sample_contracts/vulnerable_demo.sol");
    contractCode.value = response.ok ? await response.text() : SAMPLE_CONTRACT;
  } catch (error) {
    contractCode.value = SAMPLE_CONTRACT;
  }
  updateFormState();
}

function downloadReport() {
  if (!latestReport) {
    return;
  }
  const blob = new Blob([JSON.stringify(latestReport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `smartguard-audit-${latestReport.audit_id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function updateFormState() {
  const hasCode = contractCode.value.trim().length > 0;
  charCount.textContent = `${contractCode.value.length} characters`;
  analyzeBtn.disabled = !connectedAddress || !hasCode || !contract;
}

function setProgress(index) {
  progressItems.forEach((item, itemIndex) => {
    item.classList.toggle("done", itemIndex < index);
    item.classList.toggle("active", itemIndex === index);
  });
}

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function shortenHash(hash) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function formatLines(lines) {
  return Array.isArray(lines) && lines.length > 0 ? lines.join(", ") : "N/A";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
