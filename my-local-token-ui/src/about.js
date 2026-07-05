// src/About.js - Komponen Halaman Tentang yang Ditingkatkan
import React from 'react';
import './App.css'; // Menggunakan gaya dari App.css

function About() {
  return (
    <div className="page-container about-page animate-fadeIn"> {/* Tambah animasi */}
      <h1>
        <span role="img" aria-label="about-icon" style={{ marginRight: '15px', filter: 'hue-rotate(220deg)' }}>✨</span>
        Tentang TokenLocal DApp
      </h1>
      <p className="about-subtitle">
        Menjelajahi Masa Depan Desentralisasi, Satu Blok Sekaligus.
      </p>

      <section className="about-section card-style"> {/* Beri gaya kartu */}
        <h2><span className="section-icon">🎯</span>Visi & Misi Proyek</h2>
        <p>
          TokenLocal DApp lahir dari semangat eksplorasi dan edukasi di dunia Web3. Kami bertujuan memberdayakan developer dan peminat blockchain dengan menyediakan platform interaktif, aman, dan mudah diakses untuk belajar dan bereksperimen dengan teknologi smart contract ERC-20 di lingkungan lokal.
        </p>
        <p>
          Misi kami adalah mendemokratisasi pengetahuan Web3 melalui praktik langsung, memungkinkan siapa saja untuk memahami mekanisme dasar aplikasi terdesentralisasi (dApp) – mulai dari interaksi dompet hingga eksekusi transaksi on-chain – tanpa hambatan biaya atau kompleksitas jaringan publik.
        </p>
      </section>

      <section className="about-section card-style team-section">
        <h2><span className="section-icon">👥</span>Tim Inti (Placeholder)</h2>
        <p>Dibangun oleh kolaborasi individu yang bersemangat tentang potensi teknologi terdesentralisasi.</p>
        <div className="team-members">
          <div className="team-member">
            <div className="member-avatar" style={{ background: 'linear-gradient(135deg, #a656f7, #7b61ff)' }}>🧙‍♂️</div>
            <div className="member-name">Solidity Sorcerer</div>
            <div className="member-role">Smart Contract Architect</div>
            <div className="member-social">
              <a href="#linkedin" onClick={(e) => e.preventDefault()}>LinkedIn</a> | <a href="#github" onClick={(e) => e.preventDefault()}>GitHub</a>
            </div>
          </div>
          <div className="team-member">
            <div className="member-avatar" style={{ background: 'linear-gradient(135deg, #c74cfc, #a656f7)' }}>✨</div>
            <div className="member-name">React Ranger</div>
            <div className="member-role">Frontend Specialist</div>
             <div className="member-social">
              <a href="#linkedin" onClick={(e) => e.preventDefault()}>LinkedIn</a> | <a href="#github" onClick={(e) => e.preventDefault()}>GitHub</a>
            </div>
          </div>
          <div className="team-member">
            <div className="member-avatar" style={{ background: 'linear-gradient(135deg, #7b61ff, #50e3c2)' }}>🎨</div>
            <div className="member-name">CSS Conjurer</div>
            <div className="member-role">UI/UX Alchemist</div>
             <div className="member-social">
              <a href="#linkedin" onClick={(e) => e.preventDefault()}>LinkedIn</a> | <a href="#github" onClick={(e) => e.preventDefault()}>GitHub</a>
            </div>
          </div>
        </div>
      </section>

       <section className="about-section card-style">
          <h2><span className="section-icon">💡</span>Filosofi Kami</h2>
          <p>Kami menganut prinsip **open-source** dan **edukasi**. Kode proyek ini terbuka untuk dipelajari, dimodifikasi, dan dikembangkan bersama. Kami percaya kolaborasi adalah kunci inovasi di ruang Web3.</p>
          <p>Fokus utama adalah menyediakan alat bantu belajar yang praktis dan relevan, bukan produk finansial. Eksperimen dan eksplorasi sangat dianjurkan!</p>
       </section>

      <section className="about-section card-style">
        <h2><span className="section-icon">🛠️</span>Teknologi Kunci</h2>
        <p>DApp ini dibangun di atas fondasi teknologi Web3 yang solid dan modern:</p>
        <ul className="tech-list">
          <li><span className="tech-icon">📜</span> <strong>Solidity & OpenZeppelin:</strong> Untuk smart contract ERC-20 yang aman dan standar industri.</li>
          <li><span className="tech-icon">🧱</span> <strong>Hardhat:</strong> Lingkungan pengembangan end-to-end untuk Ethereum, termasuk node lokal super cepat.</li>
          <li><span className="tech-icon">⚛️</span> <strong>React.js:</strong> Membangun antarmuka pengguna yang dinamis, responsif, dan kaya fitur.</li>
          <li><span className="tech-icon" style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>ethers.js</span> <strong>Ethers.js:</strong> Pustaka klien Ethereum yang kuat dan intuitif untuk interaksi frontend dengan blockchain.</li>
          <li><span className="tech-icon">🦊</span> <strong>MetaMask:</strong> Integrasi dompet browser yang mulus dan aman bagi pengguna.</li>
          <li><span className="tech-icon">🎨</span> <strong>CSS Modern:</strong> Styling canggih dengan Variabel CSS, Flexbox, Grid, dan animasi halus untuk pengalaman visual terbaik.</li>
        </ul>
      </section>

       <section className="about-section card-style">
          <h2><span className="section-icon">🗺️</span>Peta Jalan (Roadmap - Placeholder)</h2>
          <p>Kami terus berupaya meningkatkan platform ini. Berikut beberapa rencana pengembangan ke depan:</p>
          <ul className="roadmap-list">
              <li className="roadmap-item done"><span>Q1 2025</span> Implementasi Dasar ERC-20 & DApp</li>
              <li className="roadmap-item current"><span>Q2 2025</span> Peningkatan UI/UX, Halaman Docs & About</li>
              <li className="roadmap-item"><span>Q3 2025</span> Fitur Staking TokenLocal (Eksperimental)</li>
              <li className="roadmap-item"><span>Q4 2025</span> Modul Governance Sederhana (Voting)</li>
              <li className="roadmap-item"><span>Future</span> Integrasi Lanjutan & Komunitas</li>
          </ul>
       </section>

      <section className="about-section card-style">
        <h2><span className="section-icon">🔗</span>Bergabunglah Dengan Komunitas</h2>
        <p>Mari terhubung, berdiskusi, dan membangun bersama! Temukan kami di:</p>
        <div className="hero-links-container">
          <a href="#github" className="hero-link" onClick={(e) => e.preventDefault()}>
             <span className="link-icon">📁</span> GitHub Repositori
          </a>
          <a href="#discord" className="hero-link" onClick={(e) => e.preventDefault()}>
             <span className="link-icon">💬</span> Server Discord
          </a>
          <a href="#twitter" className="hero-link" onClick={(e) => e.preventDefault()}>
             <span className="link-icon">🐦</span> Ikuti di Twitter
          </a>
        </div>
      </section>
    </div>
  );
}

export default About; // Jangan lupa export!

