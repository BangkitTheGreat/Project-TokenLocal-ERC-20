import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * Pembukuan rewardReserve.
 *
 * Commit sebelumnya hanya melindungi pokok stake: reward yang sudah menjadi
 * hak pengguna tetapi belum diklaim masih terhitung saldo bebas dan dapat
 * ditarik owner. rewardReserve menutup celah itu.
 *
 * Invariant: saldo kontrak >= totalStaked + rewardReserve
 */
describe("StakingContract — cadangan reward", function () {
  const tkl = (n: string) => ethers.parseUnits(n, 18);

  const HARI = 24 * 60 * 60;
  const TUJUH_HARI = 7 * HARI; // 604_800 detik
  const DANA = tkl("604800"); // rate tepat 1 TKL / detik
  const RATE = tkl("1");
  const TOLERANSI = tkl("5"); // longgar 5 detik untuk drift timestamp blok

  const POKOK = tkl("1000");

  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("TokenLocal");
    const token = await Token.deploy("Token Local", "TKL", tkl("1000000"));
    await token.waitForDeployment();

    const Staking = await ethers.getContractFactory("StakingContract");
    const staking = await Staking.deploy(await token.getAddress());
    await staking.waitForDeployment();

    const addr = await staking.getAddress();
    await token.transfer(alice.address, tkl("10000"));
    await token.transfer(bob.address, tkl("10000"));

    return { token, staking, addr, owner, alice, bob };
  }

  async function danai(f: any, jumlah = DANA, durasi = TUJUH_HARI) {
    await f.token.connect(f.owner).approve(f.addr, jumlah);
    await f.staking.connect(f.owner).notifyRewardAmount(jumlah, durasi);
  }

  async function stakeSebagai(f: any, who: any, jumlah: bigint) {
    await f.token.connect(who).approve(f.addr, jumlah);
    await f.staking.connect(who).stake(jumlah);
  }

  /** Memicu updateReward tanpa memindahkan dana. */
  async function sentuhPembukuan(f: any) {
    await f.staking.connect(f.owner).withdrawExcessReward(0);
  }

  it("mendanai periode akan menaikkan cadangan sebesar emisi terjadwal", async function () {
    const f = await loadFixture(deployFixture);
    await danai(f);

    expect(await f.staking.rewardReserve()).to.equal(DANA);
    expect(await f.staking.freeBalance()).to.equal(0);
  });

  it("reward yang sudah menjadi hak user tidak dapat ditarik owner", async function () {
    const f = await loadFixture(deployFixture);
    await danai(f);
    await stakeSebagai(f, f.alice, POKOK);
    await time.increase(TUJUH_HARI);

    // Hampir seluruh dana terikat: sebagian pokok, sisanya cadangan. Yang bebas
    // hanya emisi beberapa detik antara pendanaan dan stake pertama.
    const bebas = await f.staking.freeBalance();
    expect(bebas).to.be.closeTo(0, TOLERANSI);

    await expect(
      f.staking.connect(f.owner).withdrawExcessReward(bebas + 1n)
    ).to.be.revertedWithCustomError(f.staking, "MenarikDanaTerikat");

    // Haknya tetap utuh dan dapat diklaim.
    const hak = await f.staking.earned(f.alice.address);
    expect(hak).to.be.closeTo(DANA, TOLERANSI);
    await expect(f.staking.connect(f.alice).claimReward()).to.not.be.reverted;
  });

  it("cadangan berkurang sebesar reward yang dibayarkan", async function () {
    const f = await loadFixture(deployFixture);
    await danai(f);
    await stakeSebagai(f, f.alice, POKOK);
    await time.increase(1000);

    const sebelum = await f.staking.rewardReserve();
    await f.staking.connect(f.alice).claimReward();
    const sesudah = await f.staking.rewardReserve();

    expect(sebelum - sesudah).to.be.closeTo(RATE * 1000n, TOLERANSI);
  });

  it("cadangan dilepas hanya untuk interval yang benar-benar tanpa staker", async function () {
    const f = await loadFixture(deployFixture);
    await danai(f);

    // Tiga hari pertama kosong, lalu alice masuk.
    await time.increase(3 * HARI);
    await stakeSebagai(f, f.alice, POKOK);

    // Yang dilepas persis tiga hari; sisa empat hari tetap tercadang.
    const empatHari = RATE * BigInt(4 * HARI);
    expect(await f.staking.rewardReserve()).to.be.closeTo(empatHari, TOLERANSI);
    expect(await f.staking.freeBalance()).to.be.closeTo(RATE * BigInt(3 * HARI), TOLERANSI);
  });

  it("periode yang lewat jauh tanpa staker tidak melepas lebih dari satu periode", async function () {
    const f = await loadFixture(deployFixture);
    await danai(f);

    // Tiga puluh hari, padahal periodenya hanya tujuh. Tanpa clamp ke
    // periodFinish, pelepasan akan melebihi emisi yang pernah dijadwalkan.
    await time.increase(30 * HARI);
    await sentuhPembukuan(f);

    expect(await f.staking.rewardReserve()).to.equal(0);
    expect(await f.staking.freeBalance()).to.equal(DANA);
  });

  it("saldo bebas sama dengan saldo kontrak dikurangi pokok dan cadangan", async function () {
    const f = await loadFixture(deployFixture);
    await danai(f);
    await stakeSebagai(f, f.alice, POKOK);
    await stakeSebagai(f, f.bob, tkl("3000"));
    await time.increase(2000);
    await f.staking.connect(f.alice).claimReward();

    const saldo = await f.token.balanceOf(f.addr);
    const pokok = await f.staking.totalStaked();
    const cadangan = await f.staking.rewardReserve();

    expect(await f.staking.freeBalance()).to.equal(saldo - pokok - cadangan);
    expect(saldo).to.be.gte(pokok + cadangan);
  });

  it("donasi langsung ke kontrak menjadi saldo bebas dan dapat ditarik owner", async function () {
    const f = await loadFixture(deployFixture);
    await danai(f);
    await stakeSebagai(f, f.alice, POKOK);

    const donasi = tkl("500");
    await f.token.connect(f.bob).transfer(f.addr, donasi);

    // Donasi ditambah emisi beberapa detik sebelum staker pertama masuk.
    const bebas = await f.staking.freeBalance();
    expect(bebas).to.be.closeTo(donasi, TOLERANSI);

    // Persis sebesar saldo bebas, tidak lebih.
    await expect(
      f.staking.connect(f.owner).withdrawExcessReward(bebas + 1n)
    ).to.be.revertedWithCustomError(f.staking, "MenarikDanaTerikat");
    await expect(f.staking.connect(f.owner).withdrawExcessReward(bebas)).to.not.be.reverted;
    expect(await f.staking.freeBalance()).to.equal(0);
  });
});
