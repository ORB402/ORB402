// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IORB402PrivacyPool
 * @notice Interface for the ORB402 Privacy Pool contract on Base.
 *
 * The PrivacyPool acts as a mixing pool for private transfers. Users deposit
 * tokens, then use ZK proofs to authorize transfers. On-chain observers see
 * tokens moving from the pool — not from individual users.
 *
 * Transfer Flow:
 *   1. uploadProof()      — Store ZK proof authorizing a transfer amount
 *   2. internalTransfer() — Move tokens between pool balances (private)
 *      OR
 *   2. externalTransfer() — Withdraw tokens from pool to external address
 *
 * @dev Proofs are single-use (consumed after transfer) to prevent replay.
 */
interface IORB402PrivacyPool {
    // ========================================================================
    // Events
    // ========================================================================

    /**
     * @notice Emitted when a ZK proof is uploaded.
     * @param proofId The unique identifier for the proof (keccak256 of nonce)
     * @param sender The address that uploaded the proof
     * @param amount The authorized transfer amount
     */
    event ProofUploaded(
        bytes32 indexed proofId,
        address indexed sender,
        uint256 amount
    );

    /**
     * @notice Emitted when a transfer is executed.
     * @param proofId The proof consumed by this transfer
     * @param recipient The recipient address
     * @param amount The transferred amount
     * @param isInternal True if internal (pool-to-pool), false if external
     */
    event TransferExecuted(
        bytes32 indexed proofId,
        address indexed recipient,
        uint256 amount,
        bool isInternal
    );

    /**
     * @notice Emitted when tokens are deposited into the pool.
     * @param user The depositor address
     * @param token The token contract address
     * @param amount The deposited amount
     */
    event Deposit(
        address indexed user,
        address indexed token,
        uint256 amount
    );

    // ========================================================================
    // Proof Management
    // ========================================================================

    /**
     * @notice Upload a ZK proof authorizing a transfer amount.
     * @dev The proof is stored on-chain and can only be consumed once.
     *      The proofId is derived as keccak256(abi.encodePacked(nonce)).
     *
     * @param nonce Unique nonce for this proof (random, uncorrelated with sender)
     * @param amount The authorized transfer amount in token units
     * @param token The token contract address
     * @param proof The ZK proof bytes (Groth16 / PLONK)
     * @param commitment The Pedersen commitment bytes
     * @param blindingFactor The blinding factor for the commitment
     */
    function uploadProof(
        uint256 nonce,
        uint256 amount,
        address token,
        bytes calldata proof,
        bytes calldata commitment,
        bytes calldata blindingFactor
    ) external;

    /**
     * @notice Get proof details.
     * @param proofId The proof identifier
     * @return sender The proof uploader
     * @return amount The authorized amount
     * @return token The token address
     * @return consumed Whether the proof has been used
     */
    function getProof(bytes32 proofId)
        external
        view
        returns (
            address sender,
            uint256 amount,
            address token,
            bool consumed
        );

    // ========================================================================
    // Transfers
    // ========================================================================

    /**
     * @notice Execute an internal transfer (pool-to-pool).
     * @dev Moves balance from sender to recipient within the pool.
     *      Both parties remain private — no tokens leave the contract.
     *
     * @param proofId The proof authorizing this transfer (consumed after)
     * @param recipient The recipient's address (must have pool balance entry)
     */
    function internalTransfer(
        bytes32 proofId,
        address recipient
    ) external;

    /**
     * @notice Execute an external transfer (pool-to-wallet).
     * @dev Sends tokens from the pool to an external address.
     *      A relayer fee is deducted to cover gas costs.
     *
     * @param proofId The proof authorizing this transfer (consumed after)
     * @param recipient The external recipient address
     * @param relayerFee Fee amount for the relayer (in token units)
     */
    function externalTransfer(
        bytes32 proofId,
        address recipient,
        uint256 relayerFee
    ) external;

    // ========================================================================
    // Deposits
    // ========================================================================

    /**
     * @notice Deposit tokens into the privacy pool with gas funding.
     * @dev Atomic approve + deposit. The msg.value covers gas for future operations.
     *
     * @param user The user address to credit
     * @param token The token contract address
     * @param amount The deposit amount in token units
     */
    function depositWithGas(
        address user,
        address token,
        uint256 amount
    ) external payable;

    // ========================================================================
    // View Functions
    // ========================================================================

    /**
     * @notice Get a user's balance in the pool.
     * @param user The user address
     * @param token The token contract address
     * @return available Balance available for transfers
     * @return locked Balance locked by active proofs
     */
    function getUserBalance(address user, address token)
        external
        view
        returns (uint256 available, uint256 locked);
}
