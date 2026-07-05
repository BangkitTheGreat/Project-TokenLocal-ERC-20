# TokenLocal — ERC-20 Token + Staking DApp (Hardhat + TypeScript + React)

Proyek DApp lengkap sebagai latihan memahami siklus penuh smart contract: tulis → test → deploy → verifikasi → interaksi lewat UI. Terdiri dari token ERC-20, kontrak staking dengan reward per detik, dan antarmuka React.

## Kontrak

### `contracts/TokenLocal.sol` — token ERC-20

Mewarisi `ERC20` dan `Ownable` dari OpenZeppelin:

- Constructor menerima nama, simbol, dan initial supply, lalu mint seluruh supply ke deployer
- `mint(address, amount)` dengan modifier `onlyOwner` — hanya owner yang bisa menambah supply
- Fungsi standar ERC-20 (transfer, approve, allowance, dst.) diwarisi langsung dari OpenZeppelin, tidak ditulis ulang

### `contracts/StakingContract.sol` — staking dengan akumulasi reward

Pola *reward-per-token* (gaya Synthetix StakingRewards): reward dihitung per detik untuk seluruh staker, akumulasi dilacak lewat `rewardPerTokenStored` dan `userRewardPerTokenPaid` sehingga tidak perlu loop per user.

- `stake` / `withdraw` — setor dan tarik token TKL
- `earned` / `rewardPerToken` — view untuk reward tertunda
- `claimReward` — klaim reward (event `RewardPaid`)
- Owner: `setRewardRate`, `depositRewardTokens`, `withdrawExcessReward`

## Testing

`test/TokenTest.ts` — Hardhat + Chai, 12 test case:

- **Deployment**: nama/simbol/decimals benar, seluruh supply masuk ke owner, deployer = owner awal
- **Transaksi**: transfer antar akun (cek event `Transfer`), transfer gagal saat saldo kurang, update allowance (cek event `Approval`)
- **Access control**: minting hanya oleh owner

```bash
npx hardhat test
```

## Deploy & jalankan UI

`scripts/deployTokenLocal.ts` — deploy dengan verifikasi pasca-deploy otomatis: membandingkan owner, nama, simbol, decimals, total supply, dan saldo owner terhadap nilai yang diharapkan.

```bash
npx hardhat node                                        # 1. chain lokal
npx hardhat run scripts/deployTokenLocal.ts --network localhost   # 2. deploy
cd my-local-token-ui && npm install && npm start        # 3. UI React
```

## UI — `my-local-token-ui/`

React 19 + ethers 6: koneksi wallet, info token, transfer, dan komponen staking (`StakeComponent.js`) untuk stake/withdraw/klaim reward terhadap kontrak di chain lokal.

## Stack

Solidity 0.8.21 · Hardhat · TypeScript · OpenZeppelin Contracts 5 · Chai · React 19 · ethers 6
