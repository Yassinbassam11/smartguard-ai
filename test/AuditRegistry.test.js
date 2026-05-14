const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("AuditRegistry", function () {
  async function deployFixture() {
    const [owner, requester, nonValidator, recipient] = await ethers.getSigners();
    const AuditRegistry = await ethers.getContractFactory("AuditRegistry");
    const registry = await AuditRegistry.deploy();
    await registry.waitForDeployment();

    return { registry, owner, requester, nonValidator, recipient };
  }

  it("requests and completes an audit through the happy path", async function () {
    const { registry, requester } = await deployFixture();

    await expect(registry.connect(requester).requestAudit())
      .to.emit(registry, "AuditRequested")
      .withArgs(0, requester.address, anyValue);

    const audit = await registry.audits(0);
    expect(audit.status).to.equal(0);

    await expect(registry.completeAudit(0, "QmSmartGuardReport", 2, "High"))
      .to.emit(registry, "AuditCompleted")
      .withArgs(0, "QmSmartGuardReport", 2);

    const completedAudit = await registry.audits(0);
    expect(completedAudit.status).to.equal(1);
    expect(completedAudit.ipfsHash).to.equal("QmSmartGuardReport");
    expect(completedAudit.vulnerabilityCount).to.equal(2);
    expect(completedAudit.severity).to.equal("High");
  });

  it("prevents completing an audit twice", async function () {
    const { registry, requester } = await deployFixture();

    await registry.connect(requester).requestAudit();
    await registry.completeAudit(0, "QmSmartGuardReport", 1, "Medium");

    await expect(registry.completeAudit(0, "QmSecondReport", 0, "Low")).to.be.revertedWith(
      "Audit must be pending"
    );
  });

  it("prevents non-validator completion", async function () {
    const { registry, requester, nonValidator } = await deployFixture();

    await registry.connect(requester).requestAudit();

    await expect(
      registry.connect(nonValidator).completeAudit(0, "QmBlocked", 1, "High")
    ).to.be.revertedWith("AuditRegistry: caller is not the validator");
  });

  it("transfers credits correctly", async function () {
    const { registry, requester, recipient } = await deployFixture();

    await registry.connect(requester).requestAudit();

    await expect(registry.connect(requester).transferCredits(recipient.address, 4))
      .to.emit(registry, "CreditsTransferred")
      .withArgs(requester.address, recipient.address, 4);

    expect(await registry.balanceOf(requester.address)).to.equal(6);
    expect(await registry.balanceOf(recipient.address)).to.equal(4);
  });

  it("spends credits for an advanced AI audit report", async function () {
    const { registry, requester } = await deployFixture();

    await registry.connect(requester).requestAudit();

    await expect(registry.connect(requester).spendCreditsForAdvancedAudit(0))
      .to.emit(registry, "CreditsSpent")
      .withArgs(requester.address, 0, 5, "ADVANCED_AI_AUDIT");

    expect(await registry.balanceOf(requester.address)).to.equal(5);
    expect(await registry.creditsSpentByAudit(0)).to.equal(5);
    expect(await registry.totalCreditsSpent()).to.equal(5);
  });

  it("prevents spending advanced audit credits twice", async function () {
    const { registry, requester } = await deployFixture();

    await registry.connect(requester).requestAudit();
    await registry.connect(requester).spendCreditsForAdvancedAudit(0);

    await expect(registry.connect(requester).spendCreditsForAdvancedAudit(0)).to.be.revertedWith(
      "AuditRegistry: credits already spent"
    );
  });

  it("spends credits for a human-readable PDF report", async function () {
    const { registry, requester } = await deployFixture();

    await registry.connect(requester).requestAudit();

    await expect(registry.connect(requester).spendCreditsForPdfReport(0))
      .to.emit(registry, "CreditsSpent")
      .withArgs(requester.address, 0, 3, "PDF_REPORT");

    expect(await registry.balanceOf(requester.address)).to.equal(7);
    expect(await registry.pdfCreditsSpentByAudit(0)).to.equal(3);
    expect(await registry.totalCreditsSpent()).to.equal(3);
  });

  it("spends credits for both optional services", async function () {
    const { registry, requester } = await deployFixture();

    await registry.connect(requester).requestAudit();
    await registry.connect(requester).spendCreditsForAdvancedAudit(0);
    await registry.connect(requester).spendCreditsForPdfReport(0);

    expect(await registry.balanceOf(requester.address)).to.equal(2);
    expect(await registry.totalCreditsSpent()).to.equal(8);
  });
});
