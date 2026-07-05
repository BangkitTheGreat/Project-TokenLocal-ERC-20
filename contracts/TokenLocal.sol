// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21; // Sesuaikan versi jika perlu

// Import ERC20 dan Ownable
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Warisi ERC20 dan Ownable
contract TokenLocal is ERC20, Ownable {

    // Constructor: Menerima nama, simbol, dan pasokan awal
    constructor(
        string memory _name,        // Nama token (misal: "Token Local")
        string memory _symbol,       // Simbol token (misal: "TKL")
        uint256 _initialSupply   // Jumlah token awal (sudah termasuk desimal, misal: 1000 * 10**18)
    )
        ERC20(_name, _symbol)     // Panggil constructor ERC20
        Ownable(msg.sender)       // Panggil constructor Ownable, set deployer sebagai owner awal
    {
        // Mint pasokan awal ke alamat deployer (yang juga menjadi owner)
        _mint(msg.sender, _initialSupply);
    }

    // Fungsi Mint: Hanya bisa dipanggil oleh owner
    // Gunakan fungsi _mint internal dari OpenZeppelin ERC20
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // Fungsi standar ERC20 lainnya (transfer, approve, balanceOf, totalSupply, decimals, name, symbol)
    // sudah otomatis tersedia karena kita mewarisi dari ERC20 OpenZeppelin.
    // decimals() defaultnya adalah 18.

    // Konstanta TOKEN_NAME dan TOKEN_SYMBOL dihapus karena sekarang menggunakan
    // fungsi name() dan symbol() standar dari ERC20 yang diinisialisasi di constructor.
}