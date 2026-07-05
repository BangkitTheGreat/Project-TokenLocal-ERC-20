import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Navbar from './Navbar';
import './App.css';
// === Import konfigurasi kontrak ===
import contractInfo from './contract-info.json';

// === Log untuk memastikan import berhasil ===
console.log(">>> App.js: Imported contractInfo:", contractInfo);
// ====================================================

function App() {
    // State Variables
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null); // Instance TokenLocal
    // --- State BARU untuk Staking ---
    const [stakingContract, setStakingContract] = useState(null); // Instance StakingContract
    const [stakeAmountInput, setStakeAmountInput] = useState(''); // Input jumlah stake
    const [unstakeAmountInput, setUnstakeAmountInput] = useState(''); // Input jumlah unstake
    const [userStakedBalance, setUserStakedBalance] = useState('0'); // Saldo stake pengguna
    const [earnedRewards, setEarnedRewards] = useState('0'); // Reward yang diperoleh
    const [stakingTxStatus, setStakingTxStatus] = useState(''); // Status tx staking
    // --- Akhir State BARU ---
    const [tokenInfo, setTokenInfo] = useState({ name: '', symbol: '', decimals: 18, totalSupply: '0' }); // Default decimals ke 18
    const [balance, setBalance] = useState('0');
    const [transferRecipient, setTransferRecipient] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [mintRecipient, setMintRecipient] = useState('');
    const [mintAmount, setMintAmount] = useState('');
    const [txStatus, setTxStatus] = useState(''); // Status untuk transfer/mint
    const [activeView, setActiveView] = useState('dashboard'); // State untuk navigasi

    // Fungsi connectWallet (Gunakan address & ABI dari import)
    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const web3Provider = new ethers.BrowserProvider(window.ethereum);
                const network = await web3Provider.getNetwork();
                const targetChainId = '31337'; // Hardhat Localhost default
                if (network.chainId.toString() !== targetChainId) {
                    alert(`Silakan ganti jaringan MetaMask Anda ke Hardhat Localhost (Chain ID ${targetChainId})`); return;
                }
                await web3Provider.send("eth_requestAccounts", []);
                const web3Signer = await web3Provider.getSigner();
                const userAddress = await web3Signer.getAddress();
                console.log(">>> connectWallet: Signer obtained:", web3Signer);
                console.log(">>> connectWallet: User address:", userAddress);

                setProvider(web3Provider);
                setSigner(web3Signer);
                setAccount(userAddress);

                // Gunakan contractInfo dari import untuk TokenLocal
                if (!contractInfo?.tokenLocal?.address || !contractInfo.tokenLocal.abi?.length) {
                    console.error(">>> connectWallet: ERROR - Konfigurasi TokenLocal di contract-info.json tidak valid!", contractInfo?.tokenLocal);
                    alert("Konfigurasi kontrak TokenLocal tidak ditemukan/valid. Jalankan ulang deploy script.");
                    handleDisconnect(); // Disconnect jika config error
                    return;
                }
                console.log(`>>> connectWallet: Creating TokenLocal instance with address: ${contractInfo.tokenLocal.address} and ABI length: ${contractInfo.tokenLocal.abi.length}`);
                const tokenContract = new ethers.Contract(
                    contractInfo.tokenLocal.address,
                    contractInfo.tokenLocal.abi,
                    web3Signer // Gunakan signer langsung
                );
                console.log(">>> connectWallet: TokenLocal instance CREATED:", tokenContract);
                setContract(tokenContract); // Set state untuk TokenLocal
                console.log(">>> connectWallet: TokenLocal state set.");

                // --- BARU: Inisialisasi StakingContract ---
                if (contractInfo.stakingContract?.address && contractInfo.stakingContract.abi?.length > 0) {
                    console.log(`>>> connectWallet: Creating StakingContract instance at ${contractInfo.stakingContract.address}`);
                    try {
                         const stakingInstance = new ethers.Contract(
                            contractInfo.stakingContract.address,
                            contractInfo.stakingContract.abi,
                            web3Signer // Gunakan signer agar bisa langsung panggil fungsi write
                        );
                        const stakingAddress = await stakingInstance.getAddress(); // ethers v6
                        console.log(">>> connectWallet: StakingContract instance CREATED:", stakingInstance);
                        console.log(">>> connectWallet: StakingContract target address:", stakingAddress);
                        console.log(">>> connectWallet: StakingContract interface (has functions?):", stakingInstance.interface?.fragments?.length > 0);
                        setStakingContract(stakingInstance); // Set state untuk StakingContract
                        console.log(">>> connectWallet: StakingContract state set.");
                    } catch(stakingError) {
                         console.error(">>> connectWallet: ERROR - Failed to create StakingContract instance:", stakingError);
                         alert(`Gagal membuat instance StakingContract: ${stakingError.message}. Pastikan ABI dan Alamat benar.`);
                         setStakingContract(null); // Reset jika gagal
                    }
                } else {
                    console.warn(">>> connectWallet: StakingContract info not found or invalid in contract-info.json, skipping instance creation.");
                    setStakingContract(null); // Pastikan null jika tidak ada
                }
                // --- Akhir Blok BARU ---


            } catch (error) {
                console.error(">>> connectWallet: FAILED:", error);
                let errorMsg = error.message || 'Error tidak diketahui';
                if (error.code === 4001) { errorMsg = "Permintaan koneksi wallet ditolak."; }
                else if (error.code === -32002) { errorMsg = "Permintaan koneksi sudah tertunda di MetaMask.";}
                alert(`Gagal menghubungkan wallet: ${errorMsg}`);
                // Jangan panggil disconnect jika user cancel atau request sudah pending
                if (error.code !== 4001 && error.code !== -32002) {
                    handleDisconnect();
                }
            }
        } else { alert('Install MetaMask atau wallet Web3 lainnya!'); }
    };

    const getTokenData = async () => {
        const currentContractAddress = contract ? await contract.getAddress() : null; // ethers v6 pakai getAddress()
        if (contract && typeof contract.name === 'function' && account && ethers.isAddress(account) && currentContractAddress && ethers.isAddress(currentContractAddress)) {
            console.log(`>>> getTokenData: Starting for account ${account} with contract at ${currentContractAddress}`);
            setTokenInfo(prev => ({ ...prev, name: 'Loading...', symbol: '...', decimals: '...', totalSupply: 'Loading...' })); // Set loading state
            setBalance('Loading...');
            try {
                let name = 'N/A';
                let symbol = 'N/A';
                let decimals = 0; // Default ke 0 jika gagal
                let totalSupply = '0';
                let userBalance = '0';

                try {
                    console.log(">>> getTokenData: Attempting contract.name()...");
                    name = await contract.name();
                    console.log(`>>> getTokenData: name() success: ${name}`);
                } catch (nameError) {
                    console.error(">>> getTokenData: FAILED specifically at contract.name()!", nameError);
                    setTxStatus(`Error fetching contract.name(): ${nameError.message || nameError}`);
                    // Mungkin tidak perlu throw, cukup set state error
                    // throw nameError;
                }

                try {
                    console.log(">>> getTokenData: Calling symbol()...");
                    symbol = await contract.symbol();
                    console.log(`>>> getTokenData: symbol() success: ${symbol}`);
                } catch (symbolError) {
                     console.error(">>> getTokenData: FAILED at contract.symbol()!", symbolError);
                     setTxStatus(`Error fetching contract.symbol(): ${symbolError.message || symbolError}`);
                }

                 try {
                    console.log(">>> getTokenData: Calling decimals()...");
                    const decimalsBigInt = await contract.decimals();
                    decimals = Number(decimalsBigInt); // Konversi BigInt ke Number
                    console.log(`>>> getTokenData: decimals() success: ${decimals}`);
                 } catch (decimalsError) {
                      console.error(">>> getTokenData: FAILED at contract.decimals()!", decimalsError);
                      setTxStatus(`Error fetching contract.decimals(): ${decimalsError.message || decimalsError}`);
                      decimals = 0; // Set ke 0 jika gagal
                 }


                try {
                    console.log(">>> getTokenData: Calling totalSupply()...");
                    const ts = await contract.totalSupply();
                    totalSupply = ethers.formatUnits(ts, decimals); // Format setelah dapat decimals
                    console.log(`>>> getTokenData: totalSupply() success: ${ts.toString()} (formatted: ${totalSupply})`);
                } catch (tsError) {
                    console.error(">>> getTokenData: FAILED at contract.totalSupply()!", tsError);
                    setTxStatus(`Error fetching contract.totalSupply(): ${tsError.message || tsError}`);
                    totalSupply = 'Error';
                }

                try {
                    console.log(`>>> getTokenData: Calling balanceOf(${account})...`);
                    const bal = await contract.balanceOf(account);
                    userBalance = ethers.formatUnits(bal, decimals); // Format setelah dapat decimals
                    console.log(`>>> getTokenData: balanceOf() success: ${bal.toString()} (formatted: ${userBalance})`);
                } catch (balanceError) {
                     console.error(`>>> getTokenData: FAILED at contract.balanceOf(${account})!`, balanceError);
                     setTxStatus(`Error fetching balance: ${balanceError.message || balanceError}`);
                     userBalance = 'Error';
                }


                setTokenInfo({ name, symbol, decimals, totalSupply }); // Gunakan nilai yang sudah diformat
                setBalance(userBalance); // Gunakan nilai yang sudah diformat
                // Hapus status error jika salah satu fetch berhasil (atau pindahkan ke akhir)
                 if (txStatus.startsWith("Error fetching")) setTxStatus('');

            } catch (error) {
                console.error(">>> getTokenData: FAILED (Outer Catch) - Error reading token data:", error);
                // Set state error hanya jika belum di-set oleh error spesifik
                if (tokenInfo.name !== 'Error') {
                    setTokenInfo({ name: 'Error', symbol: 'ERR', decimals: 0, totalSupply: 'Error' });
                }
                if (balance !== 'Error') {
                     setBalance('Error');
                }
                if (!txStatus.startsWith("Error fetching")) {
                    setTxStatus(`Failed to load token data: ${error.reason || error.message || 'Unknown Error'}`);
                }
            }
        } else {
            console.log(">>> getTokenData: SKIPPED - contract (TokenLocal) or account not ready/valid.", {
                contractExists: !!contract,
                contractHasNameFunc: typeof contract?.name === 'function',
                accountExists: !!account,
                isAccountAddress: ethers.isAddress(account || ""),
                currentContractAddress,
                isContractAddressValid: ethers.isAddress(currentContractAddress || "")
            });
            // Reset token info jika tidak valid
             setTokenInfo({ name: '', symbol: '', decimals: 18, totalSupply: '0' }); // Reset ke default
             setBalance('0');
        }
    };

    // Fungsi disconnect -- DIMODIFIKASI --
    const handleDisconnect = () => {
        console.log("Disconnecting...");
        setAccount(null);
        setSigner(null);
        setProvider(null); // Juga reset provider
        setContract(null);
        // --- Reset State Staking ---
        setStakingContract(null);
        setUserStakedBalance('0');
        setEarnedRewards('0');
        setStakeAmountInput('');
        setUnstakeAmountInput('');
        setStakingTxStatus('');
        // --- Akhir Reset ---
        setBalance('0');
        setTokenInfo({ name: '', symbol: '', decimals: 18, totalSupply: '0' }); // Reset ke default
        setTxStatus('');
        setTransferRecipient(''); setTransferAmount('');
        setMintRecipient(''); setMintAmount('');
        setActiveView('dashboard'); // Kembali ke dashboard
    };

    // Fungsi ganti akun
    const handleChangeAccount = async () => {
        console.log("Attempting to change account...");
        await connectWallet(); // Cukup panggil connectWallet lagi
    };

    // Fungsi handle navigasi
    const handleNavigate = (view) => {
        console.log("Navigating to:", view);
        setActiveView(view);
        setTxStatus(''); // Reset status transaksi umum saat pindah halaman
        setStakingTxStatus(''); // Reset status transaksi staking saat pindah halaman
    };

    // useEffect untuk listener event MetaMask
    useEffect(() => {
         const attemptConnectionOrReset = async () => {
           if (!window.ethereum) { console.log("useEffect: MetaMask tidak terdeteksi."); return; }
           try {
               const accounts = await window.ethereum.request({ method: 'eth_accounts' });
               if (accounts.length > 0) {
                   if (!account || accounts[0].toLowerCase() !== account.toLowerCase()) {
                     console.log("useEffect: Akun terdeteksi berbeda/baru, mencoba connect/reconnect...");
                     await connectWallet(); // Reconnect dengan akun baru
                   } else if (contract && (!stakingContract && contractInfo.stakingContract?.address)) {
                     console.log("useEffect: Akun sama, TokenLocal ada, tapi StakingContract belum, mencoba connect ulang");
                     await connectWallet();
                   } else if (contract && account) {
                       console.log("useEffect: Akun sama terdeteksi, refresh data token awal (getTokenData akan dipicu oleh useEffect lain)");
                       // getTokenData(); // Tidak perlu di sini, biarkan useEffect [contract, account] yang handle
                   }
               } else if (account) {
                   console.log("useEffect: Tidak ada akun terhubung (user disconnect?), reset state.");
                   handleDisconnect();
               }
           } catch (error) {
                if (error.code === -32002) {
                  console.warn("useEffect: Permintaan akun sudah ada.");
                } else {
                  console.error("useEffect: Error saat attemptConnectionOrReset:", error);
                  handleDisconnect();
                }
           }
         };
         const handleAccountsChanged = (accounts) => {
             console.log("Listener: Akun berubah:", accounts);
             if (accounts.length === 0) {
                 console.log("Listener: Akun disconnect.");
                 handleDisconnect();
             } else if (accounts[0].toLowerCase() !== account?.toLowerCase()){
                 console.log("Listener: Akun berbeda terdeteksi.");
                 connectWallet(); // Re-init dengan akun baru
             } else {
                console.log("Listener: Accounts changed event tapi akun sama, tidak melakukan apa-apa.");
             }
         };
         const handleChainChanged = (chainId) => {
             console.log("Listener: Jaringan berubah ke:", chainId);
             alert("Jaringan terdeteksi berubah. Halaman akan dimuat ulang untuk memastikan konsistensi.");
             window.location.reload();
         };

         if (window.ethereum) {
             console.log("useEffect: Memasang listeners...");
             window.ethereum.on('accountsChanged', handleAccountsChanged);
             window.ethereum.on('chainChanged', handleChainChanged);
             console.log("useEffect: Mencoba koneksi awal/pengecekan status...");
             attemptConnectionOrReset();

         } else { console.log("useEffect: MetaMask tidak terdeteksi saat mount."); }

         // Cleanup listeners
         return () => {
             if (window.ethereum?.removeListener) {
                 console.log("useEffect Cleanup: Membersihkan listeners...");
                 window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                 window.ethereum.removeListener('chainChanged', handleChainChanged);
             }
         };
     // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Dijalankan sekali saat mount

    // useEffect untuk getTokenData saat contract atau account berubah
    useEffect(() => {
        console.log("useEffect[contract, account]: Dipicu untuk getTokenData.");
        if (contract && account) {
            console.log("useEffect[contract, account]: Memanggil getTokenData.");
            getTokenData();
        } else {
             console.log("useEffect[contract, account]: Lewati getTokenData, contract atau account belum siap.");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contract, account]);

    // Fungsi untuk fetch data staking (dipisah agar bisa dipanggil manual)
    const fetchStakingData = async () => {
        console.log(">>> fetchStakingData: Checking conditions...");
        const stakingAddress = stakingContract ? await stakingContract.getAddress() : null;
        if (stakingContract && stakingAddress && account && tokenInfo.decimals > 0 && typeof stakingContract.stakedBalanceOf === 'function' && typeof stakingContract.earned === 'function') {
             console.log(`>>> fetchStakingData: Conditions met (Contract: ${stakingAddress}, Account: ${account}, Decimals: ${tokenInfo.decimals}). Fetching data...`);
             // Set loading status hanya jika belum ada status aktif lain
             if (!stakingTxStatus || stakingTxStatus.includes('berhasil') || stakingTxStatus.includes('gagal') || stakingTxStatus.includes('Error fetching')) {
                setStakingTxStatus('Memuat data staking...');
             }
             try {
                 const [staked, rewards] = await Promise.all([
                     stakingContract.stakedBalanceOf(account),
                     stakingContract.earned(account)
                 ]);
                 const decimals = tokenInfo.decimals;
                 console.log(">>> Staking Data Fetched:", { staked: staked.toString(), rewards: rewards.toString() });
                 setUserStakedBalance(ethers.formatUnits(staked, decimals));
                 setEarnedRewards(ethers.formatUnits(rewards, decimals));
                 // Hapus status loading/error lama jika fetch berhasil
                 if (stakingTxStatus.startsWith("Memuat") || stakingTxStatus.startsWith("Error fetching")) {
                     setStakingTxStatus('');
                 }
             } catch (error) {
                 console.error(">>> fetchStakingData: FAILED:", error);
                 setUserStakedBalance('Error');
                 setEarnedRewards('Error');
                 setStakingTxStatus(`Error fetching staking data: ${error.reason || error.message || 'Unknown error'}`);
             }
        } else {
            console.log(">>> fetchStakingData: SKIPPED - Staking contract/account/decimals/functions not ready.", {
                hasStakingContract: !!stakingContract,
                stakingAddress,
                hasAccount: !!account,
                hasDecimals: tokenInfo.decimals > 0,
                hasStakedBalanceFunc: typeof stakingContract?.stakedBalanceOf === 'function',
                hasEarnedFunc: typeof stakingContract?.earned === 'function'
             });
            // Reset jika tidak valid, tapi hanya jika sebelumnya tidak '0' untuk hindari loop
             if (userStakedBalance !== '0' || earnedRewards !== '0') {
                setUserStakedBalance('0');
                setEarnedRewards('0');
             }
            // Jangan reset status jika memang kontrak tidak ada
            if (!stakingContract && stakingTxStatus.startsWith('Memuat')) {
                setStakingTxStatus('');
            }
        }
    };

    // --- BARU: useEffect untuk getStakingData ---
    useEffect(() => {
        console.log("useEffect[stakingContract, account, tokenInfo.decimals]: Triggered.");
        fetchStakingData(); // Panggil fungsi yang sudah dipisah

        // Optional: Tambahkan interval untuk refresh reward (contoh)
        // const intervalId = setInterval(fetchStakingData, 30000); // Refresh tiap 30 detik
        // return () => clearInterval(intervalId); // Cleanup interval

     // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stakingContract, account, tokenInfo.decimals]); // Bergantung pada ini

    // --- BARU: Fungsi untuk trigger refresh manual ---
    const triggerStakingDataRefresh = async () => {
        console.log(">>> Manual Refresh Triggered for Staking Data");
        await fetchStakingData(); // Cukup panggil fungsi fetch yang sudah ada
    };
    // --- Akhir Fungsi Refresh ---


    // Fungsi handleTransfer
    const handleTransfer = async (event) => {
         event.preventDefault();
         if (!contract || !signer || !transferAmount || !transferRecipient || !ethers.isAddress(transferRecipient) || !(tokenInfo.decimals > 0)) { // Cek decimals > 0
             alert("Pastikan wallet terhubung, alamat penerima valid, jumlah transfer terisi, dan desimal token diketahui (> 0)."); return;
         }
         setTxStatus('Mengirim transaksi transfer...');
         try {
             const decimals = tokenInfo.decimals;
             const amountInUnits = ethers.parseUnits(transferAmount, decimals);
             // Gunakan instance kontrak yang sudah terhubung dengan signer jika dibuat dengan signer
             // const tx = await contract.connect(signer).transfer(transferRecipient, amountInUnits); // connect(signer) tidak perlu jika contract dibuat dgn signer
             const tx = await contract.transfer(transferRecipient, amountInUnits);
             setTxStatus(`Transaksi dikirim! Hash: ${tx.hash}. Menunggu konfirmasi...`);
             await tx.wait();
             setTxStatus(`Transfer ${transferAmount} ${tokenInfo.symbol} ke ${transferRecipient} berhasil!`);
             setTransferRecipient(''); setTransferAmount('');
             await getTokenData(); // Refresh saldo
             await fetchStakingData(); // Refresh data staking juga jika relevan
         } catch (error) {
             console.error("Transfer gagal:", error);
             setTxStatus(`Transfer gagal: ${error.reason || error.message || 'Unknown error'}`);
         }
    };

    // Fungsi handleMint
    const handleMint = async (event) => {
         event.preventDefault();
        if (!contract || !signer || !mintAmount || !mintRecipient || !ethers.isAddress(mintRecipient) || !(tokenInfo.decimals > 0)) {
            alert("Pastikan wallet terhubung, alamat penerima valid, jumlah mint terisi, dan desimal token diketahui (> 0)."); return;
        }
        try {
            const ownerAddress = await contract.owner();
             const signerAddress = await signer.getAddress();
            if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
                alert("Hanya owner yang bisa melakukan mint!"); return;
            }
        } catch (error) {
            console.error("Gagal memeriksa owner:", error);
            alert(`Tidak bisa memverifikasi kepemilikan kontrak: ${error.message}`); return;
        }
        setTxStatus('Mengirim transaksi mint...');
        try {
            const decimals = tokenInfo.decimals;
            const amountInUnits = ethers.parseUnits(mintAmount, decimals);
            // const tx = await contract.connect(signer).mint(mintRecipient, amountInUnits); // Tidak perlu jika dibuat dgn signer
            const tx = await contract.mint(mintRecipient, amountInUnits);
            setTxStatus(`Transaksi Mint dikirim! Hash: ${tx.hash}. Menunggu konfirmasi...`);
            await tx.wait();
            setTxStatus(`Mint ${mintAmount} ${tokenInfo.symbol} ke ${mintRecipient} berhasil!`);
            setMintRecipient(''); setMintAmount('');
            await getTokenData(); // Refresh saldo dan total supply
            await fetchStakingData(); // Refresh staking data jika relevan
        } catch (error) {
            console.error("Mint gagal:", error);
            setTxStatus(`Mint gagal: ${error.reason || error.message || 'Unknown error'}`);
        }
    };

    // --- Komponen Halaman Docs (Definisi Inline) ---
    function DocsComponent() {
        const [openSections, setOpenDocsSections] = useState({ pengenalan: true });
        const [copyFeedback, setCopyDocsFeedback] = useState({});
        const toggleSection = (sectionName) => setOpenDocsSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
        const handleCopy = async (textToCopy, id) => {
            try { await navigator.clipboard.writeText(textToCopy); setCopyDocsFeedback(prev => ({ ...prev, [id]: 'Tersalin!' })); setTimeout(() => setCopyDocsFeedback(prev => ({ ...prev, [id]: 'Salin' })), 1500); }
            catch (err) { console.error('Gagal menyalin:', err); setCopyDocsFeedback(prev => ({ ...prev, [id]: 'Gagal' })); setTimeout(() => setCopyDocsFeedback(prev => ({ ...prev, [id]: 'Salin' })), 1500); }
         };
        const SectionToggle = ({ sectionId, title }) => ( <button className="section-toggle" onClick={() => toggleSection(sectionId)}><h2><span className={`toggle-arrow ${openSections[sectionId] ? 'open' : ''}`}>▶</span>{title}</h2></button> );
        const CodeBlock = ({ code, language = 'solidity', id }) => { const btnText = copyFeedback[id] || 'Salin'; return ( <div className="code-block-container"><pre className={`code-block language-${language}`}><code>{code}</code></pre><button className="copy-button" onClick={() => handleCopy(code, id)}>{btnText}</button></div> ); };

        // JSX untuk halaman Docs
        return (
            <div className="page-container docs-page animate-fadeIn">
                <h1><span role="img" aria-label="docs-icon" style={{marginRight: '10px'}}>📚</span>TokenLocal</h1>
                <p className="page-subtitle">Panduan Teknis dan Informasi Penggunaan</p>

                {/* Konten Docs di sini... */}
                <section className={`docs-section ${openSections.pengenalan ? 'open' : ''}`}><SectionToggle sectionId="pengenalan" title="1. Pengenalan & Tujuan" /><div className="section-content"><p>Selamat datang di TokenLocal (TKL)...</p><p><strong>Tujuan Utama:</strong></p><ul><li><span className="list-icon">🎓</span> Implementasi ERC-20...</li><li><span className="list-icon">💻</span> Demo dApp frontend...</li><li><span className="list-icon">🧪</span> Sandbox aman...</li><li><span className="list-icon">🚀</span> Fondasi pengembangan...</li></ul><p>Dokumentasi ini memandu Anda...</p></div></section>
                <section className={`docs-section ${openSections.setup ? 'open' : ''}`}><SectionToggle sectionId="setup" title="2. Setup Lingkungan Lokal" /><div className="section-content"><p>Prasyarat:</p><ul><li>...</li></ul><p>Langkah Menjalankan:</p><ol><li>...</li></ol></div></section>
                <section className={`docs-section ${openSections.konsep ? 'open' : ''}`}><SectionToggle sectionId="konsep" title="3. Konsep Dasar" /><div className="section-content"><p>Teknologi kunci:</p><dl className="definition-list"><dt>Blockchain Lokal...</dt><dd>...</dd>{/* ... */}</dl></div></section>
                {/* PERBAIKI: Ambil alamat dari state contract jika ada */}
                <section className={`docs-section ${openSections.kontrak ? 'open' : ''}`}><SectionToggle sectionId="kontrak" title="4. Detail Smart Contract TokenLocal" /><div className="section-content"><p>Inti token TKL...</p><p><strong>Alamat Kontrak (Lokal Saat Ini):</strong> <code className='code-inline'>{contract ? contract.target : (contractInfo?.tokenLocal?.address || 'Konfigurasi tidak dimuat')}</code></p><p><strong>Fitur Utama:</strong></p><ul><li>Constructor...</li><li>Fungsi ERC-20...</li><li>Fungsi Ownable...</li></ul><p>Detail implementasi...</p><CodeBlock code={`constructor(...) ...`} id="constructor-code" /></div></section>
                <section className={`docs-section ${openSections.dapp ? 'open' : ''}`}><SectionToggle sectionId="dapp" title="5. Panduan Penggunaan DApp" /><div className="section-content"><p>Antarmuka web ini...</p><ol><li>Koneksi Wallet...</li><li>Navbar...</li><li>Dashboard...</li><li>Formulir Aksi...</li><li>Status Transaksi...</li></ol></div></section>
                <section className={`docs-section ${openSections.api ? 'open' : ''}`}><SectionToggle sectionId="api" title="6. Referensi Fungsi Kontrak (API)" /><div className="section-content"><p>Ringkasan fungsi utama:</p><div className="api-function"><h3>balanceOf</h3>{/* ... */}</div><div className="api-function"><h3>transfer</h3>{/* ... */}</div><div className="api-function"><h3>mint</h3>{/* ... */}</div><p>Daftar fungsi lengkap...</p></div></section>
                <section className={`docs-section ${openSections.troubleshooting ? 'open' : ''}`}><SectionToggle sectionId="troubleshooting" title="7. Pemecahan Masalah" /><div className="section-content"><p>Mengalami kendala?</p><ul><li>Error jaringan...</li>{/* ... */}</ul></div></section>

            </div>
        );
    }
    // --- Akhir Komponen Halaman Docs ---


    // --- Komponen Halaman About (Definisi Inline) ---
    function AboutComponent() {
         return (
            <div className="page-container about-page animate-fadeIn">
                <h1><span role="img" aria-label="about-icon" style={{marginRight: '15px', filter: 'hue-rotate(220deg)'}}>✨</span>Tentang Proyek Ini</h1>
                <p className="about-subtitle">Menjelajahi Masa Depan Desentralisasi</p>

                {/* Konten About di sini... */}
                <section className="about-section card-style"><h2><span className="section-icon">🎯</span>Visi & Misi Proyek</h2><p>TokenLocal DApp adalah inisiatif...</p><p>Misi kami adalah...</p></section>
                <section className="about-section card-style team-section"><h2><span className="section-icon">👥</span>Tim Inti (Placeholder)</h2><p>Dibangun oleh kolaborasi...</p><div className="team-members"><div className="team-member"><div className="member-avatar" style={{ background: 'linear-gradient(135deg, #a656f7, #7b61ff)' }}>🧙‍♂️</div><div className="member-name">Solidity Sorcerer</div><div className="member-role">Smart Contract Architect</div><div className="member-social"><a href="#linkedin" onClick={(e) => e.preventDefault()}>LinkedIn</a> | <a href="#github" onClick={(e) => e.preventDefault()}>GitHub</a></div></div><div className="team-member"><div className="member-avatar" style={{ background: 'linear-gradient(135deg, #c74cfc, #a656f7)' }}>✨</div><div className="member-name">React Ranger</div><div className="member-role">Frontend Specialist</div><div className="member-social"><a href="#linkedin" onClick={(e) => e.preventDefault()}>LinkedIn</a> | <a href="#github" onClick={(e) => e.preventDefault()}>GitHub</a></div></div><div className="team-member"><div className="member-avatar" style={{ background: 'linear-gradient(135deg, #7b61ff, #50e3c2)' }}>🎨</div><div className="member-name">CSS Conjurer</div><div className="member-role">UI/UX Alchemist</div><div className="member-social"><a href="#linkedin" onClick={(e) => e.preventDefault()}>LinkedIn</a> | <a href="#github" onClick={(e) => e.preventDefault()}>GitHub</a></div></div></div></section>
                <section className="about-section card-style"><h2><span className="section-icon">💡</span>Filosofi Kami</h2><p>Kami menganut prinsip **open-source**...</p><p>Fokus utama adalah...</p></section>
                <section className="about-section card-style"><h2><span className="section-icon">🛠️</span>Teknologi Kunci</h2><p>DApp ini dibangun di atas fondasi...</p><ul className="tech-list"><li><span className="tech-icon">📜</span> <strong>Solidity...</strong></li><li><span className="tech-icon">🧱</span> <strong>Hardhat...</strong></li><li><span className="tech-icon">🛡️</span> <strong>OpenZeppelin...</strong></li><li><span className="tech-icon">⚛️</span> <strong>React.js...</strong></li><li><span className="tech-icon" style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>ethers.js</span> <strong>Ethers.js...</strong></li><li><span className="tech-icon">🦊</span> <strong>MetaMask...</strong></li><li><span className="tech-icon">🎨</span> <strong>CSS Modern...</strong></li></ul></section>
                <section className="about-section card-style"><h2><span className="section-icon">🗺️</span>Peta Jalan (Roadmap - Placeholder)</h2><p>Kami terus berupaya...</p><ul className="roadmap-list"><li className="roadmap-item done"><span>Q1 2025</span> Implementasi Dasar...</li><li className="roadmap-item current"><span>Q2 2025</span> Peningkatan UI/UX...</li><li className="roadmap-item"><span>Q3 2025</span> Fitur Staking...</li><li className="roadmap-item"><span>Q4 2025</span> Modul Governance...</li><li className="roadmap-item"><span>Future</span> Integrasi Lanjutan...</li></ul></section>
                <section className="about-section card-style"><h2><span className="section-icon">🔗</span>Bergabunglah Dengan Komunitas</h2><p>Mari terhubung...</p><div className="hero-links-container"><a href="#github" className="hero-link" onClick={(e) => e.preventDefault()}><span className="link-icon">📁</span> GitHub Repositori</a><a href="#discord" className="hero-link" onClick={(e) => e.preventDefault()}><span className="link-icon">💬</span> Server Discord</a><a href="#twitter" className="hero-link" onClick={(e) => e.preventDefault()}><span className="link-icon">🐦</span> Ikuti di Twitter</a></div></section>
            </div>
        );
    }
    // --- Akhir Komponen Halaman About ---


    // Komponen Dashboard Layout
     function DashboardLayout() {
        return (
             <div className="dashboard-layout">
                {/* Kolom Kiri */}
                <div className="sidebar">
                    <div className="info-balance-card"><h2>Info & Saldo</h2><div className="info-balance-content"><div><p><strong>Nama:</strong> <span>{tokenInfo.name || 'Loading...'}</span></p><p><strong>Simbol:</strong> <span>{tokenInfo.symbol || '...'}</span></p><p><strong>Desimal:</strong> <span>{tokenInfo.decimals || '...'}</span></p><p><strong>Total Pasokan:</strong> <span>{tokenInfo.totalSupply} {tokenInfo.symbol || ''}</span></p></div><div className="saldo-box"><span className="saldo-label">Saldo Anda</span><span className="saldo-value">{balance} {tokenInfo.symbol || ''}</span></div></div></div>
                    <div className="action-card"><h2>Transfer Token</h2><form onSubmit={handleTransfer}><div><label htmlFor="recipient-transfer">Alamat Penerima:</label><input id="recipient-transfer" type="text" value={transferRecipient} onChange={(e) => setTransferRecipient(e.target.value)} placeholder="0x..." required /></div><div><label htmlFor="amount-transfer">Jumlah:</label><input id="amount-transfer" type="number" step="any" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="Contoh: 100" required /><span> {tokenInfo.symbol || ''}</span></div><button type="submit" className="action-button">Transfer</button></form></div>
                </div>
                {/* Kolom Tengah */}
                <div className="center-content">
                    <div className="hero-card"><div className="token-logo"><span role="img" aria-label="rocket" style={{ fontSize: '3.5rem' }}>🚀</span></div><h1 className="hero-title">Welcome to <span style={{ color: 'var(--jupiter-gradient-end)' }}>{tokenInfo.name || 'TokenLocal'}</span> DApp!</h1><p className="hero-slogan">A modern, secure, and local-first token experience.<br />Manage, transfer, and mint your {tokenInfo.symbol || 'TKL'} tokens with ease.</p><div className="stats-card"><div className="stat"><span className="stat-label">Total Supply</span><span className="stat-value">{tokenInfo.totalSupply} {tokenInfo.symbol || ''}</span></div><div className="stat"><span className="stat-label">Decimals</span><span className="stat-value">{tokenInfo.decimals || '...'}</span></div></div><div className="quick-actions"><button className="action-button" style={{ width: 'auto', margin: '10px 10px 0 0' }} onClick={() => alert('Fungsi belum ada')}>Add to Wallet</button><button className="action-button" style={{ width: 'auto', margin: '10px 10px 0 0' }} onClick={() => alert('Fungsi belum ada')}>Buy TKL</button><button className="action-button" style={{ width: 'auto', margin: '10px 0 0 0' }} onClick={() => alert('Fungsi belum ada')}>Swap</button></div>
                    <div className="hero-extra-info"><h4>Tentang TokenLocal ({tokenInfo.symbol || 'TKL'})</h4><p>TokenLocal adalah token utilitas dengan ERC-20 pada jaringan Ethereum, Token ini menjadi percobaan sederhana di Web3</p>
                    <div className="hero-links-container"><a href="#docs" className="hero-link" onClick={(e) => {e.preventDefault(); handleNavigate('docs');}}>Baca Docs</a><a href="#community" className="hero-link" onClick={(e) => e.preventDefault()}>Gabung Komunitas</a></div></div></div>
                </div>
                {/* Kolom Kanan */}
                <div className="account-info">
                    <div className="account-details-card"><h2>Info Akun</h2><div className="account-details"><p><strong>Alamat:</strong></p><p className="account-address">{account}</p><div className="account-actions"><button className="account-action-button" onClick={handleChangeAccount}>Ganti Akun</button><button className="account-action-button disconnect" onClick={handleDisconnect}>Putuskan Koneksi</button></div></div></div>
                    <div className="action-card"><h2>Mint Token (Hanya Owner)</h2><form onSubmit={handleMint}><div><label htmlFor="recipient-mint">Penerima Mint:</label><input id="recipient-mint" type="text" value={mintRecipient} onChange={(e) => setMintRecipient(e.target.value)} placeholder="0x..." required /></div><div><label htmlFor="amount-mint">Jumlah Mint:</label><input id="amount-mint" type="number" step="any" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} placeholder="Contoh: 500" required /><span> {tokenInfo.symbol || ''}</span></div><button type="submit" className="action-button">Mint</button></form></div>
                </div>
                {/* Pesan Status Transaksi */}
                {txStatus && (<div style={{ width: '100%', flexBasis: '100%', marginTop: '-10px', order: 99 }}><p className={`tx-status ${txStatus.includes('gagal') || txStatus.includes('Error') ? 'error' : 'success'}`}>{txStatus}</p></div>)}
            </div>
        );
    }
    // --- Akhir Komponen Dashboard Layout ---

    // --- Fungsi Handle Stake ---
    const handleStake = async (event) => {
        event.preventDefault();
        if (!contract || !stakingContract || !signer || !stakeAmountInput || parseFloat(stakeAmountInput) <= 0 || !(tokenInfo.decimals > 0)) {
            alert("Pastikan wallet terhubung, kontrak siap, jumlah stake valid (> 0), dan desimal token diketahui (> 0)."); return;
        }
        const stakingContractAddress = await stakingContract.getAddress(); // ethers v6
        if (!ethers.isAddress(stakingContractAddress)) {
             alert("Alamat kontrak staking tidak valid."); return;
        }

        setStakingTxStatus('Memproses stake...');
        try {
            const decimals = tokenInfo.decimals;
            const amountInUnits = ethers.parseUnits(stakeAmountInput, decimals);

            // 1. Cek Allowance
            setStakingTxStatus('Memeriksa allowance...');
            // Gunakan instance token contract (state 'contract') untuk cek allowance
            const allowance = await contract.allowance(account, stakingContractAddress);
            console.log(`>>> handleStake: Current allowance for ${stakingContractAddress}: ${ethers.formatUnits(allowance, decimals)} ${tokenInfo.symbol}`);

            // 2. Approve jika allowance kurang
            if (allowance < amountInUnits) {
                setStakingTxStatus(`Meminta approval ${stakeAmountInput} ${tokenInfo.symbol}...`);
                // Approve dipanggil pada token contract (state 'contract')
                const approveTx = await contract.approve(stakingContractAddress, amountInUnits);
                setStakingTxStatus(`Approval dikirim (${approveTx.hash}). Menunggu konfirmasi...`);
                await approveTx.wait();
                setStakingTxStatus(`Approval ${stakeAmountInput} ${tokenInfo.symbol} berhasil! Melanjutkan stake...`);
                 console.log(">>> handleStake: Approval successful.");
            } else {
                 console.log(">>> handleStake: Allowance cukup, skip approval.");
                  setStakingTxStatus(`Allowance cukup. Melanjutkan stake...`); // Beri feedback
            }

            // 3. Panggil fungsi stake di StakingContract
            setStakingTxStatus(`Mengirim transaksi stake ${stakeAmountInput} ${tokenInfo.symbol}...`);
            // Panggil stake pada instance stakingContract
            const tx = await stakingContract.stake(amountInUnits);
            setStakingTxStatus(`Stake dikirim (${tx.hash}). Menunggu konfirmasi...`);
            await tx.wait();

            setStakingTxStatus(`Stake ${stakeAmountInput} ${tokenInfo.symbol} berhasil!`);
            setStakeAmountInput(''); // Reset input
            await getTokenData(); // Refresh saldo token
            await triggerStakingDataRefresh(); // Refresh data staking

        } catch (error) {
            console.error(">>> handleStake: Gagal:", error);
             let errorMsg = error.reason || error.data?.message || error.message || 'Unknown staking error';
             if (error.code === 'ACTION_REJECTED') { errorMsg = 'Transaksi ditolak pengguna.'; }
             else if (error.code === 'INVALID_ARGUMENT') { errorMsg = `Argumen tidak valid: ${error.argument} = ${error.value}`;}
             else if (error.code === 'CALL_EXCEPTION') { errorMsg = `Eksekusi kontrak gagal (CALL_EXCEPTION). Cek event/require di kontrak. ${error.reason || ''}`; }
             setStakingTxStatus(`Stake gagal: ${errorMsg}`);
        }
    };

    //--- Fungsi Handle Unstake ---
    const handleUnstake = async (event) => {
         event.preventDefault();
         if (!stakingContract || !signer || !unstakeAmountInput || parseFloat(unstakeAmountInput) <= 0 || !(tokenInfo.decimals > 0)) {
             alert("Pastikan wallet terhubung, kontrak staking siap, dan jumlah unstake valid (> 0)."); return;
         }

         try {
             const decimals = tokenInfo.decimals;
             // Ambil saldo stake terbaru sebelum validasi
             const currentStakedBalance = await stakingContract.stakedBalanceOf(account);
             const userStakedBalanceFormatted = ethers.formatUnits(currentStakedBalance, decimals);

             const unstakeBigNum = ethers.parseUnits(unstakeAmountInput, decimals);

             if (unstakeBigNum > currentStakedBalance) {
                 alert(`Jumlah unstake (${unstakeAmountInput}) tidak boleh melebihi saldo stake Anda (${userStakedBalanceFormatted}).`); return;
             }
             if (unstakeBigNum <= 0n) { // Bandingkan dengan BigInt nol
                alert("Jumlah unstake harus lebih besar dari nol."); return;
             }

             setStakingTxStatus('Memproses unstake...');

             // Panggil fungsi unstake di StakingContract
             setStakingTxStatus(`Mengirim transaksi unstake ${unstakeAmountInput} ${tokenInfo.symbol}...`);
             const tx = await stakingContract.unstake(unstakeBigNum); // Kirim BigInt
             setStakingTxStatus(`Unstake dikirim (${tx.hash}). Menunggu konfirmasi...`);
             await tx.wait();

             setStakingTxStatus(`Unstake ${unstakeAmountInput} ${tokenInfo.symbol} berhasil!`);
             setUnstakeAmountInput(''); // Reset input
             await getTokenData(); // Refresh saldo token
             await triggerStakingDataRefresh(); // Refresh data staking

         } catch (error) {
             console.error(">>> handleUnstake: Gagal:", error);
             let errorMsg = error.reason || error.data?.message || error.message || 'Unknown unstaking error';
              if (error.code === 'ACTION_REJECTED') { errorMsg = 'Transaksi ditolak pengguna.'; }
              else if (error.code === 'CALL_EXCEPTION') { errorMsg = `Eksekusi kontrak gagal (CALL_EXCEPTION). Cek saldo stake & logic unstake. ${error.reason || ''}`; }
             setStakingTxStatus(`Unstake gagal: ${errorMsg}`);
         }
    };

    // --- Fungsi Handle Claim Rewards ---
    const handleClaimRewards = async () => {
        if (!stakingContract || !signer || !(tokenInfo.decimals > 0)) {
            alert("Kontrak staking atau signer tidak siap, atau desimal token tidak valid."); return;
        }
        let earnedBigNum;
        try {
           // Ambil reward terbaru sebelum klaim
           const currentEarned = await stakingContract.earned(account);
           earnedBigNum = currentEarned; // Langsung gunakan BigInt
           const currentEarnedFormatted = ethers.formatUnits(currentEarned, tokenInfo.decimals);

           if (earnedBigNum <= 0n) {
                alert(`Tidak ada reward (${currentEarnedFormatted} ${tokenInfo.symbol}) yang bisa diklaim.`); return;
            }
        } catch (fetchError) {
             console.error(">>> handleClaimRewards: Error fetching earned rewards before claim:", fetchError);
             alert("Tidak bisa memeriksa jumlah reward saat ini."); return;
        }


        setStakingTxStatus('Memproses klaim reward...');
        try {
            // Panggil fungsi claimRewards di StakingContract
            setStakingTxStatus(`Mengirim transaksi klaim reward...`);
            const tx = await stakingContract.claimReward(); // Ganti nama fungsi jika perlu
            setStakingTxStatus(`Klaim reward dikirim (${tx.hash}). Menunggu konfirmasi...`);
            await tx.wait();

            setStakingTxStatus(`Klaim reward berhasil!`);
            await getTokenData(); // Refresh saldo token
            await triggerStakingDataRefresh(); // Refresh data staking (reward jadi 0)

        } catch (error) {
            console.error(">>> handleClaimRewards: Gagal:", error);
            let errorMsg = error.reason || error.data?.message || error.message || 'Unknown claim error';
             if (error.code === 'ACTION_REJECTED') { errorMsg = 'Transaksi ditolak pengguna.'; }
             else if (error.code === 'CALL_EXCEPTION') { errorMsg = `Eksekusi kontrak gagal (CALL_EXCEPTION). Cek logic reward. ${error.reason || ''}`; }
            setStakingTxStatus(`Klaim reward gagal: ${errorMsg}`);
        }
   };

   // --- *** MULAI DEFINISI StakeComponent *** ---
   function StakeComponent() {
       // Status loading/disabled (pindahkan ke dalam komponen yang menggunakannya)
       const isLoading = stakingTxStatus.includes('Memproses') || stakingTxStatus.includes('dikirim') || stakingTxStatus.includes('Memeriksa') || stakingTxStatus.includes('Memuat');
       // Validasi numerik yang lebih aman
       const stakeAmountNum = parseFloat(stakeAmountInput);
       const unstakeAmountNum = parseFloat(unstakeAmountInput);
       const userStakedBalanceNum = parseFloat(userStakedBalance || '0');
       const earnedRewardsNum = parseFloat(earnedRewards || '0');
       const balanceNum = parseFloat(balance || '0');

       const isStakingDisabled = isLoading || !signer || !stakeAmountInput || isNaN(stakeAmountNum) || stakeAmountNum <= 0 || stakeAmountNum > balanceNum;
       const isUnstakingDisabled = isLoading || !signer || !unstakeAmountInput || isNaN(unstakeAmountNum) || unstakeAmountNum <= 0 || unstakeAmountNum > userStakedBalanceNum;
       const isClaimDisabled = isLoading || !signer || isNaN(earnedRewardsNum) || earnedRewardsNum <= 0;
       const isMaxStakeDisabled = isLoading || !signer || isNaN(balanceNum) || balanceNum <= 0;
       const isMaxUnstakeDisabled = isLoading || !signer || isNaN(userStakedBalanceNum) || userStakedBalanceNum <= 0;

       // --- Render JSX untuk halaman Staking ---
       return (
           <div className="page-container stake-page animate-fadeIn">
               <h1><span role="img" aria-label="stake-icon" style={{ marginRight: '10px' }}>💰</span> Stake Your {tokenInfo.symbol || 'Tokens'}</h1>
               <p className="page-subtitle">Lock your tokens ({tokenInfo.symbol || 'TKL'}) to earn rewards.</p>

               {!stakingContract ? (
                   <div className="info-message warning card-style">
                       <h2><span className="section-icon">⚠️</span> Staking Tidak Tersedia</h2>
                       Kontrak staking tidak berhasil dimuat. Pastikan:
                       <ul>
                           <li>Alamat dan ABI StakingContract benar di contract-info.json.</li>
                           <li>Kontrak Staking sudah di-deploy ke jaringan yang benar ({provider?.network?.name || 'Unknown Network'}).</li>
                           <li>Anda terhubung ke jaringan yang benar di MetaMask.</li>
                       </ul>
                        <p>Alamat Staking yang diharapkan: <code className='code-inline small'>{contractInfo?.stakingContract?.address || 'Tidak dikonfigurasi'}</code></p>
                        <button onClick={connectWallet} className="action-button secondary" style={{marginTop: '10px'}}>Coba Hubungkan Ulang Wallet</button>
                   </div>
               ) : (
                   <div className="stake-layout">
                       {/* Kolom Informasi Staking */}
                       <div className="stake-info-card card-style">
                           <h2><span className="section-icon">📊</span> Staking Overview</h2>
                            <p style={{fontSize: '0.85em', wordBreak: 'break-all', marginBottom: '15px'}}>
                               {/* Gunakan state stakingContract.target atau getAddress() */}
                               Kontrak Staking: <code className='code-inline small'>{stakingContract.target || 'Loading address...'}</code>
                            </p>
                           <div className="info-grid">
                               <div>
                                   <span className="info-label">Saldo {tokenInfo.symbol || 'TKL'} Anda</span>
                                   <span className="info-value large">{balance === 'Error' ? <span style={{color:'red'}}>Error</span> : balance}</span>
                               </div>
                               <div>
                                   <span className="info-label">Total {tokenInfo.symbol || 'TKL'} Di-stake</span>
                                   <span className="info-value large">{userStakedBalance === 'Error' ? <span style={{color:'red'}}>Error</span> : userStakedBalance}</span>
                               </div>
                               <div>
                                   <span className="info-label">Reward Bisa Diklaim</span>
                                    {/* PERBAIKI: Gunakan template literal dalam kurung kurawal */}
                                    <span className="info-value large">{earnedRewards === 'Error' ? <span style={{color:'red'}}>Error</span> : `${earnedRewards} ${tokenInfo.symbol || ''}`}</span>
                               </div>
                           </div>
                           <button
                               className="action-button secondary"
                               onClick={handleClaimRewards}
                               disabled={isClaimDisabled}
                               style={{ marginTop: '20px', width: '100%' }}
                           >
                               {isLoading && stakingTxStatus.includes('klaim') ? stakingTxStatus : 'Klaim Reward'}
                           </button>
                            {/* Tombol Refresh Manual */}
                            <button onClick={triggerStakingDataRefresh} className="link-button" style={{marginTop: '15px', fontSize: '0.9em'}} disabled={isLoading}>
                                <span role="img" aria-label="refresh" style={{ marginRight: '5px' }}>🔄</span> Refresh Data Staking
                            </button>
                       </div>

                       {/* Kolom Aksi Staking */}
                       <div className="stake-actions-card card-style">
                           {/* Form Stake */}
                           <form onSubmit={handleStake} className="stake-form">
                               <h2><span className="section-icon">➕</span> Stake Tokens</h2>
                               <label htmlFor="amount-stake">Jumlah {tokenInfo.symbol || 'TKL'} untuk di-stake:</label>
                               <div className="input-group">
                                   <input
                                       id="amount-stake"
                                       type="number"
                                       step="any"
                                       min="0"
                                       value={stakeAmountInput}
                                       onChange={(e) => setStakeAmountInput(e.target.value)}
                                       // PERBAIKI: Gunakan template literal dalam kurung kurawal
                                       placeholder={`Saldo: ${balance === 'Error' ? 'N/A' : balance}`}
                                       required
                                       disabled={isLoading || !signer}
                                   />
                                   <span className="input-group-text">{tokenInfo.symbol || 'TKL'}</span>
                               </div>
                                {/* PERBAIKI: Gunakan template literal dalam kurung kurawal */}
                                <button type="button" className="link-button" onClick={() => setStakeAmountInput(balance)} disabled={isMaxStakeDisabled}>
                                    Gunakan Saldo Maksimal ({balance === 'Error' ? 'N/A' : balance} {tokenInfo.symbol || ''})
                                </button>
                               <button
                                   type="submit"
                                   className="action-button"
                                   disabled={isStakingDisabled}
                               >
                                   {isLoading && (stakingTxStatus.includes('stake') || stakingTxStatus.includes('approval')) ? stakingTxStatus : 'Stake Now'}
                               </button>
                           </form>

                           {/* Form Unstake */}
                           <form onSubmit={handleUnstake} className="stake-form">
                               <h2><span className="section-icon">➖</span> Unstake Tokens</h2>
                               <label htmlFor="amount-unstake">Jumlah {tokenInfo.symbol || 'TKL'} untuk di-unstake:</label>
                               <div className="input-group">
                                   <input
                                       id="amount-unstake"
                                       type="number"
                                       step="any"
                                       min="0"
                                       value={unstakeAmountInput}
                                       onChange={(e) => setUnstakeAmountInput(e.target.value)}
                                       // PERBAIKI: Gunakan template literal dalam kurung kurawal
                                       placeholder={`Di-stake: ${userStakedBalance === 'Error' ? 'N/A' : userStakedBalance}`}
                                       required
                                       disabled={isLoading || !signer || userStakedBalanceNum <= 0} // Disable jika tidak ada yg di-stake
                                   />
                                   <span className="input-group-text">{tokenInfo.symbol || 'TKL'}</span>
                               </div>
                                {/* PERBAIKI: Gunakan template literal dalam kurung kurawal */}
                                <button type="button" className="link-button" onClick={() => setUnstakeAmountInput(userStakedBalance)} disabled={isMaxUnstakeDisabled}>
                                    Gunakan Saldo Stake Maksimal ({userStakedBalance === 'Error' ? 'N/A' : userStakedBalance} {tokenInfo.symbol || ''})
                                </button>
                               <button
                                   type="submit"
                                   className="action-button secondary"
                                   disabled={isUnstakingDisabled}
                               >
                                    {isLoading && stakingTxStatus.includes('unstake') ? stakingTxStatus : 'Unstake Now'}
                               </button>
                           </form>
                       </div>
                   </div>
               )}

               {/* Pesan Status Transaksi Staking */}
               {stakingTxStatus && !isLoading && ( // Hanya tampilkan status final
                   // PERBAIKI: Gunakan template literal untuk className
                   <p className={`tx-status ${stakingTxStatus.includes('gagal') || stakingTxStatus.includes('Error') ? 'error' : (stakingTxStatus.includes('berhasil') ? 'success' : 'info')}`} style={{ marginTop: '20px', textAlign: 'center' }}>
                       {stakingTxStatus}
                   </p>
               )}
           </div>
       );
   }
   // --- *** AKHIR DEFINISI StakeComponent *** ---

     // --- Komponen Halaman Bridge (KERANGKA DASAR) ---
     function BridgeComponent() {
        const [destinationChain, setDestinationChain] = useState(''); // ID atau nama chain tujuan
        const [bridgeAmount, setBridgeAmount] = useState('');
        const [bridgeStatus, setBridgeStatus] = useState('');
        const [isBridging, setIsBridging] = useState(false);

        // --- TODO: Ganti dengan daftar chain yang didukung ---
        const supportedChains = [
            { id: 'sepolia', name: 'Sepolia Testnet' },
            { id: 'otherLocal', name: 'Other Local Network (Contoh)' },
            // Tambahkan chain lain di sini
        ];

        // --- TODO: Implementasikan logika interaksi kontrak bridge ---
        const handleBridgeSubmit = async (event) => {
            event.preventDefault();
            if (!contract || !signer || !bridgeAmount || !destinationChain || !(tokenInfo.decimals > 0) || parseFloat(bridgeAmount) <= 0) {
                alert("Pastikan wallet terhubung, chain tujuan dipilih, jumlah valid (>0), dan desimal token diketahui.");
                return;
            }
            // --- Validasi Saldo ---
            const amountToBridgeNum = parseFloat(bridgeAmount);
            const balanceNum = parseFloat(balance);
            if (isNaN(amountToBridgeNum) || isNaN(balanceNum) || amountToBridgeNum > balanceNum) {
                 alert(`Jumlah bridge (${bridgeAmount}) tidak boleh melebihi saldo Anda (${balance}).`);
                 return;
            }

            // --- !!! INI BAGIAN UTAMA YANG PERLU DIIMPLEMENTASIKAN !!! ---
            // 1. Dapatkan alamat & ABI kontrak bridge untuk chain ASAL (misal dari contract-info.json)
            // 2. Buat instance ethers.Contract untuk bridge contract di chain asal
            // 3. Cek allowance token TKL untuk bridge contract
            // 4. Jika allowance kurang, minta approval (panggil contract.approve(bridgeAddress, amountInUnits))
            // 5. Panggil fungsi bridge di bridge contract (misal: bridgeContract.bridgeTokens(destinationChainId, amountInUnits))

            setIsBridging(true);
            setBridgeStatus(`Memulai proses bridge ${bridgeAmount} ${tokenInfo.symbol} ke ${destinationChain}...`);

            try {
                // --- SIMULASI / PLACEHOLDER ---
                console.log("Bridge Dummies:", { destinationChain, bridgeAmount, decimals: tokenInfo.decimals });
                // Ganti dengan logika interaksi kontrak sesungguhnya
                // Contoh (perlu alamat & ABI bridge):
                // const bridgeAddress = contractInfo.bridgeContracts?.source?.address; // Contoh path
                // const bridgeAbi = contractInfo.bridgeContracts?.source?.abi;       // Contoh path
                // if (!bridgeAddress || !bridgeAbi) throw new Error("Konfigurasi bridge contract asal tidak ditemukan!");
                // const bridgeContract = new ethers.Contract(bridgeAddress, bridgeAbi, signer);
                // const amountInUnits = ethers.parseUnits(bridgeAmount, tokenInfo.decimals);
                // // Cek/Approve Allowance dulu (mirip staking)
                // const allowance = await contract.allowance(account, bridgeAddress);
                // if (allowance < amountInUnits) {
                //    setBridgeStatus('Meminta approval token...');
                //    const approveTx = await contract.approve(bridgeAddress, amountInUnits);
                //    await approveTx.wait();
                //    setBridgeStatus('Approval berhasil, melanjutkan bridge...');
                // }
                // // Panggil fungsi bridge (ganti nama fungsi jika perlu)
                // const tx = await bridgeContract.startBridge(destinationChain, amountInUnits); // Ganti nama fungsi!
                // setBridgeStatus(`Transaksi bridge dikirim (${tx.hash}). Menunggu konfirmasi...`);
                // await tx.wait();
                // --- Akhir Contoh ---

                // Simulasi sukses setelah beberapa detik
                await new Promise(resolve => setTimeout(resolve, 3000));

                setBridgeStatus(`Bridge ${bridgeAmount} ${tokenInfo.symbol} ke ${destinationChain} berhasil diinisiasi di chain asal! Proses di chain tujuan mungkin memerlukan waktu.`);
                setBridgeAmount('');
                setDestinationChain('');
                await getTokenData(); // Refresh saldo di chain asal
                // Mungkin perlu mekanisme lain untuk cek status akhir di chain tujuan

            } catch (error) {
                console.error(">>> handleBridgeSubmit: Gagal:", error);
                let errorMsg = error.reason || error.data?.message || error.message || 'Unknown bridge error';
                if (error.code === 'ACTION_REJECTED') { errorMsg = 'Transaksi ditolak pengguna.'; }
                setBridgeStatus(`Bridge gagal: ${errorMsg}`);
            } finally {
                setIsBridging(false);
            }
        };

        return (
            <div className="page-container bridge-page animate-fadeIn">
                <h1><span role="img" aria-label="bridge-icon" style={{ marginRight: '10px' }}>🌉</span> Bridge Tokens</h1>
                <p className="page-subtitle">Pindahkan {tokenInfo.symbol || 'TKL'} Anda antar blockchain.</p>

                <div className="bridge-layout card-style"> {/* Menggunakan card-style untuk konsistensi */}
                    <form onSubmit={handleBridgeSubmit} className="bridge-form">
                        {/* Info Saldo */}
                        <div className="info-grid" style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)'}}>
                            <div>
                                <span className="info-label">Saldo {tokenInfo.symbol || 'TKL'} Anda (di Jaringan Ini)</span>
                                <span className="info-value large">{balance === 'Error' ? <span style={{color:'red'}}>Error</span> : balance}</span>
                            </div>
                            {/* Bisa ditambahkan info saldo di chain tujuan jika ada cara mengambilnya */}
                        </div>

                        {/* Chain Tujuan */}
                        <div className="form-group">
                             <label htmlFor="destination-chain">Pilih Chain Tujuan:</label>
                             <select
                                 id="destination-chain"
                                 value={destinationChain}
                                 onChange={(e) => setDestinationChain(e.target.value)}
                                 required
                                 disabled={isBridging}
                             >
                                 <option value="" disabled>-- Pilih Jaringan --</option>
                                 {supportedChains.map(chain => (
                                     <option key={chain.id} value={chain.id}>{chain.name}</option>
                                 ))}
                             </select>
                        </div>

                        {/* Jumlah Bridge */}
                         <div className="form-group">
                            <label htmlFor="amount-bridge">Jumlah {tokenInfo.symbol || 'TKL'} untuk di-bridge:</label>
                            <div className="input-group">
                                <input
                                    id="amount-bridge"
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={bridgeAmount}
                                    onChange={(e) => setBridgeAmount(e.target.value)}
                                    placeholder={`Saldo: ${balance === 'Error' ? 'N/A' : balance}`}
                                    required
                                    disabled={isBridging || !signer}
                                />
                                <span className="input-group-text">{tokenInfo.symbol || 'TKL'}</span>
                            </div>
                             <button type="button" className="link-button" onClick={() => setBridgeAmount(balance)} disabled={isBridging || !signer || parseFloat(balance || '0') <= 0}>
                                 Gunakan Saldo Maksimal
                             </button>
                         </div>

                         {/* Tombol Submit */}
                         <button
                            type="submit"
                            className="action-button"
                            disabled={isBridging || !destinationChain || !bridgeAmount || parseFloat(bridgeAmount || '0') <= 0 || parseFloat(bridgeAmount || '0') > parseFloat(balance || '0')}
                         >
                            {isBridging ? bridgeStatus : 'Mulai Bridge'}
                         </button>
                    </form>

                     {/* Pesan Status Transaksi Bridge */}
                     {bridgeStatus && !isBridging && ( // Tampilkan status final
                        <p className={`tx-status ${bridgeStatus.includes('gagal') || bridgeStatus.includes('Error') ? 'error' : (bridgeStatus.includes('berhasil') ? 'success' : 'info')}`} style={{ marginTop: '20px', textAlign: 'center' }}>
                            {bridgeStatus}
                        </p>
                     )}
                     {isBridging && bridgeStatus && ( // Tampilkan status proses
                        <p className="tx-status info" style={{ marginTop: '20px', textAlign: 'center' }}>
                            <span className="spinner" style={{marginRight: '8px'}}></span> {/* Tambahkan CSS untuk spinner jika perlu */}
                            {bridgeStatus}
                        </p>
                     )}
                </div>
                 {/* Tambahkan info tambahan tentang bridge jika perlu */}
                 <div className="info-message card-style" style={{marginTop: '20px'}}>
                     <h4><span role="img" aria-label="info">ℹ️</span> Informasi Penting</h4>
                     <ul>
                         <li>Pastikan Anda memilih chain tujuan yang benar.</li>
                         <li>Proses bridge mungkin memerlukan waktu beberapa menit hingga jam, tergantung pada jaringan.</li>
                         <li>Akan ada biaya gas di kedua jaringan (asal dan tujuan).</li>
                         <li>Ini adalah fitur eksperimental di lingkungan lokal/testnet.</li>
                     </ul>
                 </div>
            </div>
        );
    }
    // --- *** AKHIR DEFINISI BridgeComponent *** ---
    // Return JSX Utama Aplikasi -- DIMODIFIKASI --
    return (
        <div className="App">
            <Navbar
                account={account}
                connectWallet={connectWallet}
                disconnectWallet={handleDisconnect}
                activeView={activeView}
                navigate={handleNavigate}
                stakingAvailable={!!stakingContract}
                // Beri tahu Navbar jika bridge "aktif" (misal, jika ada config bridge)
                bridgeAvailable={true} // Ganti jadi dinamis jika perlu, misal cek contractInfo.bridgeContracts
            />
            <main className="main-content">
                {!account ? (
                    // Modal jika belum connect
                    // <div> {/* Div tidak perlu jika hanya ada satu elemen */}
                       <div className="modal-overlay">
                         <div className="modal-content">
                            <h2>Wallet Belum Terhubung</h2>
                            <p>Silakan hubungkan wallet MetaMask Anda untuk menggunakan DApp.</p>
                            <button className="modal-action action-button" onClick={connectWallet}>Hubungkan Wallet</button>
                            {/* Kondisi diperbaiki: cek window.ethereum saja */}
                            {!window.ethereum && <p style={{marginTop: '10px', color: 'red'}}>MetaMask tidak terdeteksi. Silakan install extension MetaMask.</p>}
                         </div>
                       </div>
                    // </div>
                ) : (
                    // Tampilkan view yang aktif
                    activeView === 'dashboard' ? <DashboardLayout /> :
                    activeView === 'docs' ? <DocsComponent /> :
                    activeView === 'about' ? <AboutComponent /> :
                    activeView === 'stake' ? <StakeComponent /> :
                    // --- BARU: Render BridgeComponent ---
                    activeView === 'bridge' ? <BridgeComponent /> :
                    // --- Akhir BARU ---
                    <DashboardLayout /> // Default kembali ke dashboard
                )}
            </main>
             {/* Optional: Footer */}
             {/* <footer className="app-footer">
                 <p>TokenLocal DApp © 2025</p>
             </footer> */}
        </div>
    );

} // Akhir komponen App

export default App;