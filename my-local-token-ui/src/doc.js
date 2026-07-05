// src/Docs.js
import React, { useState } from 'react';
import './App.css'; // Kita akan tambahkan gaya di App.css

// Komponen Docs menerima contractAddress sebagai prop
function DocsComponent({ contractAddress }) {
  // State untuk mengontrol bagian mana yang terbuka/tertutup
  const [openSections, setOpenSections] = useState({
    pengenalan: true, // Buka bagian pengenalan secara default
    setup: false,
    konsep: false,
    kontrak: false,
    dapp: false,
    api: false,
    troubleshooting: false,
  });

  // State untuk feedback tombol copy
  const [copyFeedback, setCopyFeedback] = useState({}); // { id: 'Tersalin!', id2: 'Salin' }

  // Fungsi untuk toggle buka/tutup section
  const toggleSection = (sectionName) => {
    setOpenSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  // Fungsi untuk menyalin teks ke clipboard
  const handleCopy = async (textToCopy, id) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyFeedback(prev => ({ ...prev, [id]: 'Tersalin!' }));
      setTimeout(() => {
        setCopyFeedback(prev => ({ ...prev, [id]: 'Salin' }));
      }, 1500);
    } catch (err) {
      console.error('Gagal menyalin:', err);
      setCopyFeedback(prev => ({ ...prev, [id]: 'Gagal' }));
       setTimeout(() => {
        setCopyFeedback(prev => ({ ...prev, [id]: 'Salin' }));
      }, 1500);
    }
  };

  // Helper untuk membuat tombol toggle section
  const SectionToggle = ({ sectionId, title }) => (
    <button className="section-toggle" onClick={() => toggleSection(sectionId)}>
      <h2>
        <span className={`toggle-arrow ${openSections[sectionId] ? 'open' : ''}`}>▶</span>
        {title}
      </h2>
    </button>
  );

  // Helper untuk blok kode dengan tombol copy
  const CodeBlock = ({ code, language = 'solidity', id }) => {
    const btnText = copyFeedback[id] || 'Salin';
    return (
      <div className="code-block-container">
        <pre className={`code-block language-${language}`}>
          <code>{code}</code>
        </pre>
        <button className="copy-button" onClick={() => handleCopy(code, id)}>
          {btnText}
        </button>
      </div>
    );
  };


  return (
    <div className="page-container docs-page">
      <h1><span role="img" aria-label="docs-icon" style={{ marginRight: '10px' }}>📚</span>TokenLocal</h1>
      <p className="page-subtitle">Panduan Lengkap untuk Developer dan Pengguna</p>

      {/* Bagian Pengenalan */}
      <section className={`docs-section ${openSections.pengenalan ? 'open' : ''}`}>
        <SectionToggle sectionId="pengenalan" title="1. Pengenalan & Tujuan" />
        <div className="section-content">
          <p>Selamat datang di dokumentasi TokenLocal (TKL). Proyek ini adalah implementasi token standar ERC-20 yang berjalan di lingkungan blockchain lokal (Hardhat Network), dirancang khusus sebagai platform pembelajaran interaktif.</p>
          <p><strong>Tujuan Utama:</strong></p>
          <ul>
            <li><span className="list-icon">🎓</span> Memberikan contoh nyata implementasi smart contract ERC-20 menggunakan Solidity dan OpenZeppelin.</li>
            <li><span className="list-icon">💻</span> Mendemonstrasikan cara membangun antarmuka pengguna (dApp frontend) dengan React dan Ethers.js untuk berinteraksi dengan smart contract.</li>
            <li><span className="list-icon">🧪</span> Menyediakan lingkungan 'sandbox' yang aman bagi developer untuk bereksperimen dengan fungsi token, transaksi, dan event blockchain tanpa risiko finansial.</li>
            <li><span className="list-icon">🚀</span> Menjadi fondasi yang dapat dikembangkan lebih lanjut untuk fitur DeFi yang lebih kompleks (staking, swap sederhana, dll.) di masa depan.</li>
          </ul>
          <p>Dokumentasi ini akan memandu Anda melalui setup, konsep dasar, detail kontrak, penggunaan DApp, hingga potensi pengembangan selanjutnya.</p>
        </div>
      </section>

      {/* Bagian Setup */}
      <section className={`docs-section ${openSections.setup ? 'open' : ''}`}>
         <SectionToggle sectionId="setup" title="2. Setup Lingkungan Lokal" />
         <div className="section-content">
            <p>Untuk menjalankan proyek ini di komputer Anda, pastikan Anda memiliki prasyarat berikut:</p>
            <ul>
                <li><span className="list-icon">📦</span> Node.js (Versi LTS direkomendasikan) dan NPM/Yarn.</li>
                <li><span className="list-icon">🦊</span> Ekstensi browser dompet Web3 seperti MetaMask.</li>
                <li><span className="list-icon">⌨️</span> Terminal atau Command Prompt.</li>
                <li><span className="list-icon">✨</span> Kode sumber proyek ini (folder Hardhat dan folder React).</li>
            </ul>
            <p>Langkah Menjalankan:</p>
            <ol>
                <li><strong>Clone Repositori (jika ada):</strong> Dapatkan kode sumber proyek.</li>
                <li><strong>Install Dependencies:</strong> Buka terminal di folder proyek Hardhat, jalankan `npm install` (atau `yarn`). Lakukan hal yang sama di folder proyek React.</li>
                <li><strong>Jalankan Node Lokal:</strong> Di terminal folder Hardhat, jalankan `npx hardhat node`. Biarkan berjalan.</li>
                <li><strong>Deploy Kontrak:</strong> Buka terminal baru, masuk ke folder Hardhat, jalankan `npx hardhat run scripts/deployTokenLocal.ts --network localhost`. Jika Anda menggunakan skrip deploy otomatis, ini akan mengupdate `contract-config.json` di folder React.</li>
                <li><strong>Jalankan Frontend:</strong> Buka terminal baru, masuk ke folder React, jalankan `npm start`.</li>
                <li><strong>Konfigurasi MetaMask:</strong> Tambahkan jaringan Hardhat Localhost (RPC: `http://127.0.0.1:8545`, Chain ID: `31337`) dan impor salah satu akun dari output `npx hardhat node` menggunakan private key-nya.</li>
                <li><strong>Akses DApp:</strong> Buka `http://localhost:3000` (atau port yang sesuai) di browser Anda.</li>
            </ol>
         </div>
      </section>

      {/* Bagian Konsep Dasar */}
      <section className={`docs-section ${openSections.konsep ? 'open' : ''}`}>
         <SectionToggle sectionId="konsep" title="3. Konsep Dasar" />
         <div className="section-content">
             <p>Proyek ini melibatkan beberapa teknologi dan konsep kunci dalam ekosistem Web3:</p>
             <dl className="definition-list">
                 <dt>Blockchain Lokal (Hardhat Network)</dt>
                 <dd>Simulasi jaringan Ethereum yang berjalan sepenuhnya di komputer Anda. Ideal untuk pengembangan dan pengujian cepat tanpa biaya gas nyata.</dd>

                 <dt>Smart Contract</dt>
                 <dd>Program komputer yang berjalan di atas blockchain. Kontrak `TokenLocal.sol` mendefinisikan logika token TKL.</dd>

                 <dt>Solidity</dt>
                 <dd>Bahasa pemrograman populer yang digunakan untuk menulis smart contract di platform EVM (Ethereum Virtual Machine) seperti Ethereum dan Hardhat.</dd>

                 <dt>ERC-20</dt>
                 <dd>Standar teknis yang paling umum untuk token fungible (dapat dipertukarkan) di blockchain Ethereum. Mendefinisikan fungsi inti seperti `transfer`, `balanceOf`, `approve`, dll.</dd>

                 <dt>Ownable</dt>
                 <dd>Pola desain smart contract (dari OpenZeppelin) yang memberikan satu alamat (pemilik/owner) hak istimewa untuk melakukan tindakan tertentu, seperti `mint` dalam kasus TKL.</dd>

                 <dt>dApp (Decentralized Application)</dt>
                 <dd>Aplikasi yang backend-nya (logika inti) berjalan di jaringan terdesentralisasi (blockchain) melalui smart contract. Frontend (antarmuka pengguna) biasanya berupa aplikasi web standar (React dalam kasus ini) yang berinteraksi dengan kontrak.</dd>

                 <dt>Ethers.js</dt>
                 <dd>Pustaka JavaScript yang komprehensif untuk berinteraksi dengan blockchain Ethereum dan EVM-compatible lainnya dari frontend atau backend Node.js.</dd>

                 <dt>MetaMask</dt>
                 <dd>Dompet browser non-kustodial yang memungkinkan pengguna mengelola kunci pribadi mereka dan berinteraksi dengan dApp dengan aman.</dd>
             </dl>
         </div>
      </section>

       {/* Bagian Detail Kontrak */}
      <section className={`docs-section ${openSections.kontrak ? 'open' : ''}`}>
         <SectionToggle sectionId="kontrak" title="4. Detail Smart Contract TokenLocal" />
         <div className="section-content">
             <p>Smart contract `TokenLocal.sol` adalah inti dari token TKL. Dibangun menggunakan Solidity dan OpenZeppelin v5+.</p>
             <p><strong>Alamat Kontrak (Lokal):</strong> <code className='code-inline'>{contractAddress || 'Belum Terdeploy / Gagal Baca'}</code></p>
             <p><strong>Fitur Utama & Fungsi Penting:</strong></p>
             <ul>
                 <li><strong>Constructor:</strong> Menginisialisasi token dengan nama, simbol, dan pasokan awal yang diberikan kepada deployer (owner).</li>
                 <li><strong>Fungsi ERC-20 Standar:</strong>
                    <ul>
                        <li>`name()`: Mengembalikan nama token.</li>
                        <li>`symbol()`: Mengembalikan simbol token.</li>
                        <li>`decimals()`: Mengembalikan jumlah desimal (default 18).</li>
                        <li>`totalSupply()`: Mengembalikan jumlah total token yang ada.</li>
                        <li>`balanceOf(address account)`: Mengembalikan saldo token untuk alamat tertentu.</li>
                        <li>`transfer(address to, uint256 amount)`: Mengirim token dari alamat pemanggil ke alamat tujuan.</li>
                        <li>`approve(address spender, uint256 amount)`: Memberi izin kepada `spender` untuk menarik hingga `amount` token dari alamat pemanggil.</li>
                        <li>`allowance(address owner, address spender)`: Mengecek sisa jumlah token yang diizinkan untuk ditarik oleh `spender` dari `owner`.</li>
                        <li>`transferFrom(address from, address to, uint256 amount)`: Mengirim token dari `from` ke `to`, hanya bisa dipanggil oleh alamat yang telah diberi `allowance` oleh `from`.</li>
                    </ul>
                 </li>
                 <li><strong>Fungsi Ownable:</strong>
                    <ul>
                        <li>`owner()`: Mengembalikan alamat pemilik kontrak saat ini.</li>
                        <li>`mint(address to, uint256 amount)`: (Ditambahkan custom) Hanya bisa dipanggil oleh `owner` untuk membuat token baru dan mengirimkannya ke alamat `to`.</li>
                        <li>`transferOwnership(address newOwner)`: Memindahkan kepemilikan kontrak ke alamat baru (hanya bisa dipanggil owner).</li>
                        <li>`renounceOwnership()`: Melepaskan kepemilikan kontrak (aksi permanen, hanya bisa dipanggil owner).</li>
                    </ul>
                 </li>
             </ul>
             <p>Untuk detail implementasi lengkap, silakan merujuk ke file `TokenLocal.sol` dan dokumentasi OpenZeppelin.</p>
         </div>
      </section>

      {/* Bagian Penggunaan DApp (diperbarui) */}
       <section className={`docs-section ${openSections.dapp ? 'open' : ''}`}>
         <SectionToggle sectionId="dapp" title="5. Panduan Penggunaan DApp" />
         <div className="section-content">
             <p>Antarmuka web ini menyediakan cara visual untuk berinteraksi dengan TokenLocal.</p>
             <ol>
                 <li><strong>Koneksi Wallet:</strong> Klik tombol "Hubungkan Wallet" di Navbar. Pilih akun Hardhat Anda di MetaMask dan setujui koneksi. Pastikan jaringan adalah "Hardhat Localhost".</li>
                 <li><strong>Navbar:</strong> Menampilkan status koneksi (alamat terpotong) atau tombol connect. Klik alamat terpotong untuk opsi Salin, Explorer (placeholder), atau Putuskan Koneksi. Link navigasi (Dashboard, Docs, About) memungkinkan Anda berpindah halaman.</li>
                 <li><strong>Dashboard (Tampilan Utama):</strong>
                    <ul>
                        <li>**Kolom Kiri:** Menampilkan detail token (Nama, Simbol, dll.) dan saldo TKL Anda saat ini di kartu "Info & Saldo". Di bawahnya adalah kartu "Transfer Token" untuk mengirim TKL.</li>
                        <li>**Kolom Tengah:** Kartu "Welcome" dengan informasi umum, statistik dasar (Total Supply, Decimals), dan tombol aksi placeholder. Bagian bawahnya berisi info tambahan tentang TKL.</li>
                        <li>**Kolom Kanan:** Kartu "Info Akun" menampilkan alamat lengkap Anda dan tombol Ganti Akun/Putuskan Koneksi. Di bawahnya adalah kartu "Mint Token" yang hanya berfungsi jika Anda terhubung sebagai pemilik kontrak.</li>
                    </ul>
                 </li>
                 <li><strong>Formulir Aksi (Transfer/Mint):** Isi alamat penerima dan jumlah token. Klik tombol aksi ("Transfer" atau "Mint"). Anda perlu menyetujui transaksi di MetaMask.</li>
                 <li><strong>Status Transaksi:** Setelah mengirim transaksi, pesan status akan muncul di bagian bawah dashboard, menunjukkan apakah transaksi sedang diproses, berhasil, atau gagal.</li>
             </ol>
         </div>
      </section>

      {/* Bagian API (Simulasi) */}
      <section className={`docs-section ${openSections.api ? 'open' : ''}`}>
         <SectionToggle sectionId="api" title="6. Referensi Fungsi Kontrak (API)" />
         <div className="section-content">
             <p>Berikut adalah ringkasan fungsi utama yang bisa dipanggil pada kontrak TokenLocal:</p>

             <div className="api-function">
                 <h3>balanceOf</h3>
                 <p className="api-desc">Mendapatkan saldo token dari sebuah alamat.</p>
                 <p><strong>Parameter:</strong></p>
                 <ul><li><code className="code-inline">address account</code> - Alamat yang ingin dicek saldonya.</li></ul>
                 <p><strong>Mengembalikan:</strong></p>
                 <ul><li><code className="code-inline">uint256</code> - Jumlah saldo token.</li></ul>
                 <p><strong>Tipe:</strong> View (Read-only)</p>
             </div>

             <div className="api-function">
                 <h3>transfer</h3>
                 <p className="api-desc">Mengirim sejumlah token dari alamat Anda ke alamat lain.</p>
                 <p><strong>Parameter:</strong></p>
                 <ul>
                     <li><code className="code-inline">address to</code> - Alamat penerima.</li>
                     <li><code className="code-inline">uint256 amount</code> - Jumlah token yang dikirim (dalam unit terkecil, wei).</li>
                 </ul>
                 <p><strong>Mengembalikan:</strong></p>
                 <ul><li><code className="code-inline">bool</code> - Menandakan keberhasilan transfer.</li></ul>
                 <p><strong>Tipe:</strong> Non-payable (Write, memerlukan gas)</p>
                 <p><strong>Event:</strong> Memancarkan event `Transfer`.</p>
             </div>

              <div className="api-function">
                 <h3>mint</h3>
                 <p className="api-desc">Membuat token baru dan menambahkannya ke saldo alamat tujuan. <strong>Hanya bisa dipanggil oleh Owner.</strong></p>
                 <p><strong>Parameter:</strong></p>
                 <ul>
                     <li><code className="code-inline">address to</code> - Alamat penerima token baru.</li>
                     <li><code className="code-inline">uint256 amount</code> - Jumlah token yang dibuat (dalam unit terkecil, wei).</li>
                 </ul>
                 <p><strong>Mengembalikan:</strong> Tidak ada.</p>
                 <p><strong>Tipe:</strong> Non-payable (Write, memerlukan gas)</p>
                 <p><strong>Event:</strong> Memancarkan event `Transfer` (dari alamat 0x0).</p>
                 <p><strong>Modifier:</strong> `onlyOwner`</p>
             </div>

             {/* Tambahkan deskripsi fungsi lain jika perlu (approve, transferFrom, owner, dll.) */}
             <p>Untuk daftar fungsi lengkap dan detail implementasi, silakan lihat ABI kontrak atau kode sumber `TokenLocal.sol`.</p>

         </div>
      </section>

      {/* Bagian Troubleshooting */}
      <section className={`docs-section ${openSections.troubleshooting ? 'open' : ''}`}>
         <SectionToggle sectionId="troubleshooting" title="7. Pemecahan Masalah (Troubleshooting)" />
         <div className="section-content">
             <p>Mengalami kendala? Berikut beberapa masalah umum dan solusinya:</p>
             <ul>
                 <li><strong>Error "Silakan ganti jaringan...":</strong> Pastikan MetaMask Anda terhubung ke jaringan "Hardhat Localhost" dengan Chain ID 31337. Periksa konfigurasi jaringan di MetaMask.</li>
                 <li><strong>Error "invalid value for Contract target...":</strong> Alamat kontrak di `App.js` (atau `contract-config.json`) salah. Pastikan Anda menggunakan alamat dari hasil deploy terakhir ke jaringan lokal.</li>
                 <li><strong>Error "A listener indicated..." / Error QUIC:</strong> Masalah pada ekstensi MetaMask atau browser. Coba restart browser, update MetaMask, nonaktifkan ekstensi lain, atau instal ulang MetaMask (backup seed phrase!). Nonaktifkan QUIC di `chrome://flags` jika error QUIC muncul terus.</li>
                 <li><strong>Transaksi Gagal (Reverted):</strong> Periksa pesan error di MetaMask atau Developer Console. Mungkin saldo tidak cukup, alamat salah, atau (untuk mint) Anda bukan owner.</li>
                 <li><strong>Tampilan Aneh / Tidak Update:</strong> Coba Hard Refresh (Ctrl+Shift+R / Cmd+Shift+R) atau hapus cache browser untuk `localhost`. Pastikan server `npm start` dan `npx hardhat node` berjalan tanpa error.</li>
                 <li><strong>Tombol Tidak Berfungsi:</strong> Periksa Developer Console (F12) untuk error JavaScript di frontend (`App.js` atau `Navbar.js`).</li>
             </ul>
         </div>
      </section>

    </div>
  );
}

