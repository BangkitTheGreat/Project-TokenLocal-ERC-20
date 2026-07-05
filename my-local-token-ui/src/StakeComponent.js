// src/StakeComponent.js
import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import './App.css'; // Gunakan gaya dari App.css

// Menerima props yang diperlukan dari App.js
function StakeComponent({ signer, account, tokenLocalContract, stakingContract, tokenSymbol }) {
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [allowance, setAllowance] = useState('0');
  const [stakedBalance, setStakedBalance] = useState('0');
  const [pendingRewards, setPendingRewards] = useState('0');
  const [tklBalance, setTklBalance] = useState('0');
  const [txStatus, setTxStatus] = useState('');
  const [isLoading, setIsLoading] = useState({
      allowance: false,
      approve: false,
      stake: false,
      unstake: false,
      claim: false,
      data: false
  });

  const tokenDecimals = 18; // Asumsi desimal TKL adalah 18

  // Fungsi untuk memuat semua data staking relevan
  const loadStakingData = useCallback(async () => {
      if (!stakingContract || !tokenLocalContract || !account || !signer) return;
      console.log(">>> StakeComponent: Loading staking data...");
      setIsLoading(prev => ({...prev, data: true, allowance: true}));
      try {
          // 1. Cek Allowance
          const currentAllowance = await tokenLocalContract.allowance(account, stakingContract.target);
          const allowanceFormatted = ethers.formatUnits(currentAllowance, tokenDecimals);
          setAllowance(allowanceFormatted);
          // Anggap sudah approve jika allowance > 0 (penyederhanaan)
          // Idealnya cek apakah allowance >= amount yg mau di stake
          setIsApproved(currentAllowance > 0n); // Gunakan BigInt comparison
          console.log(">>> StakeComponent: Allowance check success:", allowanceFormatted);
          setIsLoading(prev => ({...prev, allowance: false}));

          // 2. Ambil data staking lainnya secara paralel
          const [staked, rewards, balance] = await Promise.all([
              stakingContract.stakes(account),
              stakingContract.earned(account),
              tokenLocalContract.balanceOf(account)
          ]);

          setStakedBalance(ethers.formatUnits(staked, tokenDecimals));
          setPendingRewards(ethers.formatUnits(rewards, tokenDecimals));
          setTklBalance(ethers.formatUnits(balance, tokenDecimals));
          console.log(">>> StakeComponent: Staked, rewards, balance loaded.");

      } catch (error) {
          console.error(">>> StakeComponent: Error loading staking data:", error);
          setTxStatus(`Gagal memuat data staking: ${error.reason || error.message}`);
          // Reset state jika gagal total
          setAllowance('0'); setIsApproved(false); setStakedBalance('0'); setPendingRewards('0'); setTklBalance('0');
      } finally {
           setIsLoading(prev => ({...prev, data: false, allowance: false}));
      }
  }, [account, stakingContract, tokenLocalContract, signer]); // Tambahkan signer sebagai dependency

  // Load data saat komponen mount atau saat akun/kontrak berubah
  useEffect(() => {
      loadStakingData();
  }, [loadStakingData]); // Trigger saat loadStakingData berubah (termasuk dependensinya)

  // Fungsi Approve
  const handleApprove = async () => {
    if (!tokenLocalContract || !stakingContract || !stakeAmount) {
        alert("Masukkan jumlah token untuk di-approve.");
        return;
    }
    setIsLoading(prev => ({...prev, approve: true}));
    setTxStatus(`Meminta persetujuan (approve) untuk ${stakeAmount} ${tokenSymbol}...`);
    try {
        const amountToApprove = ethers.parseUnits(stakeAmount, tokenDecimals);
        // Beri approve sejumlah yang ingin di-stake (atau jumlah besar seperti MaxUint256)
        // const tx = await tokenLocalContract.connect(signer).approve(stakingContract.target, ethers.MaxUint256);
        const tx = await tokenLocalContract.connect(signer).approve(stakingContract.target, amountToApprove);
        setTxStatus(`Menunggu konfirmasi approve... Hash: ${tx.hash}`);
        await tx.wait();
        setTxStatus(`Approve ${stakeAmount} ${tokenSymbol} berhasil!`);
        setIsApproved(true); // Update status approval
        loadStakingData(); // Refresh allowance
    } catch (error) {
        console.error("Approve gagal:", error);
        setTxStatus(`Approve gagal: ${error.reason || error.message}`);
    } finally {
        setIsLoading(prev => ({...prev, approve: false}));
    }
  };

  // Fungsi Stake
  const handleStake = async () => {
    if (!stakingContract || !stakeAmount || !isApproved) {
        alert("Masukkan jumlah, pastikan sudah approve, dan coba lagi.");
        return;
    }
     // Cek allowance lagi sebelum stake (lebih aman)
     if (parseFloat(allowance) < parseFloat(stakeAmount)) {
         alert(`Allowance tidak cukup (${allowance} ${tokenSymbol}). Silakan Approve ulang sejumlah ${stakeAmount} ${tokenSymbol} atau lebih.`);
         setIsApproved(false); // Reset status approve karena tidak cukup
         return;
     }

    setIsLoading(prev => ({...prev, stake: true}));
    setTxStatus(`Memproses stake ${stakeAmount} ${tokenSymbol}...`);
    try {
        const amountToStake = ethers.parseUnits(stakeAmount, tokenDecimals);
        const tx = await stakingContract.connect(signer).stake(amountToStake);
        setTxStatus(`Menunggu konfirmasi stake... Hash: ${tx.hash}`);
        await tx.wait();
        setTxStatus(`Stake ${stakeAmount} ${tokenSymbol} berhasil!`);
        setStakeAmount(''); // Kosongkan input
        loadStakingData(); // Refresh data
    } catch (error) {
        console.error("Stake gagal:", error);
        setTxStatus(`Stake gagal: ${error.reason || error.message}`);
    } finally {
        setIsLoading(prev => ({...prev, stake: false}));
    }
  };

   // Fungsi Unstake
  const handleUnstake = async () => {
    if (!stakingContract || !unstakeAmount) {
        alert("Masukkan jumlah token untuk di-unstake.");
        return;
    }
    if (parseFloat(unstakeAmount) > parseFloat(stakedBalance)) {
        alert("Jumlah unstake melebihi saldo stake Anda.");
        return;
    }
    setIsLoading(prev => ({...prev, unstake: true}));
    setTxStatus(`Memproses unstake ${unstakeAmount} ${tokenSymbol}...`);
    try {
        const amountToUnstake = ethers.parseUnits(unstakeAmount, tokenDecimals);
        const tx = await stakingContract.connect(signer).withdraw(amountToUnstake);
        setTxStatus(`Menunggu konfirmasi unstake... Hash: ${tx.hash}`);
        await tx.wait();
        setTxStatus(`Unstake ${unstakeAmount} ${tokenSymbol} berhasil!`);
        setUnstakeAmount(''); // Kosongkan input
        loadStakingData(); // Refresh data
    } catch (error) {
        console.error("Unstake gagal:", error);
        setTxStatus(`Unstake gagal: ${error.reason || error.message}`);
    } finally {
        setIsLoading(prev => ({...prev, unstake: false}));
    }
  };

  // Fungsi Claim Reward
  const handleClaim = async () => {
    if (!stakingContract || parseFloat(pendingRewards) <= 0) {
        alert("Tidak ada reward untuk diklaim.");
        return;
    }
    setIsLoading(prev => ({...prev, claim: true}));
    setTxStatus(`Memproses klaim reward...`);
    try {
        const tx = await stakingContract.connect(signer).claimReward();
        setTxStatus(`Menunggu konfirmasi klaim... Hash: ${tx.hash}`);
        await tx.wait();
        setTxStatus(`Klaim reward berhasil!`);
        loadStakingData(); // Refresh data
    } catch (error) {
        console.error("Klaim reward gagal:", error);
        setTxStatus(`Klaim reward gagal: ${error.reason || error.message}`);
    } finally {
        setIsLoading(prev => ({...prev, claim: false}));
    }
  };


  return (
    <div className="page-container stake-page animate-fadeIn">
      <h1><span role="img" aria-label="stake-icon" style={{ marginRight: '10px' }}>💰</span>Staking {tokenSymbol}</h1>
      <p className="page-subtitle">Stake {tokenSymbol} Anda untuk mendapatkan reward.</p>

      {/* Tampilkan status loading data */}
      {isLoading.data && <p className="loading-text">Memuat data staking...</p>}

      <div className="stake-layout">
        {/* Kolom Kiri: Info & Aksi Stake/Unstake */}
        <div className="stake-column">
          <div className="stake-card info">
            <h2>Informasi Staking Anda</h2>
            <div className="info-grid">
                <p><strong>Saldo {tokenSymbol}:</strong> <span>{tklBalance}</span></p>
                <p><strong>Total Stake Anda:</strong> <span>{stakedBalance} {tokenSymbol}</span></p>
                <p><strong>Reward Tertunda:</strong> <span className="reward-value">{pendingRewards} {tokenSymbol}</span></p>
                <p><strong>Allowance:</strong>
                    <span>{allowance} {tokenSymbol} {isLoading.allowance ? '(memeriksa...)' : ''}</span>
                </p>
            </div>
            <button onClick={loadStakingData} className="refresh-button" disabled={isLoading.data}>
                {isLoading.data ? 'Memuat...' : 'Refresh Data'}
            </button>
          </div>

          <div className="stake-card action">
            <h2>Stake {tokenSymbol}</h2>
            <div className="input-group">
              <label htmlFor="stake-amount">Jumlah Stake:</label>
              <input
                id="stake-amount"
                type="number"
                step="any"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder={`e.g., 100 ${tokenSymbol}`}
                disabled={isLoading.approve || isLoading.stake}
              />
            </div>
            {/* Tampilkan Approve atau Stake berdasarkan status isApproved */}
            {!isApproved || parseFloat(allowance) < parseFloat(stakeAmount || '0') ? (
                 <button
                    onClick={handleApprove}
                    className="action-button approve"
                    disabled={isLoading.approve || !stakeAmount || parseFloat(stakeAmount) <= 0}
                 >
                    {isLoading.approve ? 'Approving...' : `Approve ${stakeAmount || '0'} ${tokenSymbol}`}
                 </button>
            ) : (
                <button
                    onClick={handleStake}
                    className="action-button stake"
                    disabled={isLoading.stake || !stakeAmount || parseFloat(stakeAmount) <= 0}
                >
                   {isLoading.stake ? 'Staking...' : `Stake ${stakeAmount} ${tokenSymbol}`}
                </button>
            )}
             <small className="allowance-info">Anda perlu approve sekali untuk setiap jumlah stake baru atau jika allowance habis.</small>
          </div>

          <div className="stake-card action">
            <h2>Unstake {tokenSymbol}</h2>
            <div className="input-group">
              <label htmlFor="unstake-amount">Jumlah Unstake:</label>
              <input
                id="unstake-amount"
                type="number"
                step="any"
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
                placeholder={`e.g., 50 ${tokenSymbol}`}
                disabled={isLoading.unstake}
              />
            </div>
            <button
                onClick={handleUnstake}
                className="action-button unstake"
                disabled={isLoading.unstake || !unstakeAmount || parseFloat(unstakeAmount) <= 0 || parseFloat(stakedBalance) <= 0}
            >
               {isLoading.unstake ? 'Unstaking...' : `Unstake ${unstakeAmount || '0'} ${tokenSymbol}`}
            </button>
          </div>
        </div>

        {/* Kolom Kanan: Info Pool & Klaim Reward */}
        <div className="stake-column">
          <div className="stake-card pool-info">
            <h2>Informasi Pool Staking</h2>
            {/* Tambahkan info pool jika ada di kontrak, misal total staked global */}
            <p><strong>Total {tokenSymbol} di-Stake:</strong> <span>{/* Ambil dari kontrak jika ada fungsi totalStaked() */}??? {tokenSymbol}</span></p>
            <p><strong>Reward Rate (Global):</strong> <span>{/* Ambil dari kontrak jika ada fungsi rewardRate() */}??? {tokenSymbol}/detik</span></p>
            <p><i>(Perhitungan reward didasarkan pada waktu dan jumlah stake Anda relatif terhadap total stake.)</i></p>
          </div>

          <div className="stake-card action">
            <h2>Klaim Reward</h2>
            <p>Reward {tokenSymbol} Anda yang belum diklaim:</p>
            <p className="reward-value large">{pendingRewards} {tokenSymbol}</p>
            <button
                onClick={handleClaim}
                className="action-button claim"
                disabled={isLoading.claim || parseFloat(pendingRewards) <= 0}
            >
              {isLoading.claim ? 'Claiming...' : 'Klaim Reward'}
            </button>
          </div>
        </div>
      </div>

      {/* Status Transaksi */}
      {txStatus && (
        <p className={`tx-status ${txStatus.includes('gagal') || txStatus.includes('Error') ? 'error' : 'success'}`}>
          {txStatus}
        </p>
      )}
    </div>
  );
}

export default StakeComponent;
