// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract StakingContract is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error PeriodeMasihAktif(uint256 periodFinish);
    error DurasiTidakValid(uint256 duration);
    error JumlahNol();
    error RateNol(uint256 amount, uint256 duration);
    error EmisiMelebihiBatas(uint256 diminta, uint256 sisaKapasitas);
    error PendanaanTidakUtuh(uint256 diminta, uint256 diterima);
    error TokenTidakValid(address token);
    error StakeTidakCukup(uint256 diminta, uint256 tersedia);
    error MenarikDanaTerikat(uint256 diminta, uint256 saldoBebas);
    error CadanganTidakCukup(uint256 diminta, uint256 cadangan);
    error SaldoTidakCukup(uint256 diminta, uint256 tersedia);
    error TidakDapatMelepasKepemilikan();

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;

    uint256 public constant MAX_DURATION = 365 days;
    // Batas emisi seumur hidup. rewardPerTokenStored tumbuh paling cepat saat
    // totalStaked = 1 wei, yaitu sebesar totalScheduled * 1e18. Batas ini menjaga
    // akumulator tetap muat di uint256, sehingga input ekstrem gagal saat
    // konfigurasi, bukan saat pengguna menarik dana.
    uint256 public constant MAX_TOTAL_SCHEDULED = type(uint256).max / 1e18;

    uint256 public totalStaked;
    mapping(address => uint256) public stakes;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    uint256 public rewardRate;
    uint256 public periodFinish;
    uint256 public lastRewardTime;
    uint256 public rewardPerTokenStored;
    uint256 public totalScheduled;

    /// @notice Anggaran reward yang belum dibayar. Bersama totalStaked, inilah
    ///         dana terikat yang tidak boleh disentuh owner.
    ///         Invariant: saldo kontrak >= totalStaked + rewardReserve
    uint256 public rewardReserve;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardPeriodFunded(uint256 amount, uint256 scheduled, uint256 rate, uint256 periodFinish);
    event ReserveReleased(uint256 amount);
    event ExcessWithdrawn(address indexed to, uint256 amount);

    constructor(address _stakingTokenAddress) Ownable(msg.sender) {
        if (_stakingTokenAddress == address(0) || _stakingTokenAddress.code.length == 0) {
            revert TokenTidakValid(_stakingTokenAddress);
        }
        stakingToken = IERC20(_stakingTokenAddress);
        rewardToken = IERC20(_stakingTokenAddress);
    }

    /// @dev Melepas kepemilikan akan membekukan kontrak secara permanen: tidak
    ///      ada lagi yang dapat mendanai periode reward maupun menarik surplus.
    ///      Pergantian owner tetap tersedia lewat alur dua langkah Ownable2Step.
    function renounceOwnership() public pure override {
        revert TidakDapatMelepasKepemilikan();
    }

    modifier updateReward(address _account) {
        uint256 applicable = lastTimeRewardApplicable();

        // Emisi yang berjalan tanpa satu pun staker tidak menjadi hak siapa pun,
        // jadi anggarannya dilepas kembali menjadi saldo bebas. Wajib memakai
        // applicable yang sama dengan akrual: memakai block.timestamp mentah
        // akan melepas waktu setelah periodFinish yang emisinya tidak pernah
        // dijadwalkan, sehingga cadangan jadi lebih kecil dari kewajiban.
        if (applicable > lastRewardTime && totalStaked == 0) {
            uint256 takBerhak = Math.min((applicable - lastRewardTime) * rewardRate, rewardReserve);
            if (takBerhak > 0) {
                rewardReserve -= takBerhak;
                emit ReserveReleased(takBerhak);
            }
        }

        rewardPerTokenStored = rewardPerToken();
        // Selalu ter-clamp ke periodFinish, sehingga lastRewardTime tidak pernah
        // melewatinya dan pengurangan di rewardPerToken() tidak dapat underflow.
        lastRewardTime = applicable;
        if (_account != address(0)) {
            rewards[_account] = earned(_account);
            userRewardPerTokenPaid[_account] = rewardPerTokenStored;
        }
        _;
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        uint256 applicable = lastTimeRewardApplicable();
        if (totalStaked == 0 || applicable <= lastRewardTime) {
            return rewardPerTokenStored;
        }
        uint256 timePassed = applicable - lastRewardTime;
        return rewardPerTokenStored + Math.mulDiv(timePassed * rewardRate, 1e18, totalStaked);
    }

    function earned(address _account) public view returns (uint256) {
        uint256 delta = rewardPerToken() - userRewardPerTokenPaid[_account];
        return Math.mulDiv(stakes[_account], delta, 1e18) + rewards[_account];
    }

    /// @notice Saldo kontrak di luar pokok stake dan anggaran reward.
    /// @dev Saturating agar view ini tidak pernah revert seandainya pembukuan
    ///      sempat melebihi saldo. Pembulatan selalu dicadangkan secara
    ///      konservatif, jadi nilainya tidak pernah melebih-lebihkan.
    function freeBalance() public view returns (uint256) {
        uint256 saldo = rewardToken.balanceOf(address(this));
        uint256 terikat = totalStaked + rewardReserve;
        return saldo > terikat ? saldo - terikat : 0;
    }

    function stake(uint256 _amount) external nonReentrant updateReward(msg.sender) {
        if (_amount == 0) revert JumlahNol();
        totalStaked += _amount;
        stakes[msg.sender] += _amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
        emit Staked(msg.sender, _amount);
    }

    /// @dev Sengaja TIDAK mengklaim reward. Kegagalan pembayaran reward tidak
    ///      boleh ikut menggagalkan penarikan pokok.
    function withdraw(uint256 _amount) external nonReentrant updateReward(msg.sender) {
        if (_amount == 0) revert JumlahNol();
        uint256 saldo = stakes[msg.sender];
        if (_amount > saldo) revert StakeTidakCukup(_amount, saldo);
        totalStaked -= _amount;
        stakes[msg.sender] = saldo - _amount;
        stakingToken.safeTransfer(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount);
    }

    function claimReward() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward == 0) return;

        if (reward > rewardReserve) revert CadanganTidakCukup(reward, rewardReserve);
        uint256 diLuarPokok = rewardToken.balanceOf(address(this)) - totalStaked;
        if (reward > diLuarPokok) revert SaldoTidakCukup(reward, diLuarPokok);

        rewards[msg.sender] = 0;
        rewardReserve -= reward;
        rewardToken.safeTransfer(msg.sender, reward);
        emit RewardPaid(msg.sender, reward);
    }

    /// @notice Danai dan mulai satu periode reward. Rate ditetapkan dari dana yang
    ///         benar-benar masuk, sehingga emisi tidak pernah melebihi kas.
    function notifyRewardAmount(uint256 _amount, uint256 _duration)
        external
        onlyOwner
        nonReentrant
        updateReward(address(0))
    {
        if (block.timestamp < periodFinish) revert PeriodeMasihAktif(periodFinish);
        if (_duration == 0 || _duration > MAX_DURATION) revert DurasiTidakValid(_duration);
        if (_amount == 0) revert JumlahNol();

        uint256 rate = _amount / _duration;
        if (rate == 0) revert RateNol(_amount, _duration);

        // Sisa pembagian tidak dijanjikan sebagai reward; ia menjadi saldo bebas.
        uint256 terjadwal = rate * _duration;
        uint256 sisaKapasitas = MAX_TOTAL_SCHEDULED - totalScheduled;
        if (terjadwal > sisaKapasitas) revert EmisiMelebihiBatas(terjadwal, sisaKapasitas);

        uint256 sebelum = rewardToken.balanceOf(address(this));
        rewardToken.safeTransferFrom(msg.sender, address(this), _amount);
        uint256 diterima = rewardToken.balanceOf(address(this)) - sebelum;
        if (diterima < _amount) revert PendanaanTidakUtuh(_amount, diterima);

        totalScheduled += terjadwal;
        rewardReserve += terjadwal;
        rewardRate = rate;
        lastRewardTime = block.timestamp;
        periodFinish = block.timestamp + _duration;

        emit RewardPeriodFunded(_amount, terjadwal, rate, periodFinish);
    }

    /// @dev updateReward dijalankan lebih dulu agar emisi tanpa staker sudah
    ///      dilepas sebelum saldo bebas dihitung.
    function withdrawExcessReward(uint256 _amount)
        external
        onlyOwner
        nonReentrant
        updateReward(address(0))
    {
        uint256 bebas = freeBalance();
        if (_amount > bebas) revert MenarikDanaTerikat(_amount, bebas);
        rewardToken.safeTransfer(msg.sender, _amount);
        emit ExcessWithdrawn(msg.sender, _amount);
    }
}
