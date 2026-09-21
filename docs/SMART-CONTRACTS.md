# Smart-contract reference

This document describes the behavior implemented in the repository, not a protocol specification or audit report. Amounts passed to contracts are integer base units. TKL is deployed with 18 decimals, so a UI value of `1.5` TKL corresponds to `1500000000000000000` base units.

## TokenLocal

Source: `contracts/TokenLocal.sol`

### Constructor

```solidity
constructor(string memory name, string memory symbol, uint256 initialSupply)
```

Creates the OpenZeppelin ERC-20 token, sets `msg.sender` as `owner`, and mints `initialSupply` to `msg.sender`.

### Custom write method

| Method | Access | Effect |
| --- | --- | --- |
| `mint(address to, uint256 amount)` | `onlyOwner` | Mints `amount` base units to `to`; increases total supply and emits the standard `Transfer(address(0), to, amount)` event. |

### Inherited ERC-20 surface

The OpenZeppelin parent exposes standard methods including `name`, `symbol`, `decimals`, `totalSupply`, `balanceOf`, `transfer`, `approve`, `allowance`, and `transferFrom`. Refer to the installed OpenZeppelin version and ABI for its full error and event surface.

## StakingContract

Source: `contracts/StakingContract.sol`

Inherits `Ownable2Step` and `ReentrancyGuard`. Token movements use `SafeERC20`.

### Constructor

```solidity
constructor(address stakingTokenAddress)
```

Sets both immutable `stakingToken` and `rewardToken` to the same ERC-20 address and assigns deployer ownership. Reverts `TokenTidakValid` if the address is zero or has no bytecode.

No reward rate is set at construction. A freshly deployed contract emits nothing until `notifyRewardAmount` succeeds.

### Public state

| State | Meaning |
| --- | --- |
| `stakingToken` | ERC-20 token accepted as stake principal. |
| `rewardToken` | ERC-20 token sent as rewards; currently identical to `stakingToken`. |
| `totalStaked` | Total principal held in the pool's accounting. |
| `stakes[user]` | Principal currently attributed to `user`. |
| `rewardRate` | Emission per second for the current period, in base units. Zero until a period is funded. |
| `periodFinish` | Timestamp at which the current reward period ends. Zero before the first funding. |
| `lastRewardTime` | Timestamp of the last global checkpoint. Never exceeds `periodFinish`. |
| `rewardPerTokenStored` | Cumulative reward per staked token, scaled by `1e18`. |
| `userRewardPerTokenPaid[user]` | User checkpoint in the global reward index. |
| `rewards[user]` | Reward checkpointed for later claim. |
| `rewardReserve` | Unpaid reward budget. Bonded alongside `totalStaked` and excluded from owner withdrawal. |
| `totalScheduled` | Lifetime sum of scheduled emission, checked against `MAX_TOTAL_SCHEDULED`. |

Constants:

| Constant | Value | Purpose |
| --- | --- | --- |
| `MAX_DURATION` | `365 days` | Upper bound for a single reward period. |
| `MAX_TOTAL_SCHEDULED` | `type(uint256).max / 1e18` | Lifetime emission cap. The reward accumulator grows fastest when `totalStaked` is 1 wei, reaching `totalScheduled × 1e18`; this bound keeps it inside `uint256`, so extreme inputs fail at configuration time rather than when a user withdraws. |

### Solvency invariant

```text
contract balance >= totalStaked + rewardReserve
freeBalance()     = contract balance - totalStaked - rewardReserve
```

Only `freeBalance()` is withdrawable by the owner. Accrual rounds down, so the reserve is always conservative.

### Reward accounting

Emission runs only inside a funded period, and accrual is clamped to the period end:

```text
applicable = min(block.timestamp, periodFinish)
```

If `totalStaked == 0` or `applicable <= lastRewardTime`, `rewardPerToken()` returns the stored index unchanged. Otherwise:

```text
rewardPerToken = rewardPerTokenStored
  + ((applicable - lastRewardTime) × rewardRate × 1e18) / totalStaked
```

For an account:

```text
pendingReward = stakes[account]
  × (currentRewardPerToken - userRewardPerTokenPaid[account]) / 1e18
  + rewards[account]
```

Both use `Math.mulDiv`, so the intermediate multiplication cannot overflow.

The `updateReward(account)` modifier runs before stake, withdraw, claim, period funding, and surplus withdrawal. In order, it:

1. Releases unearned budget. If time passed while `totalStaked == 0`, that emission was earned by nobody; it is subtracted from `rewardReserve`, becomes free balance, and emits `ReserveReleased`. The release uses the same `applicable` clamp as accrual. Using a raw `block.timestamp` here would release time beyond `periodFinish` whose emission was never scheduled, leaving the reserve short of its obligations. The subtraction is floored at the current reserve, so an accounting error cannot lock the contract through a modifier every function depends on.
2. Checkpoints `rewardPerTokenStored` and advances `lastRewardTime` to `applicable`. This is why `lastRewardTime` can never pass `periodFinish`, and why the subtraction in `rewardPerToken()` cannot underflow.
3. For a nonzero account, stores its earned reward and advances its paid index.

### User methods

