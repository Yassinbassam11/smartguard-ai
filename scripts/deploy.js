const fs = require("fs");
const path = require("path");
const { ethers, artifacts } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying AuditRegistry with account: ${deployer.address}`);

  const AuditRegistry = await ethers.getContractFactory("AuditRegistry");
  const auditRegistry = await AuditRegistry.deploy();
  await auditRegistry.waitForDeployment();

  const contractAddress = await auditRegistry.getAddress();
  console.log(`AuditRegistry deployed to: ${contractAddress}`);

  const validatorTx = await auditRegistry.setValidator(deployer.address);
  await validatorTx.wait();
  console.log(`Validator set to: ${deployer.address}`);

  const artifact = await artifacts.readArtifact("AuditRegistry");
  const frontendConfigPath = path.join(__dirname, "..", "frontend", "contractConfig.js");
  const configContents = `const CONTRACT_ADDRESS = "${contractAddress}";\n\nconst CONTRACT_ABI = ${JSON.stringify(
    artifact.abi,
    null,
    2
  )};\n`;

  fs.mkdirSync(path.dirname(frontendConfigPath), { recursive: true });
  fs.writeFileSync(frontendConfigPath, configContents);
  console.log(`Frontend config saved to: ${frontendConfigPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
