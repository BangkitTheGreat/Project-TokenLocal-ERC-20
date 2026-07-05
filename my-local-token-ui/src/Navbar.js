// src/Navbar.js (Final Elite + Interaktif)
import React, { useState, useEffect, useRef } from 'react'; // Import useState, useEffect, useRef
import './Navbar.css'; // Pastikan CSS Navbar terbaru diimport

// Menerima props: account, connectWallet, disconnectWallet, activeView, navigate
function Navbar({ account, connectWallet, disconnectWallet, activeView, navigate }) {
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false); // State untuk dropdown
  const [copyStatus, setCopyStatus] = useState('Salin Alamat'); // State untuk teks tombol copy
  const dropdownRef = useRef(null); // Ref untuk deteksi klik di luar dropdown
  const walletButtonRef = useRef(null); // Ref untuk tombol info wallet

  // Fungsi untuk toggle dropdown
  const toggleWalletMenu = () => {
    setIsWalletMenuOpen(!isWalletMenuOpen);
    setCopyStatus('Salin Alamat'); // Reset teks tombol copy saat menu dibuka/tutup
  };

  // Fungsi untuk menyalin alamat
  const copyAddress = async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account);
      setCopyStatus('Tersalin!');
      setTimeout(() => {
          // Hanya reset jika menu masih terbuka
          if (isWalletMenuOpen) {
              setCopyStatus('Salin Alamat');
          }
      }, 1500); // Reset setelah 1.5 detik
    } catch (err) {
      console.error('Gagal menyalin alamat:', err);
      setCopyStatus('Gagal Salin');
      setTimeout(() => {
          if (isWalletMenuOpen) {
              setCopyStatus('Salin Alamat');
          }
      } , 1500);
    }
  };

  // Placeholder fungsi lihat di explorer (ganti URL jika perlu)
  const viewOnExplorer = () => {
    if (!account) return;
    // Karena ini localhost, tidak ada explorer publik.
    alert("Explorer tidak tersedia untuk jaringan localhost Hardhat.");
    // Jika di testnet (misal Sepolia):
    // const url = `https://sepolia.etherscan.io/address/${account}`;
    // window.open(url, '_blank');
  };

  // Fungsi untuk menutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event) {
      // Cek apakah klik terjadi di luar dropdown DAN di luar tombol info wallet
      if (
          dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          walletButtonRef.current && !walletButtonRef.current.contains(event.target)
         )
      {
            // console.log("Clicked outside, closing menu.");
            setIsWalletMenuOpen(false);
            // Tidak perlu reset copy status di sini, biarkan timeout
      }
    }
    // Tambahkan event listener jika dropdown terbuka
    if (isWalletMenuOpen) {
      // console.log("Adding click outside listener");
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      // console.log("Removing click outside listener");
      document.removeEventListener("mousedown", handleClickOutside);
    }
    // Cleanup listener saat komponen unmount atau state berubah
    return () => {
      // console.log("Cleaning up click outside listener");
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isWalletMenuOpen]); // Efek ini bergantung pada state isWalletMenuOpen


  // Helper function untuk render status wallet
  const renderWalletStatus = () => {
    if (!account) {
      return (
        <button onClick={connectWallet} className="connect-button-nav">
          <span role="img" aria-label="plug" style={{ marginRight: '8px' }}>🔌</span>
          Hubungkan Wallet
        </button>
      );
    } else {
      // Tampilan alamat terpotong yang sudah diperbaiki
      let displayAddress = 'Invalid Address';
      if (typeof account === 'string' && account.startsWith('0x') && account.length === 42) {
         const start = account.substring(0, 6);
         const end = account.substring(account.length - 4);
         displayAddress = `${start}...${end}`;
      } else if (account) {
        displayAddress = 'Invalid Format';
      }

      return (
        // Wadah relatif untuk dropdown absolut
        <div className="wallet-status-container">
          {/* Tombol Info Wallet yang bisa diklik */}
          {/* Tambahkan ref ke tombol ini */}
          <button onClick={toggleWalletMenu} className="wallet-info-nav" ref={walletButtonRef}>
             <span className="wallet-icon-indicator"></span>
             <span className="wallet-address">{displayAddress}</span>
             {/* Tambahkan ikon panah dropdown kecil */}
             <span className={`dropdown-arrow ${isWalletMenuOpen ? 'open' : ''}`}>▼</span>
          </button>

          {/* Dropdown Menu (muncul jika isWalletMenuOpen true) */}
          {isWalletMenuOpen && (
            // Tambahkan ref ke dropdown ini
            <div className="wallet-dropdown" ref={dropdownRef}>
              <button onClick={copyAddress} className="dropdown-item">
                {copyStatus} {/* Tampilkan status copy */}
              </button>
              <button onClick={viewOnExplorer} className="dropdown-item">
                Lihat di Explorer
              </button>
              <button onClick={() => {
                  disconnectWallet(); // Panggil fungsi disconnect dari props
                  setIsWalletMenuOpen(false); // Tutup menu setelah disconnect
                }}
                className="dropdown-item disconnect">
                Putuskan Koneksi
              </button>
            </div>
          )}
        </div>
      );
    }
  }; // Akhir renderWalletStatus


  // Return JSX Navbar utama (Link diubah menjadi button dengan onClick)
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="nav-logo">
           <span role="img" aria-label="logo" style={{ fontSize: '1.5rem', marginRight: '5px' }}>💎</span>
           TokenLocal
        </div>
        <div className="nav-links">
           {/* Gunakan button dan onClick untuk navigasi SPA */}
           <button onClick={() => navigate('dashboard')} className={`nav-link ${activeView === 'dashboard' ? 'active' : ''}`}>
             <span role="img" aria-label="dashboard">📊</span> Dashboard
           </button>
           <button onClick={() => navigate('stake')} className={`nav-link ${activeView === 'stake' ? 'active' : ''}`}>
             <span role="img" aria-label="stake">💰</span> Stake 
           </button>
           <button onClick={() => navigate('bridge')} className={`nav-link ${activeView === 'bridge' ? 'active' : ''}`}>
             <span role="img" aria-label="bridge">🌉</span> Bridge
           </button>
           <button onClick={() => navigate('docs')} className={`nav-link ${activeView === 'docs' ? 'active' : ''}`}>
             <span role="img" aria-label="docs">📚</span> Docs
           </button>
           <button onClick={() => navigate('about')} className={`nav-link ${activeView === 'about' ? 'active' : ''}`}>
             <span role="img" aria-label="about">ℹ️</span> About
           </button>
           {/* ============================================== */}
        </div>
        <div className="nav-wallet">
          {renderWalletStatus()}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
