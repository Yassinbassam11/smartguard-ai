// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SmartGuard AI Audit Registry
/// @notice Records smart contract audit lifecycle metadata and security credits on-chain.
contract AuditRegistry is ReentrancyGuard {
    enum AuditStatus {
        PENDING,
        COMPLETED,
        VERIFIED
    }

    struct Audit {
        uint256 id;
        address requester;
        uint256 timestamp;
        string ipfsHash;
        AuditStatus status;
        uint8 vulnerabilityCount;
        string severity;
    }

    mapping(uint256 => Audit) public audits;
    mapping(address => uint256[]) public auditsByAddress;
    mapping(address => uint256) public securityCredits;

    uint256 public totalCreditsIssued;
    uint256 public auditCounter;

    address public immutable deployer;
    address public owner;
    address public validator;

    uint256 public constant CREDITS_PER_AUDIT = 10;

    event AuditRequested(uint256 indexed id, address indexed requester, uint256 timestamp);
    event AuditCompleted(uint256 indexed id, string ipfsHash, uint8 vulnerabilityCount);
    event AuditVerified(uint256 indexed id, address indexed validator);
    event CreditsAwarded(address indexed user, uint256 amount);
    event CreditsTransferred(address indexed from, address indexed to, uint256 amount);
    event ValidatorUpdated(address indexed previousValidator, address indexed newValidator);

    modifier onlyOwner() {
        require(msg.sender == owner, "AuditRegistry: caller is not the owner");
        _;
    }

    modifier onlyValidator() {
        require(msg.sender == validator, "AuditRegistry: caller is not the validator");
        _;
    }

    modifier auditExists(uint256 _id) {
        require(_id < auditCounter, "AuditRegistry: audit does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
        deployer = msg.sender;
        validator = msg.sender;
    }

    /// @notice Requests a new security audit and awards participation credits.
    /// @dev Follows checks-effects-interactions. No external calls are made.
    /// @return auditId The ID assigned to the newly requested audit.
    function requestAudit() external returns (uint256 auditId) {
        auditId = auditCounter;

        audits[auditId] = Audit({
            id: auditId,
            requester: msg.sender,
            timestamp: block.timestamp,
            ipfsHash: "",
            status: AuditStatus.PENDING,
            vulnerabilityCount: 0,
            severity: ""
        });

        auditsByAddress[msg.sender].push(auditId);
        securityCredits[msg.sender] += CREDITS_PER_AUDIT;
        totalCreditsIssued += CREDITS_PER_AUDIT;
        auditCounter += 1;

        emit AuditRequested(auditId, msg.sender, block.timestamp);
        emit CreditsAwarded(msg.sender, CREDITS_PER_AUDIT);
    }

    /// @notice Completes a pending audit with the final IPFS report metadata.
    /// @param _id Audit ID to complete.
    /// @param _ipfsHash Pinata/IPFS content identifier for the full report.
    /// @param _vulnCount Number of vulnerabilities detected by the scanner.
    /// @param _severity Highest severity detected by the scanner.
    function completeAudit(
        uint256 _id,
        string memory _ipfsHash,
        uint8 _vulnCount,
        string memory _severity
    ) external onlyValidator auditExists(_id) {
        Audit storage audit = audits[_id];
        require(audit.status == AuditStatus.PENDING, "Audit must be pending");

        audit.status = AuditStatus.COMPLETED;
        audit.ipfsHash = _ipfsHash;
        audit.vulnerabilityCount = _vulnCount;
        audit.severity = _severity;

        emit AuditCompleted(_id, _ipfsHash, _vulnCount);
    }

    /// @notice Verifies a completed audit after validator review.
    /// @param _id Audit ID to verify.
    function verifyAudit(uint256 _id) external onlyValidator auditExists(_id) {
        Audit storage audit = audits[_id];
        require(audit.status == AuditStatus.COMPLETED, "Audit must be completed");

        audit.status = AuditStatus.VERIFIED;

        emit AuditVerified(_id, msg.sender);
    }

    /// @notice Transfers security credits to another address.
    /// @dev Uses nonReentrant protection and checks-effects-interactions.
    /// @param _to Recipient address.
    /// @param _amount Amount of credits to transfer.
    function transferCredits(address _to, uint256 _amount) external nonReentrant {
        require(_to != address(0), "AuditRegistry: recipient is zero address");
        require(securityCredits[msg.sender] >= _amount, "AuditRegistry: insufficient credits");

        securityCredits[msg.sender] -= _amount;
        securityCredits[_to] += _amount;

        emit CreditsTransferred(msg.sender, _to, _amount);
    }

    /// @notice Sets the validator address that can complete and verify audits.
    /// @param _validator New validator address.
    function setValidator(address _validator) external onlyOwner {
        require(_validator != address(0), "AuditRegistry: validator is zero address");
        address previousValidator = validator;
        validator = _validator;

        emit ValidatorUpdated(previousValidator, _validator);
    }

    /// @notice Returns all audit IDs requested by a user.
    /// @param _user Address to query.
    /// @return User audit IDs.
    function getAuditsByAddress(address _user) external view returns (uint256[] memory) {
        return auditsByAddress[_user];
    }

    /// @notice Returns the security credit balance of a user.
    /// @param _user Address to query.
    /// @return Credit balance.
    function balanceOf(address _user) external view returns (uint256) {
        return securityCredits[_user];
    }

    receive() external payable {}

    fallback() external payable {}
}
