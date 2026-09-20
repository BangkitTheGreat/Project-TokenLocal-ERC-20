# Development and Verification Guide

## Environment

TokenLocal has two independent Node.js applications:

| Directory | Role | Lockfile |
| --- | --- | --- |
| repository root | Hardhat contracts, TypeScript scripts, tests | `package-lock.json` |
| `my-local-token-ui/` | React / Create React App frontend | `my-local-token-ui/package-lock.json` |

Use a current Node.js LTS release and npm. Install each dependency set from its own directory:

```bash
# Smart contracts and Hardhat tooling
npm ci

# React dApp
cd my-local-token-ui
npm ci
```

Use `npm ci` for a clean reproducible install. If a dependency is intentionally changed, update `package.json` and its matching lockfile together.

## Run locally

The local stack needs three processes.

Terminal one — start Hardhat’s persistent local chain:

```bash
npm run node
```

Terminal two — deploy the contracts once the node is ready:

```bash
npm run deploy:local
```

Terminal three — run the React frontend:

```bash
cd my-local-token-ui
npm start
```

Open `http://localhost:3000`. MetaMask must point to `http://127.0.0.1:8545` with chain ID `31337` and use an account imported from the active Hardhat node output.

## Quality gates

Run the following before merging a contract, deploy-script, or UI behavior change:

```bash
# repository root
npx hardhat compile
npx hardhat test
npx tsc --noEmit

# frontend
cd my-local-token-ui
CI=true npm run build
```

Expected results at the documented repository state:

- Hardhat compiles Solidity and generates TypeChain types without diagnostics.
- Hardhat/Chai completes the `TokenLocal` suite.
- TypeScript completes without diagnostics.
- Create React App completes an optimized production build.

The frontend dependency tree may report deprecated transitive packages and audit findings during installation. Treat these as maintenance work to review; do not resolve them blindly with forced upgrades in a smart-contract project.

## Current automated coverage

`test/TokenTest.ts` uses Hardhat, Chai, and fixtures to verify `TokenLocal` behavior.

| Area | Covered behavior |
| --- | --- |
| Deployment | Name, symbol, decimals, total supply, deployer balance, initial owner. |
| Transfers | Transfers between accounts and standard `Transfer` events. |
| Insufficient balance | OpenZeppelin custom-error reverts. |
| Allowance | Approval and `Approval` event. |
| Mint control | Owner can mint; non-owner reverts. |

Not yet covered automatically:

- all `StakingContract` state transitions;
- reward accrual across time and multiple users;
- stake/withdraw/claim edge cases;
- funding and solvency behavior;
- frontend component behavior or browser-wallet flows;
- deployment-script output path and metadata handoff.

A passing token suite is not a security audit.

## Manual smoke test

Use only accounts printed by the current local Hardhat node. Do not test with real private keys or a wallet that holds value.

### Contract deployment and metadata

1. Start a fresh Hardhat node.
2. Correct the `frontendSrcPath` issue described below before running deployment automation.
3. Deploy TokenLocal and StakingContract to `localhost`.
4. Confirm `my-local-token-ui/src/contract-info.json` contains fresh address and ABI entries for `tokenLocal` and `stakingContract`.
5. Confirm each address has deployed bytecode using Hardhat console or an ethers provider.

### Token flow

1. Import the deployer and a second local account into MetaMask.
2. Connect the deployer to the dApp and verify name, symbol, decimals, supply, and wallet balance.
3. Transfer a small amount of TKL to the second account.
4. Switch MetaMask to the second account and verify the displayed balance.
5. As token owner, mint a small amount to the second account and confirm total supply increases.
6. As the second account, attempt to mint and confirm the transaction reverts.

### Staking flow

1. As owner, approve the staking contract and call `depositRewardTokens` to fund reward liquidity.
2. As a user, enter a small stake amount and approve the pool.
3. Wait for approval confirmation, then stake.
4. Confirm wallet TKL decreases and the displayed stake increases.
5. Wait for local blocks/time to advance, refresh data, and confirm a pending reward is reported.
6. Claim reward and confirm wallet balance changes.
7. Withdraw a partial amount, then the remaining stake, and confirm principal is returned.
8. Try a withdrawal exceeding the user stake and confirm it fails.

