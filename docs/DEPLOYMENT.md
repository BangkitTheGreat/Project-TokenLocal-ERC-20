# Local deployment guide

## Prerequisites

Install Node.js LTS, npm, and a browser wallet such as MetaMask. This project is configured for a local Hardhat node, not a public chain.

Install dependencies separately for the contracts and UI:

```bash
# repository root
npm ci

# React application
cd my-local-token-ui
npm ci
```

## Verify before deployment

From the repository root:

```bash
npx hardhat compile
npx hardhat test
npx tsc --noEmit
```

The current automated suite exercises `TokenLocal`; it does not yet cover `StakingContract`.

## Run the local chain

In terminal one:

```bash
npm run node
```

Hardhat starts an HTTP JSON-RPC endpoint at `http://127.0.0.1:8545` and prints funded development accounts. Keep this process running throughout deployment and frontend use.

Do not use the private keys printed by a development node on a public network or with real value.

## Configure MetaMask

Create or select a custom network with:

| Field | Value |
| --- | --- |
| Network name | Hardhat Localhost |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency symbol | `ETH` |

Import one account from the local Hardhat node output into MetaMask. The dApp rejects connections to networks other than chain ID `31337`.

## Deploy contracts

In terminal two, from the repository root:

```bash
npx hardhat run scripts/deployTokenLocal.ts --network localhost
```

The script deploys:

1. `TokenLocal` with `1,000,000` TKL initial display units.
2. `StakingContract`, configured to use the TokenLocal address for both principal and rewards.
3. A JSON metadata object containing both deployed addresses and ABIs.

### Fix the metadata output path first

The current script defines:

```ts
path.resolve(__dirname, '../../my-local-token-ui/src')
```

Because `__dirname` is the repository’s `scripts/` directory, that expression resolves outside the cloned repository. Change the code to target the actual UI directory before deployment, for example:

```ts
const frontendSrcPath = path.resolve(__dirname, '../my-local-token-ui/src');
```

Then rerun the deployment. This overwrites `my-local-token-ui/src/contract-info.json` with addresses and ABI data from the active local chain.

If you choose not to alter the script, copy the generated configuration to `my-local-token-ui/src/contract-info.json` yourself. The UI cannot interact with newly deployed contracts until this file contains their current addresses and ABIs.

## Start the dApp

In terminal three:

```bash
cd my-local-token-ui
npm start
```

Navigate to `http://localhost:3000` and connect the MetaMask account imported from Hardhat.

## Seed a staking reward pool

`StakingContract` pays rewards from its own TKL balance. The initial token supply is held by the token deployer, not automatically deposited into the staking pool. Before a user can successfully claim rewards, fund the pool using the owner account:

1. Approve the staking contract to spend TKL.
2. Call `depositRewardTokens(amount)` on the staking contract.

This can be performed in an ethers script, a console, or a future owner UI. Ensure the pool keeps enough tokens to satisfy both staked principal withdrawals and accrued reward claims because the implementation uses one token balance for both.

## Frontend production build

```bash
cd my-local-token-ui
CI=true npm run build
```

The generated `build/` directory is static frontend output. It does not deploy contracts or provide a backend.

## Troubleshooting

| Symptom | Likely cause | Resolution |
| --- | --- | --- |
| Wallet connection asks for another network | MetaMask is not on chain ID 31337 | Select the local Hardhat network and reconnect. |
| Calls fail with missing/invalid contract target | `contract-info.json` has stale address/ABI data | Deploy again on the active node and refresh the metadata file. |
| Calls revert after restarting the node | The old chain state and contracts were discarded | Redeploy contracts, update metadata, and reconnect the UI. |
| Stake fails | No approval or insufficient allowance | Approve at least the entered stake amount, wait for confirmation, then stake. |
| Claim reward fails | Pool balance is insufficient | Fund the staking contract with TKL using the owner account. |
| Frontend cannot find updated metadata | Deploy script writes outside the repo | Apply the path correction above, then rerun deployment. |

## Development checklist

- [ ] Compile and run contract tests.
- [ ] Start a fresh local node.
- [ ] Deploy token and staking contracts.
- [ ] Confirm `contract-info.json` contains both fresh contract entries.
- [ ] Connect a local funded account in MetaMask.
- [ ] Verify token balance reads correctly.
- [ ] Transfer a small amount between local accounts.
- [ ] Fund the staking pool before claiming rewards.
- [ ] Approve, stake, withdraw, and claim with small test amounts.
