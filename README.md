# TokenLocal — ERC-20 Token (Hardhat + TypeScript)

Token ERC-20 berbasis **OpenZeppelin** yang dibangun sebagai latihan memahami siklus penuh smart contract: tulis → test → deploy → verifikasi.

## Kontrak

`contracts/TokenLocal.sol` — mewarisi `ERC20` dan `Ownable` dari OpenZeppelin:

- Constructor menerima nama, simbol, dan initial supply, lalu mint seluruh supply ke deployer
- `mint(address, amount)` dengan modifier `onlyOwner` — hanya owner yang bisa menambah supply
- Fungsi standar ERC-20 (transfer, approve, allowance, dst.) diwarisi langsung dari OpenZeppelin, tidak ditulis ulang

## Testing

`test/TokenTest.ts` — Hardhat + Chai, mencakup:

- **Deployment**: nama/simbol/decimals benar, seluruh supply masuk ke owner, deployer = owner awal
- **Transaksi**: transfer antar akun (cek event `Transfer`), transfer gagal saat saldo kurang, update allowance (cek event `Approval`)

```bash
npx hardhat test
```

## Deploy

`scripts/deployTokenLocal.ts` — deploy dengan argumen constructor, lalu jalankan verifikasi pasca-deploy otomatis: membandingkan owner, nama, simbol, decimals, total supply, dan saldo owner terhadap nilai yang diharapkan.

```bash
npx hardhat node                                        # jalankan chain lokal
npx hardhat run scripts/deployTokenLocal.ts --network localhost
```

## Stack

Solidity 0.8.21 · Hardhat · TypeScript · OpenZeppelin Contracts 5 · Chai
