// scripts/deployTokenLocal.ts (Deploy Token & Staking - Muat Ulang)
import { ethers } from "hardhat";
import fs from "fs"; // Modul File System Node.js
import path from "path"; // Modul Path Node.js

async function main() {
  // === Deploy TokenLocal ===
  const tokenName = "Token Local";
  const tokenSymbol = "TKL";
  const decimals = 18;
  // Pasokan awal 1 Juta TKL (sesuaikan jika perlu)
  const initialSupply = ethers.parseUnits("1000000", decimals);

  console.log(`Deploying TokenLocal: ${tokenName} (${tokenSymbol})...`);
  const TokenLocalFactory = await ethers.getContractFactory("TokenLocal");
  const tokenLocal = await TokenLocalFactory.deploy(tokenName, tokenSymbol, initialSupply);
  await tokenLocal.waitForDeployment(); // Tunggu deployment selesai
  const tokenLocalAddress = await tokenLocal.getAddress(); // Dapatkan alamatnya
  console.log(`✅ TokenLocal deployed to address: ${tokenLocalAddress}`);

  // === Deploy StakingContract ===
  console.log(`Deploying StakingContract, linking to TokenLocal at: ${tokenLocalAddress}...`);
  const StakingContractFactory = await ethers.getContractFactory("StakingContract");
  // Kirim alamat TokenLocal (TKL) sebagai argumen ke constructor StakingContract
  const stakingContract = await StakingContractFactory.deploy(tokenLocalAddress);
  await stakingContract.waitForDeployment(); // Tunggu deployment selesai
  const stakingContractAddress = await stakingContract.getAddress(); // Dapatkan alamatnya
  console.log(`✅ StakingContract deployed to address: ${stakingContractAddress}`);

  // --- Menyimpan Info Kedua Kontrak ke Frontend ---
  console.log("\nWriting contract configurations to frontend...");

  // Path ke folder src frontend (*** SESUAIKAN JIKA PERLU ***)
  // Contoh ini mengasumsikan folder frontend ('my-local-token-ui')
  // berada satu level di atas folder hardhat saat ini.
  const frontendSrcPath = path.resolve(__dirname, '../../my-local-token-ui/src'); // <-- GANTI 'my-local-token-ui' jika nama folder Anda berbeda!
  const configFilePath = path.join(frontendSrcPath, 'contract-info.json');

  // Dapatkan ABI dari artifak hasil kompilasi
  const tokenArtifactPath = path.resolve(__dirname, '../artifacts/contracts/TokenLocal.sol/TokenLocal.json');
  const stakingArtifactPath = path.resolve(__dirname, '../artifacts/contracts/StakingContract.sol/StakingContract.json');

  let tokenLocalABI = [];
  let stakingContractABI = [];

  // Baca ABI TokenLocal
  try {
      console.log(`   - __dirname: ${__dirname}`);
      console.log(`   - tokenArtifactPath: ${tokenArtifactPath}`);
      const tokenArtifactContent = fs.readFileSync(tokenArtifactPath, 'utf8');
      tokenLocalABI = JSON.parse(tokenArtifactContent).abi;
      console.log(`   - TokenLocal ABI loaded successfully.`);
  } catch (error) {
      console.error(`   - Error reading TokenLocal ABI from ${tokenArtifactPath}:`, error);
  }

  // Baca ABI StakingContract
  try {
      const stakingArtifactContent = fs.readFileSync(stakingArtifactPath, 'utf8');
      stakingContractABI = JSON.parse(stakingArtifactContent).abi;
      console.log(`   - StakingContract ABI loaded successfully.`);
  } catch (error) {
      console.error(`   - Error reading StakingContract ABI from ${stakingArtifactPath}:`, error);
  }

  // Buat objek konfigurasi gabungan
  const configData = {
    tokenLocal: {
      address: tokenLocalAddress,
      abi: tokenLocalABI,
    },
    stakingContract: {
      address: stakingContractAddress,
      abi: stakingContractABI,
    }
  };

  // Pastikan direktori target ada
  if (!fs.existsSync(frontendSrcPath)) {
    console.error(`\n❌ Frontend src directory not found at: ${frontendSrcPath}`);
    console.error("   Please adjust the 'frontendSrcPath' variable in the deploy script to match your project structure.");
    process.exit(1); // Hentikan skrip jika path salah
  }

  // Tulis data konfigurasi ke file JSON
  try {
    fs.writeFileSync(
      configFilePath,
      JSON.stringify(configData, null, 2) // Format JSON dengan indentasi agar mudah dibaca
    );
    console.log(`✅ Configuration written successfully to ${configFilePath}`);
  } catch (error) {
      console.error(`\n❌ Error writing config file to ${configFilePath}:`, error);
      process.exit(1); // Hentikan skrip jika gagal menulis
  }

  console.log("\nDeployment and frontend configuration complete!");
}

// Jalankan fungsi main dan tangani error
main().catch((error) => {
  console.error("Deployment script failed:");
  console.error(error);
  process.exitCode = 1;
});