// Komponen Halaman Tentang (Isi Konten)
function AboutComponent() {
     return (
        <div className="page-container about-page">
            <h1><span role="img" aria-label="about-icon" style={{marginRight: '10px'}}>ℹ️</span>Tentang Proyek Ini</h1>
            <p className="about-subtitle">Menjelajahi Web3 dengan Token Lokal Anda</p>

            <section className="about-section">
                <h2>Visi & Misi</h2>
                <p>TokenLocal DApp adalah sebuah inisiatif sumber terbuka yang bertujuan untuk menyediakan platform sederhana namun fungsional bagi para pengembang, pelajar, dan antusias blockchain untuk bereksperimen dengan token ERC-20 dan interaksi dApp dalam lingkungan pengembangan lokal yang aman dan terkontrol. Misi kami adalah menurunkan hambatan masuk ke dunia Web3 dengan menyediakan contoh kerja yang mudah dipahami dan dimodifikasi.</p>
                <p>Kami percaya bahwa praktik langsung adalah cara terbaik untuk belajar. Dengan DApp ini, Anda dapat secara visual memahami alur kerja dasar sebuah aplikasi terdesentralisasi, mulai dari koneksi wallet, pembacaan data on-chain, hingga pengiriman transaksi.</p>
            </section>

             <section className="about-section team-section">
                <h2>Tim Inti (Placeholder)</h2>
                <div className="team-members">
                    <div className="team-member">
                        <div className="member-avatar">🧙‍♂️</div>
                        <div className="member-name">Solidity Sorcerer</div>
                        <div className="member-role">Smart Contract Dev</div>
                    </div>
                     <div className="team-member">
                        <div className="member-avatar">✨</div>
                        <div className="member-name">React Ranger</div>
                        <div className="member-role">Frontend Dev</div>
                    </div>
                     <div className="team-member">
                        <div className="member-avatar">🎨</div>
                        <div className="member-name">CSS Conjurer</div>
                        <div className="member-role">UI/UX Design</div>
                    </div>
                </div>
            </section>

            <section className="about-section">
                <h2>Teknologi Kunci</h2>
                 <ul className="tech-list">
                    <li><span className="tech-icon">📜</span> <strong>Solidity:</strong> Bahasa pemrograman utama untuk smart contract di EVM.</li>
                    <li><span className="tech-icon">🛠️</span> <strong>Hardhat:</strong> Lingkungan pengembangan Ethereum untuk kompilasi, deployment, testing, dan menjalankan node lokal.</li>
                    <li><span className="tech-icon">🛡️</span> <strong>OpenZeppelin:</strong> Pustaka kontrak pintar yang aman dan terstandarisasi (ERC20, Ownable).</li>
                    <li><span className="tech-icon">⚛️</span> <strong>React.js:</strong> Pustaka JavaScript populer untuk membangun antarmuka pengguna yang interaktif.</li>
                    <li><span className="tech-icon" style={{fontFamily:'monospace', fontWeight:'bold'}}>ethers.js</span> <strong>Ethers.js:</strong> Pustaka JavaScript modern untuk berinteraksi dengan blockchain Ethereum (dan EVM lainnya).</li>
                    <li><span className="tech-icon">🦊</span> <strong>MetaMask:</strong> Dompet browser paling populer dan sebagai jembatan antara DApp dan blockchain.</li>
                    <li><span className="tech-icon">🎨</span> <strong>CSS Modern:</strong> Menggunakan Flexbox, Grid, Variabel CSS, dan teknik styling lainnya untuk tampilan responsif dan menarik.</li>
                </ul>
            </section>

             <section className="about-section">
                <h2>Bergabunglah Dengan Kami</h2>
                <p>Proyek ini bersifat terbuka. Kami menyambut kontribusi, masukan, dan diskusi. Temukan kami di platform berikut:</p>
                 <div className="hero-links-container"> {/* Gunakan style link yang sama */}
                    <a href="#github" className="hero-link" onClick={(e) => e.preventDefault()}>GitHub Repositori</a>
                    <a href="#discord" className="hero-link" onClick={(e) => e.preventDefault()}>Server Discord</a>
                    <a href="#twitter" className="hero-link" onClick={(e) => e.preventDefault()}>Ikuti di Twitter</a>
                </div>
            </section>
        </div>
    );
}
// =======================================================================