### Network reset behavior

1. Stop and restart `npx hardhat node`.
2. Confirm previously deployed contract addresses no longer represent the current chain state.
3. Redeploy and regenerate `contract-info.json`.
4. Reload/reconnect the frontend and repeat a small token read.

## Deployment metadata handoff

`scripts/deployTokenLocal.ts` is responsible for deployment and for exporting current addresses/ABIs to the React frontend. Its intended output file is:

```text
my-local-token-ui/src/contract-info.json
```

The current code uses:

```ts
const frontendSrcPath = path.resolve(__dirname, '../../my-local-token-ui/src');
```

With `__dirname` in `scripts/`, the value resolves outside this repository. Correct it to:

```ts
const frontendSrcPath = path.resolve(__dirname, '../my-local-token-ui/src');
```

Then redeploy. Do not hand-edit a production address into the frontend as a substitute for a verifiable deployment process.

## Adding or changing a contract feature

1. Define expected invariants before implementation.
2. Write a failing Hardhat test for the success path, relevant authorization failure, and boundary/revert condition.
3. Implement the smallest Solidity change that satisfies the tests.
4. Run compile, tests, and TypeScript checks.
5. Update deployment metadata if the ABI changed.
6. Update frontend calls only after confirming ABI compatibility.
7. Build the frontend and execute the relevant manual wallet smoke test.
8. Update `README.md`, `DOMAIN-MODEL.md`, `SMART-CONTRACTS.md`, and `SECURITY.md` for externally visible changes.

## Recommended staking-test plan

Add a dedicated `test/StakingContract.test.ts` with fixtures that deploy TKL and the pool, distribute user balances, and fund rewards.

| Scenario | Assertions |
| --- | --- |
| Stake validation | Zero stake reverts; stake without approval reverts; stake with approval transfers principal. |
| Pool accounting | `stakes[user]` and `totalStaked` update correctly on stake and withdrawal. |
| Withdrawal safety | Zero withdrawal and over-withdrawal revert; valid withdrawal returns principal. |
| One-user reward | `earned` grows after time advances; claim clears stored credit and transfers TKL. |
| Multi-user reward | Reward allocation is proportional to each stake and time at stake. |
| Rate update | Pre-change accrual is preserved; new rate applies only after checkpoint. |
| Access control | Non-owner cannot set rate, fund rewards, or withdraw pool tokens. |
| Solvency | Claims fail predictably when underfunded; owner withdrawals cannot break protected reserve once that rule is implemented. |
| Reentrancy | State remains consistent when interacting with adversarial token/receiver scenarios, if the design is extended to support them. |

## Security and secret handling

- Keep `.env` files out of Git. The root `.gitignore` already excludes `.env`.
- Never commit private keys, seed phrases, RPC credentials, or API keys.
- Hardhat development private keys are disposable local-test material only. Never import them into a funded public wallet.
- The current code is local-only. Adding a testnet or mainnet RPC must use environment variables and explicit network configuration, never hardcoded credentials.
- Do not run `npm audit fix --force` without reviewing breaking dependency changes, generated artifacts, and the test suite.

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| `hardhat` reports a non-local installation | Root dependencies are missing. | Run `npm ci` in the repository root. |
| UI says configuration is invalid | `contract-info.json` is empty or stale. | Fix deploy output path, redeploy on the active local node, then reload the UI. |
| UI connects but reads fail | MetaMask is on another network or addresses came from an older node session. | Use chain ID 31337, redeploy, update metadata, reconnect. |
| Stake fails | Approval is missing/insufficient or user balance is too low. | Approve at least the intended amount, await confirmation, then stake. |
| Claim fails | Pool has insufficient liquid TKL. | Fund rewards as owner and ensure principal is reserved. |
| Previous balances disappeared | Local Hardhat node was restarted. | Expected; deploy again and regenerate metadata. |
| Build shows Browserslist warning | Browser compatibility data is outdated. | Review and update it separately; it does not by itself invalidate a successful build. |
