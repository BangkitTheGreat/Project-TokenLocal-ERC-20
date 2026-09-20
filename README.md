# TokenLocal ERC-20 & Staking DApp

TokenLocal is a local-first Web3 learning project. It combines an ERC-20 token, an experimental staking contract, a Hardhat development environment, and a React dApp that connects through a browser wallet.

It is designed for development and education on a private Hardhat chain (chain ID `31337`). It is not audited and is not ready for a public network, real funds, or production use.

## What is included

| Area | Location | Purpose |
| --- | --- | --- |
| ERC-20 token | `contracts/TokenLocal.sol` | OpenZeppelin-based fungible token with owner-controlled minting. |
| Staking | `contracts/StakingContract.sol` | Experimental reward-per-token staking pool paid in TKL. |
| Contract tooling | `hardhat.config.ts`, `scripts/`, `test/` | Compile, test, deploy, and generate frontend contract metadata. |
| Web dApp | `my-local-token-ui/` | React interface for wallet connection, token actions, and staking actions. |

## Quick start

Prerequisites:

- Node.js LTS and npm
- A browser wallet such as MetaMask
- A local Hardhat network configured in the wallet

Install the smart-contract dependencies and verify the current contract suite:

```bash
npm ci
npx hardhat compile
npx hardhat test
npx tsc --noEmit
```

Start a persistent local chain in terminal one:

```bash
npm run node
```

In terminal two, deploy the contracts:

```bash
npx hardhat run scripts/deployTokenLocal.ts --network localhost
```

Then start the frontend:

```bash
cd my-local-token-ui
npm ci
npm start
```

Open `http://localhost:3000`, connect MetaMask to `http://127.0.0.1:8545` using chain ID `31337`, and import a development account supplied by `npx hardhat node`.

Important: the deploy script currently resolves the frontend output directory one level too high (`../../my-local-token-ui/src`). Before relying on automated metadata synchronization, correct `frontendSrcPath` in `scripts/deployTokenLocal.ts` to point to this repository’s `my-local-token-ui/src` directory, or copy the generated `contract-info.json` there manually. See [Deployment guide](docs/DEPLOYMENT.md).

## Common commands

| Command | Runs |
| --- | --- |
| `npm run node` | Local Hardhat JSON-RPC node on port 8545. |
| `npx hardhat compile` | Solidity compilation and TypeChain generation. |
| `npx hardhat test` | Existing Hardhat/Chai contract tests. |
| `npx tsc --noEmit` | Type-checks the Hardhat TypeScript files. |
| `npm run deploy:local` | Deploys token and staking contracts to `localhost`. |
| `cd my-local-token-ui && npm start` | Starts the React development server. |
| `cd my-local-token-ui && npm run build` | Produces an optimized frontend build. |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — component boundaries, data flow, and repository structure.
- [Smart-contract reference](docs/SMART-CONTRACTS.md) — token and staking interfaces, state, events, and reward accounting.
- [Deployment guide](docs/DEPLOYMENT.md) — local environment, wallet setup, deployment flow, and troubleshooting.
- [Security and operational notes](docs/SECURITY.md) — current trust assumptions, known risks, and a production-readiness checklist.

## Verification status

The repository’s contract test suite currently covers `TokenLocal`: deployment metadata, initial supply ownership, transfers, insufficient-balance reverts, approvals, and owner-only minting. The staking contract and React UI do not currently have automated tests. A passing token suite does not constitute a security audit of either contract.

## License

No license file is currently included. Do not assume permission to redistribute or deploy this code beyond its repository terms until a license is added.
