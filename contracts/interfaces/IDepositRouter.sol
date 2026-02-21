// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDepositRouter
 * @notice Interface for the ORB402 Deposit Router contract.
 *
 * The DepositRouter simplifies deposits by handling token approval and
 * deposit in a single transaction. It also forwards ETH for gas funding
 * to the user's holding wallet within the pool.
 *
 * Without the router, a deposit requires two separate transactions:
 *   1. approve(privacyPool, amount)
 *   2. privacyPool.depositWithGas{value: gasFunding}(user, token, amount)
 *
 * With the router, it's a single call:
 *   router.depositAndFund{value: gasFunding}(token, amount)
 */
interface IDepositRouter {
    /**
     * @notice Emitted when a deposit is routed.
     * @param user The depositor address
     * @param token The token contract address
     * @param amount The deposited amount
     * @param gasFunding The ETH amount forwarded for gas
     */
    event DepositRouted(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 gasFunding
    );

    /**
     * @notice Deposit tokens and fund gas in a single transaction.
     * @dev Requires prior token approval to this router contract.
     *      The msg.value is forwarded as gas funding to the pool.
     *
     * @param token The token contract address
     * @param amount The deposit amount in token units
     */
    function depositAndFund(
        address token,
        uint256 amount
    ) external payable;

    /**
     * @notice Get the privacy pool address this router deposits into.
     * @return The ORB402PrivacyPool contract address
     */
    function privacyPool() external view returns (address);
}
