import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

/**
 * Kepemilikan kontrak staking.
 *
 * Kontrak ini membutuhkan owner yang hidup: hanya owner yang dapat mendanai
 * periode reward dan menarik surplus. Karena itu renounceOwnership() bawaan
 * Ownable ditutup, dan pergantian owner memakai alur dua langkah agar salah
 * ketik alamat tidak membuat kontrak menjadi yatim.
 */
describe("StakingContract — kepemilikan", function () {
  const tkl = (n: string) => ethers.parseUnits(n, 18);

  async function deployFixture() {
    const [owner, calon, orangLain] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("TokenLocal");
    const token = await Token.deploy("Token Local", "TKL", tkl("1000000"));
    await token.waitForDeployment();

    const Staking = await ethers.getContractFactory("StakingContract");
    const staking = await Staking.deploy(await token.getAddress());
    await staking.waitForDeployment();

    return { token, staking, owner, calon, orangLain };
  }

  it("kepemilikan tidak dapat dilepas", async function () {
    const { staking, owner } = await loadFixture(deployFixture);

    await expect(
      staking.connect(owner).renounceOwnership()
    ).to.be.revertedWithCustomError(staking, "TidakDapatMelepasKepemilikan");

    expect(await staking.owner()).to.equal(owner.address);
  });

  it("pergantian owner butuh penerimaan oleh calon", async function () {
    const { staking, owner, calon } = await loadFixture(deployFixture);

    await staking.connect(owner).transferOwnership(calon.address);

    // Langkah pertama belum memindahkan apa pun.
    expect(await staking.owner()).to.equal(owner.address);
    expect(await staking.pendingOwner()).to.equal(calon.address);

    await staking.connect(calon).acceptOwnership();
    expect(await staking.owner()).to.equal(calon.address);
  });

  it("hanya calon yang ditunjuk yang dapat menerima kepemilikan", async function () {
    const { staking, owner, calon, orangLain } = await loadFixture(deployFixture);

    await staking.connect(owner).transferOwnership(calon.address);

    await expect(
      staking.connect(orangLain).acceptOwnership()
    ).to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");

    expect(await staking.owner()).to.equal(owner.address);
  });

  it("alamat tujuan yang salah ketik tidak membuat kontrak yatim", async function () {
    const { staking, owner, token } = await loadFixture(deployFixture);

    // Alamat tanpa pemilik kunci: tanpa acceptOwnership, kepemilikan tak berpindah.
    const salahKetik = "0x000000000000000000000000000000000000dEaD";
    await staking.connect(owner).transferOwnership(salahKetik);

    expect(await staking.owner()).to.equal(owner.address);

    // Owner lama masih dapat menjalankan fungsinya, dan dapat membatalkan.
    await token.connect(owner).approve(await staking.getAddress(), tkl("604800"));
    await expect(
      staking.connect(owner).notifyRewardAmount(tkl("604800"), 7 * 24 * 60 * 60)
    ).to.not.be.reverted;

    await staking.connect(owner).transferOwnership(owner.address);
    expect(await staking.pendingOwner()).to.equal(owner.address);
  });
});
