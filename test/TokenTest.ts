import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("TokenLocal (ERC20 Standard)", function () {

  // Fixture untuk men-deploy kontrak TokenLocal sebagai ERC20
  async function deployTokenLocalFixture() {
    // Tentukan parameter untuk constructor
    const tokenName = "Token Local";
    const tokenSymbol = "TKL";
    const decimals = 18;
    const initialSupply = ethers.parseUnits("1000000", decimals); // 1 Juta token

    // Dapatkan Signer
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Dapatkan factory dan deploy dengan argumen
    const TokenLocalFactory = await ethers.getContractFactory("TokenLocal");
    const tokenLocal = await TokenLocalFactory.deploy(tokenName, tokenSymbol, initialSupply);
    await tokenLocal.waitForDeployment();

    // Kembalikan semua yang dibutuhkan tes
    return { tokenLocal, owner, addr1, addr2, tokenName, tokenSymbol, decimals, initialSupply };
  }

  describe("Deployment", function () {
    it("Should set the right name, symbol, and decimals", async function () {
      const { tokenLocal, tokenName, tokenSymbol, decimals } = await loadFixture(deployTokenLocalFixture);
      expect(await tokenLocal.name()).to.equal(tokenName);
      expect(await tokenLocal.symbol()).to.equal(tokenSymbol);
      expect(await tokenLocal.decimals()).to.equal(decimals); // decimals() mengembalikan BigInt
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const { tokenLocal, owner, initialSupply } = await loadFixture(deployTokenLocalFixture);
      const ownerBalance = await tokenLocal.balanceOf(owner.address);
      expect(await tokenLocal.totalSupply()).to.equal(initialSupply);
      expect(ownerBalance).to.equal(initialSupply);
    });

     it("Should set the deployer as the initial owner (Ownable)", async function () {
       const { tokenLocal, owner } = await loadFixture(deployTokenLocalFixture);
       expect(await tokenLocal.owner()).to.equal(owner.address);
     });
  });

  describe("Transactions (ERC20)", function () {
    it("Should transfer tokens between accounts", async function () {
      const { tokenLocal, owner, addr1, addr2, initialSupply } = await loadFixture(deployTokenLocalFixture);
      const amountToSend = ethers.parseUnits("100", 18);

      // Owner -> addr1
      await expect(tokenLocal.transfer(addr1.address, amountToSend))
            .to.emit(tokenLocal, "Transfer")
            .withArgs(owner.address, addr1.address, amountToSend);
      expect(await tokenLocal.balanceOf(addr1.address)).to.equal(amountToSend);
      expect(await tokenLocal.balanceOf(owner.address)).to.equal(initialSupply - amountToSend);

      // addr1 -> addr2
      const amountToSend2 = ethers.parseUnits("50", 18);
      await expect(tokenLocal.connect(addr1).transfer(addr2.address, amountToSend2))
            .to.emit(tokenLocal, "Transfer")
            .withArgs(addr1.address, addr2.address, amountToSend2);
      expect(await tokenLocal.balanceOf(addr2.address)).to.equal(amountToSend2);
      expect(await tokenLocal.balanceOf(addr1.address)).to.equal(amountToSend - amountToSend2);
    });

    it("Should fail if sender doesn’t have enough tokens", async function () {
      const { tokenLocal, owner, addr1, initialSupply } = await loadFixture(deployTokenLocalFixture);

      // addr1 (saldo 0) coba kirim
      await expect(tokenLocal.connect(addr1).transfer(owner.address, ethers.parseUnits("1", 18)))
            .to.be.revertedWithCustomError(tokenLocal, "ERC20InsufficientBalance") // Custom error OZ v5+
            .withArgs(addr1.address, 0, ethers.parseUnits("1", 18)); // (sender, available, required)

      // owner coba kirim lebih dari saldo
      const ownerBalance = await tokenLocal.balanceOf(owner.address);
      await expect(tokenLocal.transfer(addr1.address, ownerBalance + BigInt(1)))
            .to.be.revertedWithCustomError(tokenLocal, "ERC20InsufficientBalance")
            .withArgs(owner.address, ownerBalance, ownerBalance + BigInt(1));
    });

    // Anda bisa menambahkan tes untuk approve dan transferFrom di sini!
    // Contoh:
    it("Should update allowance", async function () {
        const { tokenLocal, owner, addr1 } = await loadFixture(deployTokenLocalFixture);
        const amount = ethers.parseUnits("100", 18);
        await expect(tokenLocal.approve(addr1.address, amount))
            .to.emit(tokenLocal, "Approval")
            .withArgs(owner.address, addr1.address, amount);
        expect(await tokenLocal.allowance(owner.address, addr1.address)).to.equal(amount);
    });
  });

  describe("Access Control / Minting", function () {
    it("Should allow the owner to mint new tokens", async function () {
        const { tokenLocal, owner, addr1, initialSupply, decimals } = await loadFixture(deployTokenLocalFixture);
        const amountToMint = ethers.parseUnits("500", decimals);
        const initialTotalSupply = await tokenLocal.totalSupply();
        const initialAddr1Balance = await tokenLocal.balanceOf(addr1.address);

        // Owner mint ke addr1
        await expect(tokenLocal.mint(addr1.address, amountToMint))
            .to.emit(tokenLocal, "Transfer") // Minting memancarkan event Transfer dari alamat 0
            .withArgs(ethers.ZeroAddress, addr1.address, amountToMint);

        // Verifikasi saldo dan total supply bertambah
        expect(await tokenLocal.balanceOf(addr1.address)).to.equal(initialAddr1Balance + amountToMint);
        expect(await tokenLocal.totalSupply()).to.equal(initialTotalSupply + amountToMint);
      });

    it("Should prevent non-owners from calling the mint function", async function () {
      const { tokenLocal, addr1, addr2, decimals } = await loadFixture(deployTokenLocalFixture);
      const amountToMint = ethers.parseUnits("100", decimals);

      // addr1 (non-owner) coba mint ke addr2
      // --- INI PERBAIKAN UNTUK ERROR ASLI ANDA ---
      await expect(tokenLocal.connect(addr1).mint(addr2.address, amountToMint))
            .to.be.revertedWithCustomError(tokenLocal, "OwnableUnauthorizedAccount")
            .withArgs(addr1.address);
    });
  });
});