import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

/**
 * Test keamanan cadangan StakingContract.
 *
 * CATATAN COMMIT INI: seluruh test di file ini SENGAJA GAGAL terhadap
 * kontrak saat ini. Test mendeskripsikan perilaku yang seharusnya, bukan
 * perilaku yang ada. Kegagalannya adalah bukti kerentanan.
 *
 * Akar masalah: stakingToken == rewardToken, sehingga pokok stake user dan
 * kas reward berada di saldo yang sama, sementara withdrawExcessReward()
 * tidak memeriksa apa pun sebelum mentransfer.
 *
 * Invariant yang dilanggar:  saldo kontrak >= totalStaked
 */
describe("StakingContract — keamanan cadangan", function () {
  const DECIMALS = 18;
  const tkl = (n: string) => ethers.parseUnits(n, DECIMALS);

  const POKOK = tkl("1000");

  async function deployFixture() {
    const [owner, staker] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("TokenLocal");
    const token = await Token.deploy("Token Local", "TKL", tkl("1000000"));
    await token.waitForDeployment();

    const Staking = await ethers.getContractFactory("StakingContract");
    const staking = await Staking.deploy(await token.getAddress());
    await staking.waitForDeployment();

    const stakingAddress = await staking.getAddress();

    // Staker punya modal sendiri, lalu men-stake-nya.
    await token.transfer(staker.address, POKOK);
    await token.connect(staker).approve(stakingAddress, POKOK);
    await staking.connect(staker).stake(POKOK);

    return { token, staking, stakingAddress, owner, staker };
  }

  it("owner tidak dapat menarik pokok stake milik user", async function () {
    const { token, staking, stakingAddress, owner } = await loadFixture(deployFixture);

    // Kontrak hanya berisi pokok stake — belum ada reward yang didanai.
    expect(await token.balanceOf(stakingAddress)).to.equal(POKOK);

    // Surplus yang sah = saldo - totalStaked = 0.
    // Menarik sebesar pokok berarti menarik uang orang lain: harus ditolak.
    await expect(staking.connect(owner).withdrawExcessReward(POKOK)).to.be.reverted;
  });

  it("saldo kontrak tidak pernah turun di bawah totalStaked", async function () {
    const { token, staking, stakingAddress, owner } = await loadFixture(deployFixture);

    // Owner menarik semaksimal yang kontrak izinkan.
    const saldoKontrak = await token.balanceOf(stakingAddress);
    await staking
      .connect(owner)
      .withdrawExcessReward(saldoKontrak)
      .catch(() => {
        /* Ditolak justru hasil yang diharapkan. */
      });

    // Invariant inti: apa pun yang dilakukan owner, pokok stake tetap tertutup.
    expect(await token.balanceOf(stakingAddress)).to.be.gte(await staking.totalStaked());
  });

  it("staker tetap dapat menarik seluruh pokoknya setelah owner mengambil surplus", async function () {
    const { token, staking, stakingAddress, owner, staker } = await loadFixture(deployFixture);

    const saldoKontrak = await token.balanceOf(stakingAddress);
    await staking
      .connect(owner)
      .withdrawExcessReward(saldoKontrak)
      .catch(() => {});

    // Konsekuensi nyata bagi korban: pokoknya harus tetap bisa ditarik utuh.
    await expect(staking.connect(staker).withdraw(POKOK)).to.not.be.reverted;
    expect(await token.balanceOf(staker.address)).to.equal(POKOK);
  });
});
