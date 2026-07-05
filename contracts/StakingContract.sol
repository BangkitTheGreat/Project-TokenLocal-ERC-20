// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21; // Pastikan cocok atau kompatibel dengan versi di hardhat.config.ts (0.8.24 OK)

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// Hapus import SafeMath: import "@openzeppelin/contracts/utils/math/SafeMath.sol";
/* Manual reentrancy guard implemented below. */

contract StakingContract is Ownable {
    // Hapus using SafeMath: using SafeMath for uint256;

    // Manual reentrancy guard
    bool private _locked;
    modifier nonReentrant() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    IERC20 public immutable stakingToken; // Token yang di-stake (TKL)
    IERC20 public immutable rewardToken;  // Token reward (kita gunakan TKL juga)

    uint256 public totalStaked;
    mapping(address => uint256) public stakes; // Jumlah stake per user
    mapping(address => uint256) public lastUpdateTime; // Waktu terakhir user update reward
    mapping(address => uint256) public userRewardPerTokenPaid; // Reward per token yg sudah dibayar ke user
    uint256 public rewardRate; // Jumlah reward TKL per detik untuk SEMUA staker (dalam WEI)
    uint256 public lastRewardTime; // Waktu terakhir reward dihitung secara global
    uint256 public rewardPerTokenStored; // Akumulasi reward per token secara global

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardRateUpdated(uint256 newRate);

    constructor(address _stakingTokenAddress) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingTokenAddress);
        rewardToken = IERC20(_stakingTokenAddress);
        lastRewardTime = block.timestamp;
        // Contoh reward rate: 0.1 TKL per detik (100000000000000000 wei per detik)
        rewardRate = 1 * (10**17);
    }

    modifier updateReward(address _account) {
        rewardPerTokenStored = rewardPerToken();
        lastRewardTime = block.timestamp;
        if (_account != address(0)) {
             rewards[_account] = earned(_account); // Hitung & simpan reward tertunda
             userRewardPerTokenPaid[_account] = rewardPerTokenStored;
             lastUpdateTime[_account] = block.timestamp;
        }
        _;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        uint256 timePassed = block.timestamp - lastRewardTime; // Gunakan operator standar
        // Gunakan operator standar, Solidity 0.8+ sudah aman dari overflow/underflow
        return rewardPerTokenStored + (timePassed * rewardRate * 1e18) / totalStaked;
    }

    // Mapping untuk menyimpan reward tertunda (perlu ditambahkan)
    mapping(address => uint256) public rewards;

    function earned(address _account) public view returns (uint256) {
        uint256 currentRewardPerToken = rewardPerToken();
        uint256 stakedAmount = stakes[_account];
        // Gunakan operator standar
        return (stakedAmount * (currentRewardPerToken - userRewardPerTokenPaid[_account])) / 1e18 + rewards[_account];
    }

    function stake(uint256 _amount) external nonReentrant updateReward(msg.sender) {
        require(_amount > 0, "Cannot stake 0");
        // Gunakan operator standar
        totalStaked = totalStaked + _amount;
        stakes[msg.sender] = stakes[msg.sender] + _amount;
        require(stakingToken.transferFrom(msg.sender, address(this), _amount), "transferFrom failed");
        emit Staked(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external nonReentrant updateReward(msg.sender) {
        require(_amount > 0, "Cannot withdraw 0");
        require(stakes[msg.sender] >= _amount, "Withdraw amount exceeds stake");
        // Gunakan operator standar
        totalStaked = totalStaked - _amount;
        stakes[msg.sender] = stakes[msg.sender] - _amount;
        require(stakingToken.transfer(msg.sender, _amount), "transfer failed");
        emit Withdrawn(msg.sender, _amount); 
    }

    function claimReward() external nonReentrant updateReward(msg.sender) {
        uint256 reward = earned(msg.sender); // earned() sudah menghitung reward tertunda
        if (reward > 0) {
            rewards[msg.sender] = 0; // Reset reward tertunda user setelah dihitung
            require(rewardToken.transfer(msg.sender, reward), "reward transfer failed");
            emit RewardPaid(msg.sender, reward);
        }
    }

    function setRewardRate(uint256 _newRate) external onlyOwner updateReward(address(0)) {
        rewardRate = _newRate;
        emit RewardRateUpdated(_newRate);
    }

    function depositRewardTokens(uint256 _amount) external onlyOwner {
        require(rewardToken.transferFrom(msg.sender, address(this), _amount), "Reward deposit failed");
    }

    function withdrawExcessReward(uint256 _amount) external onlyOwner {
         require(rewardToken.transfer(msg.sender, _amount), "Excess reward withdraw failed");
    }
}
