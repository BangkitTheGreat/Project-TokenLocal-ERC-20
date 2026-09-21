# Security and operational notes

## Status

This repository is an educational local-development project. It has not been audited. Do not deploy these contracts unchanged to a public chain, do not connect wallets holding meaningful assets, and do not treat the UI as production-ready financial software.

`StakingContract` was hardened after a principal-draining defect was found in review. See [How past issues were closed](#how-past-issues-were-closed) for what changed and which tests prove it. Hardening is not an audit.

## Trust model

### Token owner

The `TokenLocal` owner can mint an arbitrary number of TKL tokens to any address. Token holders must therefore trust the owner's supply policy. There is no cap, role separation, timelock, governance process, or irreversible commitment limiting minting.

### Staking owner

The `StakingContract` owner can fund reward periods and withdraw surplus. Both are bounded:

- `notifyRewardAmount(amount, duration)` pulls the reward budget from the owner and starts a period. A new period is rejected while the current one is still running, so emission cannot be redirected mid-flight.
- `withdrawExcessReward(amount)` is limited to `freeBalance()`, which excludes both stake principal and the unpaid reward budget.

The owner cannot reach user principal or accrued rewards.

The owner also cannot walk away. `renounceOwnership()` reverts, because the contract needs a live owner to fund reward periods and withdraw surplus; renouncing would freeze it permanently with no way back. Ownership transfer uses the two-step `Ownable2Step` flow, so a mistyped address does not orphan the contract.

### Reward solvency

Emission only runs during a period whose budget has already been transferred in. `notifyRewardAmount` sets the rate and `periodFinish` atomically from funds actually received, so the contract cannot promise more than it holds. `rate = amount / duration`; the division remainder is not promised as reward and becomes free balance.

Accrual is clamped to `min(block.timestamp, periodFinish)`. Intervals with no stakers earn nothing for anybody, and that unearned budget is released back to free balance rather than handed to whoever stakes next.

`rewardReserve` tracks the unpaid reward budget. Together with `totalStaked` it is the bonded portion of the balance:

```text
contract balance >= totalStaked + rewardReserve
free balance      = contract balance - totalStaked - rewardReserve
```

The implementation enforces this rather than leaving it to the operator. Accrual rounds down, so the reserve stays conservative; the difference remains reserved and cannot be swept by the owner.

### What the reserve does not guarantee

`rewardReserve` guarantees that a user receives **N tokens**. It does not guarantee that N tokens are **worth** anything: the `TokenLocal` owner can mint without limit, and in this deployment that is the same party. Stake principal is protected absolutely; reward value remains dilutable.

## Contract-specific risks

### TokenLocal

- Owner minting is unlimited.
- ERC-20 decimal formatting is a frontend concern; contracts always receive base units.
- Standard OpenZeppelin ERC-20 behavior is inherited, rather than reimplemented locally.

### StakingContract

- Support is limited to standard ERC-20 tokens. `stake()` does not measure the amount actually received, so a rebasing or fee-on-transfer token would credit more than it delivered. Reward funding does measure what arrives and rejects a short transfer.
- A single token serves as both principal and reward. The reserve keeps the two solvent within one balance, but they are not physically separated into different contracts.
- Reward periods cannot be extended or topped up while running; the owner must wait for `periodFinish`. This is deliberate. It makes the schedule predictable and the accounting provable, at the cost of operator flexibility.
- Lifetime scheduled emission is capped at `type(uint256).max / 1e18` base units so the reward accumulator cannot overflow. Extreme inputs fail at configuration time rather than when a user tries to withdraw.
- `block.timestamp` is validator-reported and can drift by seconds. Period boundaries are approximate at second granularity, which is immaterial for day-scale periods.
- `withdraw()` deliberately does not claim rewards. A failure in the reward path must never block a user from recovering principal.
- The contract has not been fuzz-tested, invariant-tested, or formally verified.

## Frontend risks and limitations

These remain open; the frontend has not been revised in this series.

- The dApp accepts only chain ID `31337` and assumes a local EIP-1193 wallet provider.
- `contract-info.json` contains no `StakingContract` ABI, so the staking screens cannot reach the contract at all. The guard at `App.js:335` checks for the method and silently skips, which shows `0` instead of reporting the failure.
- The frontend calls `stakedBalanceOf()` and `unstake()`, which do not exist. The contract exposes `stakes()` and `withdraw()`.
- Five components are defined inside `App()`, so every render remounts them and text inputs lose focus between keystrokes.
- `StakeComponent.js` assumes 18 decimals instead of reading the token's actual `decimals()` value.
- The frontend reads contract addresses and ABI data from `contract-info.json`; stale metadata will point it to nonexistent or incorrect contracts after a local node restart.
- The Bridge screen reports success from a placeholder and performs no transaction. Treat it as nonfunctional.
- Browser-side validation improves usability but is not an authorization or safety boundary. The smart contracts remain the source of truth.

## How past issues were closed

Each defect was committed as a failing test first, then fixed in the following commit, so the history carries a runnable demonstration of the problem rather than a claim about it.

| Issue | Closed by | Proven by |
|---|---|---|
| Owner could withdraw user stake principal through `withdrawExcessReward` | `6e32bcf` | `test/StakingContract.ts` (failing at `e326f48`) |
| Unfunded emission of roughly 3.15M TKL per year against a 1M supply, with no period end | `e899b2f` | `test/StakingRewardPeriod.ts` |
| Accrued but unclaimed rewards were still withdrawable by the owner | `a6cac53` | `test/StakingReserve.ts` |
| Manual reentrancy lock, unchecked ERC-20 return values, single-step ownership, open `renounceOwnership()` | `36a9816` | `test/StakingOwnership.ts` |
| `lastUpdateTime` written on every checkpoint but never read | `e899b2f` | removed |

## Before any public deployment

Closed in this series:

- Enforce a strict solvency reserve before any owner withdrawal.
- Replace the custom reentrancy lock with the established OpenZeppelin pattern.
- Test reward math across multiple users, changing stake sizes, zero-stake intervals, and long time jumps.

Still required, at minimum:

1. Define a token supply policy: capped supply, explicit mint authority, or removal of minting.
2. Add invariant and fuzz tests for `StakingContract`. The unit suite covers known scenarios; it does not search for unknown ones.
3. Consider separating reward liquidity from stake principal into distinct contracts, rather than relying on in-balance accounting alone.
4. Add event indexing and monitoring for ownership transfers, period funding, reserve releases, and surplus withdrawals.
5. Repair or remove the frontend issues listed above, including the placeholder Bridge action.
6. Parameterize network configuration; never use local development keys, addresses, or RPC assumptions in a public release.
7. Add a license file, contribution policy, dependency-update process, and security-contact disclosure.
8. Obtain independent smart-contract review and a security audit appropriate to the intended value at risk.

## Responsible local use

- Use the private keys printed by Hardhat only for the ephemeral local node.
- Resetting `npx hardhat node` removes all local state; rerun deployment and refresh frontend metadata afterward.
- A freshly deployed staking contract pays no rewards until `notifyRewardAmount` succeeds. `rewardRate` is zero until then.
- Use small test amounts when exercising stake and reward paths.
- Keep owner operations deliberate. Funding a period commits the budget for its full duration, and it cannot be cancelled or redirected before `periodFinish`.