| Method | Preconditions | Effect |
| --- | --- | --- |
| `stake(uint256 amount)` | `amount > 0`; caller granted sufficient ERC-20 allowance | Checkpoints reward, increases user/global stake, then pulls principal with `safeTransferFrom`. Emits `Staked`. |
| `withdraw(uint256 amount)` | `amount > 0`; caller stake is at least `amount` | Checkpoints reward, decreases user/global stake, then returns principal. Does **not** claim rewards: accrued reward stays claimable after principal is fully withdrawn, so a failure in the reward path can never block principal recovery. Emits `Withdrawn`. |
| `claimReward()` | Reserve and non-principal balance must each cover the pending reward | Checkpoints reward, clears the stored reward, decrements `rewardReserve`, and transfers. Returns silently when the pending reward is zero. Emits `RewardPaid`. |
| `rewardPerToken()` | None | Returns the current global reward index. |
| `earned(address account)` | None | Returns the account's accrued reward at the current timestamp. |
| `lastTimeRewardApplicable()` | None | Returns `min(block.timestamp, periodFinish)`. |
| `freeBalance()` | None | Returns balance minus `totalStaked` and `rewardReserve`, saturating at zero so the view never reverts. |

All state-changing user methods use the OpenZeppelin `ReentrancyGuard` `nonReentrant` modifier.

### Owner methods

| Method | Effect |
| --- | --- |
| `notifyRewardAmount(uint256 amount, uint256 duration)` | Funds and starts a reward period. Pulls `amount` from the owner, verifies the amount actually received, then sets `rewardRate = amount / duration` and `periodFinish` atomically. The division remainder is not promised as reward and becomes free balance. Rejected while a period is still running. `duration` must be between 1 second and `MAX_DURATION`. Emits `RewardPeriodFunded`. |
| `withdrawExcessReward(uint256 amount)` | Checkpoints accounting first, then transfers at most `freeBalance()` to the owner. Reverts `MenarikDanaTerikat` for anything above it, so stake principal and the unpaid reward budget are unreachable. Emits `ExcessWithdrawn`. |
| `transferOwnership(address newOwner)` | Two-step. Records a pending owner; nothing changes until the recipient calls `acceptOwnership()`. |
| `acceptOwnership()` | Called by the pending owner to complete the transfer. |
| `renounceOwnership()` | Always reverts `TidakDapatMelepasKepemilikan`. The contract needs a live owner to fund periods and withdraw surplus; renouncing would freeze it permanently. |

## Events

| Event | Meaning |
| --- | --- |
| `Staked(user, amount)` | Principal was accepted from a user. |
| `Withdrawn(user, amount)` | Principal was returned to a user. |
| `RewardPaid(user, reward)` | A reward was transferred to a user. |
| `RewardPeriodFunded(amount, scheduled, rate, periodFinish)` | A reward period was funded and started. `scheduled` is `rate × duration` and may be slightly below `amount` because of flooring. |
| `ReserveReleased(amount)` | Budget for an interval with no stakers was returned to free balance. |
| `ExcessWithdrawn(to, amount)` | Owner withdrew free balance. |
| `Transfer`, `Approval`, `OwnershipTransferred`, `OwnershipTransferStarted` | Standard OpenZeppelin token/ownership events. |

## Custom errors

Identifiers are in Indonesian, matching the comment language used across the codebase. They are part of the ABI and will appear in block explorers and wallet error messages.

| Error | Raised when |
| --- | --- |
| `TokenTidakValid(token)` | Constructor received a zero address or an address with no bytecode. |
| `JumlahNol()` | A zero amount was passed to `stake`, `withdraw`, or `notifyRewardAmount`. |
| `StakeTidakCukup(diminta, tersedia)` | Withdrawal exceeds the caller's stake. |
| `PeriodeMasihAktif(periodFinish)` | A new reward period was requested before the current one ended. |
| `DurasiTidakValid(duration)` | Duration is zero or above `MAX_DURATION`. |
| `RateNol(amount, duration)` | `amount / duration` floors to zero, so the period would emit nothing. |
| `EmisiMelebihiBatas(diminta, sisaKapasitas)` | Scheduled emission would push `totalScheduled` past `MAX_TOTAL_SCHEDULED`. |
| `PendanaanTidakUtuh(diminta, diterima)` | The contract received less than `amount`, as a fee-on-transfer token would cause. |
| `MenarikDanaTerikat(diminta, saldoBebas)` | Owner tried to withdraw more than `freeBalance()`. |
| `CadanganTidakCukup(diminta, cadangan)` | A claim exceeds `rewardReserve`. Indicates an accounting fault, not normal operation. |
| `SaldoTidakCukup(diminta, tersedia)` | A claim exceeds the balance held outside stake principal. |
| `TidakDapatMelepasKepemilikan()` | `renounceOwnership()` was called. |

## Frontend transaction sequence

> The staking screens do not currently reach this contract. `contract-info.json` carries no `StakingContract` ABI, and the frontend calls `stakedBalanceOf()` and `unstake()`, which do not exist here. The equivalents are `stakes()` and `withdraw()`. See `docs/SECURITY.md` for the full list of open frontend issues.

The intended sequence for staking is: request approval for the entered amount, wait for that transaction, then submit `stake`. An allowance greater than zero is not by itself enough for every amount, so the component compares the displayed allowance before submitting.

The current frontend assumes 18 token decimals in `StakeComponent.js`. That matches this deployment but should be made dynamic before supporting arbitrary ERC-20 tokens.
