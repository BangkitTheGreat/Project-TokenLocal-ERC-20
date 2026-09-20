# Security and operational notes

## Status

This repository is an educational local-development project. It has not been audited. Do not deploy these contracts unchanged to a public chain, do not connect wallets holding meaningful assets, and do not treat the UI as production-ready financial software.

## Trust model

### Token owner

The `TokenLocal` owner can mint an arbitrary number of TKL tokens to any address. Token holders must therefore trust the owner’s supply policy. There is no cap, role separation, timelock, governance process, or irreversible commitment limiting minting.

### Staking owner

The `StakingContract` owner can change `rewardRate`, fund rewards, and call `withdrawExcessReward`. The latter is not constrained by a calculation of accrued rewards or principal obligations. With the current single-token design, withdrawing pool balance can leave too little TKL to return stake principal or pay rewards.

### Reward solvency

Rewards accrue as accounting entries over elapsed time. Accrual does not verify that the contract holds enough TKL. `claimReward()` only succeeds when the pool has enough transferable balance at claim time.

The pool uses TKL for both principal and reward payments. Its balance must cover:

```text
all currently withdrawable stake principal + rewards users may claim
```

The implementation does not enforce this invariant. Pool funding and reward-rate management are operator responsibilities.

## Contract-specific risks

### TokenLocal

- Owner minting is unlimited.
- ERC-20 decimal formatting is a frontend concern; contracts always receive base units.
- Standard OpenZeppelin ERC-20 behavior is inherited, rather than reimplemented locally.

### StakingContract

- The reward rate begins at `0.1 TKL/second`, which is high for a small local pool and can exhaust rewards quickly.
- The contract has a manual boolean reentrancy lock rather than OpenZeppelin `ReentrancyGuard`. It protects its annotated state-changing methods but should receive careful review before any production consideration.
- `depositRewardTokens` requires a preceding token approval from the owner.
- `withdrawExcessReward` can withdraw tokens required for principal or rewards because it does not calculate excess.
- There are no staking-contract tests in the current suite. Core scenarios such as multi-user allocation, zero-stake intervals, reward-rate changes, insufficient funding, and principal solvency are not automatically verified.
- `lastUpdateTime` is written but not used in the reward calculation. Treat it as informational only unless the contract is refactored.

## Frontend risks and limitations

- The dApp accepts only chain ID `31337` and assumes a local EIP-1193 wallet provider.
- `StakeComponent.js` assumes 18 decimals instead of reading the token’s actual `decimals()` value.
- The frontend reads contract addresses and ABI data from `contract-info.json`; stale metadata will point it to nonexistent or incorrect contracts after a local node restart.
- A UI navigation item labelled Bridge does not establish a bridge protocol by itself. Treat unsupported screens and placeholders as nonfunctional.
- Browser-side validation improves usability but is not an authorization or safety boundary. The smart contracts remain the source of truth.

## Before any public deployment

At minimum, complete all of the following:

1. Define a token supply policy: capped supply, explicit mint authority, or removal of minting.
2. Separate reward liquidity from user stake principal, or enforce a strict solvency reserve before any owner withdrawal.
3. Replace or formally review the custom reentrancy lock and apply established OpenZeppelin patterns where appropriate.
4. Add comprehensive unit, invariant, fuzz, and integration tests for `StakingContract`.
5. Test reward math across multiple users, changing stake sizes, zero-stake periods, reward-rate changes, and long time jumps.
6. Add event/indexing and monitoring plans for owner changes, reward-rate changes, deposits, withdrawals, and pool solvency.
7. Remove placeholder UI actions and provide clear transaction simulation, error, and pending-state behavior.
8. Parameterize network configuration; never use local development keys, addresses, or RPC assumptions in a public release.
9. Add a license, contribution policy, dependency-update process, and security-contact disclosure.
10. Obtain independent smart-contract review and a security audit appropriate to the intended value at risk.

## Responsible local use

- Use the private keys printed by Hardhat only for the ephemeral local node.
- Resetting `npx hardhat node` removes all local state; rerun deployment and refresh frontend metadata afterward.
- Use small test amounts when exercising stake and reward paths.
- Keep owner operations deliberate: `setRewardRate` and pool withdrawals change the system’s ability to satisfy user claims.