// Komponen App Utama (Return JSX)
function App() {
    // ... (Definisi state dan fungsi lainnya tetap sama seperti di atas) ...
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);
    const [tokenInfo, setTokenInfo] = useState({ name: '', symbol: '', decimals: 0, totalSupply: '0' });
    const [balance, setBalance] = useState('0');
    const [transferRecipient, setTransferRecipient] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [mintRecipient, setMintRecipient] = useState('');
    const [mintAmount, setMintAmount] = useState('');
    const [txStatus, setTxStatus] = useState('');
    const [activeView, setActiveView] = useState('dashboard');

    const connectWallet = async () => { /* ... definisi fungsi ... */
        if (window.ethereum) {
            try {
                const web3Provider = new ethers.BrowserProvider(window.ethereum);
                const network = await web3Provider.getNetwork();
                if (network.chainId.toString() !== '31337') {
                    alert("Silakan ganti jaringan MetaMask Anda ke Hardhat Localhost (Chain ID 31337)"); return;
                }
                await web3Provider.send("eth_requestAccounts", []);
                const web3Signer = await web3Provider.getSigner();
                const userAddress = await web3Signer.getAddress();
                setProvider(web3Provider);
                setSigner(web3Signer);
                setAccount(userAddress);
                const tokenContract = new ethers.Contract(contractAddress, contractABI, web3Signer);
                setContract(tokenContract);
            } catch (error) {
                console.error("Gagal menghubungkan/mengganti wallet:", error);
                if (error.code !== 4001) {
                   alert(`Gagal menghubungkan wallet: ${error.message || 'Error tidak diketahui'}`);
                }
            }
        } else { alert('Install MetaMask atau wallet lainnya!'); }
    };
    const getTokenData = async () => { /* ... definisi fungsi ... */
        if (contract && account && ethers.isAddress(account)) {
            console.log(`Mencoba get token data untuk akun: ${account}`);
            try {
                const name = await contract.name();
                const symbol = await contract.symbol();
                const decimalsBigInt = await contract.decimals();
                const decimals = Number(decimalsBigInt);
                const totalSupply = await contract.totalSupply();
                const userBalance = await contract.balanceOf(account);
                console.log(`Data diterima: Name=${name}, Symbol=${symbol}, Decimals=${decimals}, Supply=${totalSupply}, Balance=${userBalance}`);
                setTokenInfo({ name, symbol, decimals, totalSupply: ethers.formatUnits(totalSupply, decimals) });
                setBalance(ethers.formatUnits(userBalance, decimals));
            } catch (error) {
                console.error("Gagal membaca data token:", error);
                 setTokenInfo({ name: 'Error', symbol: 'ERR', decimals: 0, totalSupply: 'Error' });
                 setBalance('Error');
            }
        } else {
             console.log("Lewati getTokenData: kontrak atau akun belum siap.", { contractExists: !!contract, accountExists: !!account });
             setTokenInfo({ name: '', symbol: '', decimals: 0, totalSupply: '0' });
             setBalance('0');
        }
     };
    const handleDisconnect = () => { /* ... definisi fungsi ... */
        console.log("Disconnecting...");
        setAccount(null); setSigner(null); setContract(null); setBalance('0');
        setTokenInfo({ name: '', symbol: '', decimals: 0, totalSupply: '0' });
        setTxStatus('');
        setTransferRecipient(''); setTransferAmount('');
        setMintRecipient(''); setMintAmount('');
        setActiveView('dashboard');
     };
    const handleChangeAccount = async () => { /* ... definisi fungsi ... */
        console.log("Attempting to change account...");
        await connectWallet();
     };
     const handleNavigate = (view) => { /* ... definisi fungsi ... */
        console.log("Navigating to:", view);
        setActiveView(view);
     };
     useEffect(() => { /* ... definisi useEffect listener ... */
        const attemptConnectionOrReset = async () => {
          if (!window.ethereum) { console.log("useEffect: MetaMask tidak terdeteksi."); return; }
          try {
              const accounts = await window.ethereum.request({ method: 'eth_accounts' });
              if (accounts.length > 0) {
                  if (!account || accounts[0] !== account) { // Cek jika akun belum diset atau berbeda
                    console.log("useEffect: Akun terdeteksi, mencoba connect/reconnect...");
                    await connectWallet();
                  } else if (contract) { // Jika akun sama dan kontrak ada, refresh data
                     console.log("useEffect: Akun sama terdeteksi, refresh data token awal");
                     getTokenData();
                  }
              } else if (account) { // Jika tidak ada akun terdeteksi tapi state account ada (user disconnect)
                  console.log("useEffect: Tidak ada akun terhubung (user disconnect?), reset state.");
                  handleDisconnect();
              }
          } catch (error) {
               console.error("useEffect: Error saat attemptConnectionOrReset:", error);
               handleDisconnect();
          }
        };
        const handleAccountsChanged = (accounts) => {
            console.log("Listener: Akun berubah:", accounts);
            if (accounts.length === 0) { handleDisconnect(); }
            else { connectWallet(); }
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
            console.log("useEffect: Mencoba koneksi awal...");
            attemptConnectionOrReset();
        } else { console.log("useEffect: MetaMask tidak terdeteksi saat mount."); }
        return () => {
            if (window.ethereum?.removeListener) {
                console.log("useEffect Cleanup: Membersihkan listeners...");
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            }
        };
     }, []);
     useEffect(() => { /* ... definisi useEffect getTokenData ... */
        console.log("useEffect[contract, account]: Dipicu.");
        if (contract && account) {
            console.log("useEffect[contract, account]: Memanggil getTokenData.");
            getTokenData();
        } else {
             console.log("useEffect[contract, account]: Lewati getTokenData, contract atau account belum siap.");
             setTokenInfo({ name: '', symbol: '', decimals: 0, totalSupply: '0' });
             setBalance('0');
        }
     }, [contract, account]);
    const handleTransfer = async (event) => { /* ... definisi fungsi ... */
        event.preventDefault();
        if (!contract || !signer || !transferAmount || !transferRecipient || !ethers.isAddress(transferRecipient)) {
            alert("Pastikan wallet terhubung, alamat penerima valid, dan jumlah transfer terisi."); return;
        }
        setTxStatus('Mengirim transaksi transfer...');
        try {
            const amountInUnits = ethers.parseUnits(transferAmount, tokenInfo.decimals);
            const tx = await contract.transfer(transferRecipient, amountInUnits);
            setTxStatus(`Transaksi dikirim! Hash: ${tx.hash}. Menunggu konfirmasi...`);
            await tx.wait();
            setTxStatus(`Transfer ${transferAmount} ${tokenInfo.symbol} ke ${transferRecipient} berhasil!`);
            setTransferRecipient(''); setTransferAmount('');
            getTokenData();
        } catch (error) {
            console.error("Transfer gagal:", error);
            setTxStatus(`Transfer gagal: ${error.reason || error.message || 'Unknown error'}`);
        }
     };
    const handleMint = async (event) => { /* ... definisi fungsi ... */
         event.preventDefault();
        if (!contract || !signer || !mintAmount || !mintRecipient || !ethers.isAddress(mintRecipient)) {
            alert("Pastikan wallet terhubung, alamat penerima valid, dan jumlah mint terisi."); return;
        }
        try {
            const ownerAddress = await contract.owner();
            if (!signer || (await signer.getAddress()) !== ownerAddress) {
                alert("Hanya owner yang bisa melakukan mint!"); return;
            }
        } catch (error) {
            console.error("Gagal memeriksa owner:", error);
            alert("Tidak bisa memverifikasi kepemilikan kontrak."); return;
        }
        setTxStatus('Mengirim transaksi mint...');
        try {
            const amountInUnits = ethers.parseUnits(mintAmount, tokenInfo.decimals);
            const tx = await contract.mint(mintRecipient, amountInUnits);
            setTxStatus(`Transaksi Mint dikirim! Hash: ${tx.hash}. Menunggu konfirmasi...`);
            await tx.wait();
            setTxStatus(`Mint ${mintAmount} ${tokenInfo.symbol} ke ${mintRecipient} berhasil!`);
            setMintRecipient(''); setMintAmount('');
            getTokenData();
        } catch (error) {
            console.error("Mint gagal:", error);
            setTxStatus(`Mint gagal: ${error.reason || error.message || 'Unknown error'}`);
        }
     };

     // Komponen Dashboard Layout (dipisah agar return utama lebih rapi)
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
                    <div className="hero-card"><div className="token-logo"><span role="img" aria-label="rocket" style={{ fontSize: '3.5rem' }}>🚀</span></div><h1 className="hero-title">Welcome to <span style={{ color: 'var(--jupiter-gradient-end)' }}>{tokenInfo.name || 'TokenLocal'}</span> DApp!</h1><p className="hero-slogan">A modern, secure, and local-first token experience.<br />Manage, transfer, and mint your {tokenInfo.symbol || 'TKL'} tokens with ease.</p><div className="stats-card"><div className="stat"><span className="stat-label">Total Supply</span><span className="stat-value">{tokenInfo.totalSupply} {tokenInfo.symbol || ''}</span></div><div className="stat"><span className="stat-label">Decimals</span><span className="stat-value">{tokenInfo.decimals || '...'}</span></div></div><div className="quick-actions"><button className="action-button" style={{ width: 'auto', margin: '10px 10px 0 0' }} onClick={() => alert('Fungsi belum ada')}>Add to Wallet</button><button className="action-button" style={{ width: 'auto', margin: '10px 10px 0 0' }} onClick={() => alert('Fungsi belum ada')}>Buy TKL</button><button className="action-button" style={{ width: 'auto', margin: '10px 0 0 0' }} onClick={() => alert('Fungsi belum ada')}>Swap</button></div><div className="hero-extra-info"><h4>Tentang TokenLocal ({tokenInfo.symbol || 'TKL'})</h4><p>TokenLocal adalah token utilitas eksperimental berbasis ERC-20 yang berjalan di jaringan lokal Anda, dirancang untuk pembelajaran dan pengembangan ekosistem terdesentralisasi.</p><div className="hero-links-container"><a href="#docs" className="hero-link" onClick={(e) => {e.preventDefault(); handleNavigate('docs');}}>Baca Docs</a><a href="#community" className="hero-link" onClick={(e) => e.preventDefault()}>Gabung Komunitas</a></div></div></div>
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

    // Return JSX Utama Aplikasi
    return (
        <div className="App">
            <Navbar
                account={account}
                connectWallet={connectWallet}
                disconnectWallet={handleDisconnect}
                activeView={activeView}
                navigate={handleNavigate}
            />

            <main className="main-content">
                {!account ? (
                     // Modal jika belum connect
                     <div><div className="modal-overlay"><div className="modal-content"><h2>Wallet Belum Terhubung</h2><p>Silakan hubungkan wallet Anda melalui tombol di Navbar.</p><button className="modal-action" onClick={connectWallet}>Hubungkan Wallet</button></div></div></div>
                ) : (
                    // Tampilkan view yang aktif
                    activeView === 'dashboard' ? <DashboardLayout /> :
                    activeView === 'docs' ? <DocsComponent contractAddress={contractAddress} /> : // Kirim address ke Docs
                    activeView === 'about' ? <AboutComponent /> :
                    <DashboardLayout /> // Default
                )}
            </main>
        </div>
    );

} // Akhir komponen App

export default App;
