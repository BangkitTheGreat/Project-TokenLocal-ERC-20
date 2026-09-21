import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * Periode reward berdana.
 *
 * Kontrak lama menetapkan rewardRate = 0.1 TKL/detik di constructor, tanpa
 * batas waktu dan tanpa kas pendukung — sekitar 3,15 juta TKL per tahun atas
 * supply 1 juta. Emisi kini hanya berjalan selama periode yang dananya sudah
 * benar-benar masuk, sehingga over-promise mustahil secara konstruksi.
 */
describe("StakingContract — periode reward berdana", function () {
  const tkl = (n: string) => ethers.parseUnits(n, 18);

  const TUJUH_HARI = 7 * 24 * 60 * 60; // 604_800 detik
  const DANA = tkl("604800"); // rate tepat 1 TKL / detik
  const RATE = tkl("1");
  const TOLERANSI = tkl("5"); // longgar 5 detik untuk drift timestamp blok

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

  it("reward berhenti pada akhir periode", async function () {
    const f = await loadFixture(deployFixture);
    await danai(f);
    await stakeSebagai(f, f.alice, tkl("1000"));

    await time.increase(TUJUH_HARI);
    const saatSelesai = await f.staking.earned(f.alice.address);
    expect(saatSelesai).to.be.closeTo(DANA, TOLERANSI);

    // Tujuh hari berikutnya tidak boleh menambah apa pun.
    await time.increase(TUJUH_HARI);
    expect(await f.staking.earned(f.alice.address)).to.equal(saatSelesai);
  });

  it("periode baru ditolak selama periode lama masih aktif", async function () {
    const f = await loadFixture(deployFixture);
    await danai(f);

    await f.token.connect(f.owner).approve(f.addr, DANA);
    await expect(
      f.staking.connect(f.owner).notifyRewardAmount(DANA, TUJUH_HARI)
    ).to.be.revertedWithCustomError(f.staking, "PeriodeMasihAktif");
  });

  it("periode baru diterima setelah periode lama selesai", async function () {
    const f = await loadFixture(deployFixture);
    await danai(f);
    await time.increase(TUJUH_HARI + 1);

    // Sisa dana owner sudah di bawah DANA, jadi periode kedua didanai separuh.
    const separuh = DANA / 2n;
    await expect(danai(f, separuh)).to.not.be.reverted;
    expect(await f.staking.rewardRate()).to.equal(RATE / 2n);
  });

  it("emisi saat tidak ada staker tidak diberikan ke staker yang masuk kemudian", async function () {
    const f = await loadFixture(deployFixture);
    await danai(f);

    // Tiga hari pertama kosong.
    await time.increase(3 * 24 * 60 * 60);
    await stakeSebagai(f, f.alice, tkl("1000"));
    await time.increase(TUJUH_HARI);

    // Hanya empat hari sisa periode yang menjadi haknya.
    const empatHari = RATE * BigInt(4 * 24 * 60 * 60);
    expect(await f.staking.earned(f.alice.address)).to.be.closeTo(empatHari, TOLERANSI);
  });

  it("dua staker berbagi emisi secara proporsional", async function () {
    const f = await loadFixture(deployFixture);
    await danai(f);
    await stakeSebagai(f, f.alice, tkl("1000"));
    await stakeSebagai(f, f.bob, tkl("3000"));

    await time.increase(1000);

    const alice = await f.staking.earned(f.alice.address);
    const bob = await f.staking.earned(f.bob.address);

    expect(alice).to.be.closeTo(tkl("250"), TOLERANSI);
    expect(bob).to.be.closeTo(tkl("750"), TOLERANSI);
  });

  it("penarikan pokok tidak ikut mengklaim reward", async function () {
    const f = await loadFixture(deployFixture);
    await danai(f);
    await stakeSebagai(f, f.alice, tkl("1000"));
    await time.increase(1000);

    await f.staking.connect(f.alice).withdraw(tkl("1000"));

    expect(await f.staking.stakes(f.alice.address)).to.equal(0);
    const tertunda = await f.staking.earned(f.alice.address);
    expect(tertunda).to.be.gt(0);

    // Hak reward tetap dapat diklaim setelah seluruh pokok ditarik.
    await expect(f.staking.connect(f.alice).claimReward()).to.not.be.reverted;
    expect(await f.staking.earned(f.alice.address)).to.equal(0);
  });

  it("sisa pembagian tidak dijanjikan sebagai reward", async function () {
    const f = await loadFixture(deployFixture);

    // 1000 wei dibagi 3 detik -> rate 333, terjadwal 999, sisa 1 wei jadi saldo bebas.
    await f.token.connect(f.owner).approve(f.addr, 1000n);
    await f.staking.connect(f.owner).notifyRewardAmount(1000n, 3n);

    expect(await f.staking.rewardRate()).to.equal(333n);
    expect(await f.staking.totalScheduled()).to.equal(999n);
  });

  it("jumlah dan durasi tidak valid ditolak saat konfigurasi", async function () {
    const f = await loadFixture(deployFixture);
    const s = f.staking.connect(f.owner);

    await expect(s.notifyRewardAmount(DANA, 0)).to.be.revertedWithCustomError(
      f.staking, "DurasiTidakValid"
    );
    await expect(
      s.notifyRewardAmount(DANA, 366 * 24 * 60 * 60)
    ).to.be.revertedWithCustomError(f.staking, "DurasiTidakValid");
    await expect(s.notifyRewardAmount(0, TUJUH_HARI)).to.be.revertedWithCustomError(
      f.staking, "JumlahNol"
    );
    // Dana lebih kecil dari durasi -> rate membulat ke nol.
    await expect(s.notifyRewardAmount(5n, 10n)).to.be.revertedWithCustomError(
      f.staking, "RateNol"
    );
  });

  it("hanya owner yang dapat mendanai periode", async function () {
    const f = await loadFixture(deployFixture);
    await f.token.connect(f.alice).approve(f.addr, tkl("1000"));
    await expect(
      f.staking.connect(f.alice).notifyRewardAmount(tkl("1000"), TUJUH_HARI)
    ).to.be.revertedWithCustomError(f.staking, "OwnableUnauthorizedAccount");
  });
});
