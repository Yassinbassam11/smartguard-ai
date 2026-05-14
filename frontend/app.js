const REQUIRED_CHAIN_ID_DEC = 11155111;
const REQUIRED_CHAIN_ID_HEX = "0xaa36a7";
const BACKEND_URL = "http://127.0.0.1:5000";
const ADVANCED_AUDIT_COST = 5;
const PDF_REPORT_COST = 3;
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
const downloadHtmlReportBtn = document.getElementById("downloadHtmlReportBtn");
const downloadPdfReportBtn = document.getElementById("downloadPdfReportBtn");
const creditBalance = document.getElementById("creditBalance");
const advancedAiOption = document.getElementById("advancedAiOption");
const pdfReportOption = document.getElementById("pdfReportOption");

connectWalletBtn.addEventListener("click", connectWallet);
loadSampleBtn.addEventListener("click", loadSampleContract);
contractCode.addEventListener("input", updateFormState);
analyzeBtn.addEventListener("click", analyzeContract);
downloadReportBtn.addEventListener("click", downloadReport);
downloadHtmlReportBtn.addEventListener("click", downloadHtmlReport);
downloadPdfReportBtn.addEventListener("click", downloadPdfReport);

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
    await refreshCreditBalance();
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

    let creditsSpent = 0;
    if (advancedAiOption.checked) {
      const spendTx = await contract.spendCreditsForAdvancedAudit(auditId);
      await spendTx.wait();
      creditsSpent += ADVANCED_AUDIT_COST;
    }

    if (pdfReportOption.checked) {
      const pdfSpendTx = await contract.spendCreditsForPdfReport(auditId);
      await pdfSpendTx.wait();
      creditsSpent += PDF_REPORT_COST;
    }

    const remainingCredits = await contract.balanceOf(connectedAddress);
    creditBalance.textContent = `Credits: ${remainingCredits}`;

    setProgress(0);
    setProgress(1);
    setProgress(2);

    const backendResponse = await fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audit_id: Number(auditId),
        code: contractCode.value,
        advanced_ai: advancedAiOption.checked,
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
      credits_spent: creditsSpent,
      remaining_credits: Number(remainingCredits),
      advanced_ai: advancedAiOption.checked,
      pdf_report: pdfReportOption.checked,
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
  document.getElementById("creditUsage").textContent = `${report.credits_spent} credits spent, ${report.remaining_credits} remaining`;
  downloadPdfReportBtn.classList.toggle("hidden", !report.pdf_report);

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
        <p><strong>${report.advanced_ai ? "AI explanation" : "Description"}:</strong> ${escapeHtml(vulnerability.plain_explanation || vulnerability.description || "No explanation returned.")}</p>
        <p><strong>Fix suggestion:</strong> ${escapeHtml(vulnerability.fix_suggestion || "Enable advanced AI explanations for a detailed fix suggestion.")}</p>
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

function downloadHtmlReport() {
  if (!latestReport) {
    return;
  }
  const html = buildHumanReportHtml(latestReport);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `smartguard-audit-${latestReport.audit_id}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadPdfReport() {
  if (!latestReport || !latestReport.pdf_report) {
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const margin = 14;
  const maxWidth = 182;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SmartGuard AI Audit Report", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const summary = [
    `Audit ID: ${latestReport.audit_id}`,
    `Total issues: ${latestReport.total_issues}`,
    `Highest severity: ${latestReport.highest_severity}`,
    `Advanced AI: ${latestReport.advanced_ai ? "Enabled" : "Disabled"}`,
    `Credits spent: ${latestReport.credits_spent}`,
    `IPFS: ${latestReport.ipfs_url}`,
  ];

  summary.forEach((line) => {
    y = writeWrappedPdfText(doc, line, margin, y, maxWidth);
  });

  latestReport.vulnerabilities.forEach((vulnerability, index) => {
    if (y > 260) {
      doc.addPage();
      y = 18;
    }
    doc.setFont("helvetica", "bold");
    y = writeWrappedPdfText(doc, `${index + 1}. ${vulnerability.name} (${vulnerability.severity})`, margin, y + 4, maxWidth);
    doc.setFont("helvetica", "normal");
    y = writeWrappedPdfText(doc, `Lines: ${formatLines(vulnerability.lines)}`, margin, y, maxWidth);
    y = writeWrappedPdfText(doc, `Explanation: ${vulnerability.plain_explanation || vulnerability.description || "N/A"}`, margin, y, maxWidth);
    y = writeWrappedPdfText(doc, `Fix: ${vulnerability.fix_suggestion || "Enable advanced AI explanations for a detailed fix suggestion."}`, margin, y, maxWidth);
  });

  doc.save(`smartguard-audit-${latestReport.audit_id}.pdf`);
}

function updateFormState() {
  const hasCode = contractCode.value.trim().length > 0;
  charCount.textContent = `${contractCode.value.length} characters`;
  analyzeBtn.disabled = !connectedAddress || !hasCode || !contract;
}

async function refreshCreditBalance() {
  if (!contract || !connectedAddress) {
    creditBalance.textContent = "Credits: --";
    return;
  }

  const balance = await contract.balanceOf(connectedAddress);
  creditBalance.textContent = `Credits: ${balance}`;
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

function buildHumanReportHtml(report) {
  const items = report.vulnerabilities
    .map(
      (vulnerability, index) => `
        <section>
          <h2>${index + 1}. ${escapeHtml(vulnerability.name)} - ${escapeHtml(vulnerability.severity)}</h2>
          <p><strong>Affected lines:</strong> ${escapeHtml(formatLines(vulnerability.lines))}</p>
          <p><strong>${report.advanced_ai ? "AI explanation" : "Description"}:</strong> ${escapeHtml(vulnerability.plain_explanation || vulnerability.description || "N/A")}</p>
          <p><strong>Fix suggestion:</strong> ${escapeHtml(vulnerability.fix_suggestion || "Enable advanced AI explanations for a detailed fix suggestion.")}</p>
        </section>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>SmartGuard AI Audit ${report.audit_id}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 32px auto; line-height: 1.55; color: #17211d; }
    h1 { border-bottom: 3px solid #0e766e; padding-bottom: 10px; }
    section { border-top: 1px solid #d9e1dc; padding-top: 16px; margin-top: 16px; }
    .meta { background: #f4f7f4; padding: 16px; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>SmartGuard AI Audit Report</h1>
  <div class="meta">
    <p><strong>Audit ID:</strong> ${report.audit_id}</p>
    <p><strong>Total issues:</strong> ${report.total_issues}</p>
    <p><strong>Highest severity:</strong> ${escapeHtml(report.highest_severity)}</p>
    <p><strong>Advanced AI:</strong> ${report.advanced_ai ? "Enabled" : "Disabled"}</p>
    <p><strong>Credits spent:</strong> ${report.credits_spent}</p>
    <p><strong>IPFS:</strong> <a href="${escapeHtml(report.ipfs_url)}">${escapeHtml(report.ipfs_url)}</a></p>
  </div>
  ${items || "<p>No vulnerabilities were reported.</p>"}
</body>
</html>`;
}

function writeWrappedPdfText(doc, text, x, y, maxWidth) {
  const lines = doc.splitTextToSize(String(text), maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * 5 + 3;
}
