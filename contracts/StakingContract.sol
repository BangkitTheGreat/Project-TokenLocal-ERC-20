// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract StakingContract is Ownable {
    error PeriodeMasihAktif(uint256 periodFinish);
    error DurasiTidakValid(uint256 duration);
    error JumlahNol();
    error RateNol(uint256 amount, uint256 duration);
    error EmisiMelebihiBatas(uint256 diminta, uint256 sisaKapasitas);
    error PendanaanTidakUtuh(uint256 diminta, uint256 diterima);
    error TokenTidakValid(address token);
    error StakeTidakCukup(uint256 diminta, uint256 tersedia);
    error MenarikPokokStake(uint256 diminta, uint256 saldoBebas);

    // ponytail: guard manual dipertahankan; ditukar ke OZ ReentrancyGuard di sapuan hardening.
    bool private _locked;
    modifier nonReentrant() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

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

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardPeriodFunded(uint256 amount, uint256 scheduled, uint256 rate, uint256 periodFinish);
    event ExcessWithdrawn(address indexed to, uint256 amount);

    constructor(address _stakingTokenAddress) Ownable(msg.sender) {
        if (_stakingTokenAddress == address(0) || _stakingTokenAddress.code.length == 0) {
            revert TokenTidakValid(_stakingTokenAddress);
        }
        stakingToken = IERC20(_stakingTokenAddress);
        rewardToken = IERC20(_stakingTokenAddress);
    }

    modifier updateReward(address _account) {
        rewardPerTokenStored = rewardPerToken();
        // Selalu ter-clamp ke periodFinish, sehingga lastRewardTime tidak pernah
        // melewatinya dan pengurangan di rewardPerToken() tidak dapat underflow.
        lastRewardTime = lastTimeRewardApplicable();
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

    /// @notice Saldo kontrak di luar pokok stake milik pengguna.
    function freeBalance() public view returns (uint256) {
        return rewardToken.balanceOf(address(this)) - totalStaked;
    }

    function stake(uint256 _amount) external nonReentrant updateReward(msg.sender) {
        if (_amount == 0) revert JumlahNol();
        totalStaked += _amount;
        stakes[msg.sender] += _amount;
        require(stakingToken.transferFrom(msg.sender, address(this), _amount), "transferFrom failed");
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
        require(stakingToken.transfer(msg.sender, _amount), "transfer failed");
        emit Withdrawn(msg.sender, _amount);
    }

    function claimReward() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            require(rewardToken.transfer(msg.sender, reward), "reward transfer failed");
            emit RewardPaid(msg.sender, reward);
        }
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
        require(rewardToken.transferFrom(msg.sender, address(this), _amount), "funding failed");
        uint256 diterima = rewardToken.balanceOf(address(this)) - sebelum;
        if (diterima < _amount) revert PendanaanTidakUtuh(_amount, diterima);

        totalScheduled += terjadwal;
        rewardRate = rate;
        lastRewardTime = block.timestamp;
        periodFinish = block.timestamp + _duration;

        emit RewardPeriodFunded(_amount, terjadwal, rate, periodFinish);
    }

    function withdrawExcessReward(uint256 _amount)
        external
        onlyOwner
        nonReentrant
        updateReward(address(0))
    {
        uint256 bebas = freeBalance();
        if (_amount > bebas) revert MenarikPokokStake(_amount, bebas);
        require(rewardToken.transfer(msg.sender, _amount), "Excess reward withdraw failed");
        emit ExcessWithdrawn(msg.sender, _amount);
    }
}
