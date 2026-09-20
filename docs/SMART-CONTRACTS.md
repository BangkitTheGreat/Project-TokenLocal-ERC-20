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

### Constructor

```solidity
constructor(address stakingTokenAddress)
```

Sets both immutable `stakingToken` and `rewardToken` to the same ERC-20 address, assigns deployer ownership, records the initial timestamp, and initializes the global reward rate to `0.1` TKL per second (`1e17` base units/second).

### Public state

| State | Meaning |
| --- | --- |
| `stakingToken` | ERC-20 token accepted as stake principal. |
| `rewardToken` | ERC-20 token sent as rewards; currently identical to `stakingToken`. |
| `totalStaked` | Total principal held in the pool’s accounting. |
| `stakes[user]` | Principal currently attributed to `user`. |
| `rewardRate` | Global reward emission per second, in base units. |
| `lastRewardTime` | Timestamp used by global accrual. |
| `rewardPerTokenStored` | Cumulative reward per staked token, scaled by `1e18`. |
| `userRewardPerTokenPaid[user]` | User checkpoint in the global reward index. |
| `rewards[user]` | Reward checkpointed for later claim. |

`lastUpdateTime[user]` is also recorded when a user reward update occurs but is not used in the reward formula.

### Reward accounting

If `totalStaked == 0`, `rewardPerToken()` returns the stored index unchanged. Otherwise:

```text
rewardPerToken = rewardPerTokenStored
  + (elapsedSeconds × rewardRate × 1e18) / totalStaked
```

For an account:

```text
pendingReward = stakes[account]
  × (currentRewardPerToken - userRewardPerTokenPaid[account]) / 1e18
  + rewards[account]
```

The `updateReward(account)` modifier checkpoints the global index and, for a nonzero account, stores its currently earned reward and advances its paid index. It runs before stake, withdrawal, claim, and reward-rate updates.

### User methods

| Method | Preconditions | Effect |
| --- | --- | --- |
| `stake(uint256 amount)` | `amount > 0`; caller granted sufficient ERC-20 allowance | Checkpoints reward, increases user/global stake, then calls `transferFrom` to pull principal. Emits `Staked`. |
| `withdraw(uint256 amount)` | `amount > 0`; caller stake is at least `amount` | Checkpoints reward, decreases user/global stake, then transfers principal back. Emits `Withdrawn`. |
| `claimReward()` | None; pool must have enough liquid TKL if reward is positive | Checkpoints reward; resets stored reward and transfers it to caller when nonzero. Emits `RewardPaid`. |
| `rewardPerToken()` | None | Returns the current global reward index. |
| `earned(address account)` | None | Returns the account’s accrued reward at the current timestamp. |

All state-changing user methods use the contract’s manual `nonReentrant` lock.

### Owner methods

| Method | Effect |
| --- | --- |
| `setRewardRate(uint256 newRate)` | Checkpoints global accounting, then changes the emission rate. Emits `RewardRateUpdated`. |
| `depositRewardTokens(uint256 amount)` | Calls `rewardToken.transferFrom(owner, pool, amount)`; owner must first approve the pool. |
| `withdrawExcessReward(uint256 amount)` | Transfers TKL from the pool to owner. No reserve calculation is enforced. |

## Events

| Event | Meaning |
| --- | --- |
| `Staked(user, amount)` | Principal was accepted from a user. |
| `Withdrawn(user, amount)` | Principal was returned to a user. |
| `RewardPaid(user, reward)` | A reward transfer was attempted and accepted by the token. |
| `RewardRateUpdated(newRate)` | Owner changed the global reward emission rate. |
| `Transfer`, `Approval`, `OwnershipTransferred` | Standard OpenZeppelin token/ownership events. |

## Frontend transaction sequence

For staking, the frontend asks for approval for the entered amount, waits for that transaction, then enables `stake`. An allowance greater than zero is not by itself enough for every amount; the component performs an additional displayed-allowance comparison before submitting `stake`.

The current frontend assumes 18 token decimals in `StakeComponent.js`. That matches this deployment but should be made dynamic before supporting arbitrary ERC-20 tokens.
