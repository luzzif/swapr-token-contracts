pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

error ZeroAddressInput();
error InvalidMerkleRoot();
error PastVestingStart();
error InvalidVestingDuration();
error InvalidCliff();
error InvalidReleaseTimeLimit();
error ReleaseTimeLimitReached();
error InvalidMerkleProof();
error ReleaseTimeLimitNotYetReached();
error NothingToRelease();

/**
 * @title SWPRVestedClaimer
 * @dev SWPRVestedClaimer contract
 * @author Federico Luzzi - <fedeluzzi00@gmail.com>
 * SPDX-License-Identifier: GPL-3.0
 */
contract SWPRVestedClaimer is Ownable {
    using SafeERC20 for IERC20;

    address public swprToken;
    bytes32 public merkleRoot;
    uint256 public releaseTimeLimit;
    uint256 public start;
    uint256 public duration;
    uint256 public cliff;
    mapping(address => uint256) public released;

    constructor(
        address _swprToken,
        bytes32 _merkleRoot,
        uint256 _releaseTimeLimit,
        uint256 _start,
        uint256 _duration,
        uint256 _cliff
    ) {
        if (_swprToken == address(0)) revert ZeroAddressInput();
        if (_merkleRoot == bytes32("")) revert InvalidMerkleRoot();
        if (_start <= block.timestamp) revert PastVestingStart();
        if (_duration == 0) revert InvalidVestingDuration();
        if (_cliff <= _start || _cliff >= _start + _duration)
            revert InvalidCliff();
        if (_releaseTimeLimit <= _start + _duration)
            revert InvalidReleaseTimeLimit();
        swprToken = _swprToken;
        merkleRoot = _merkleRoot;
        releaseTimeLimit = _releaseTimeLimit;
        start = _start;
        duration = _duration;
        cliff = _cliff;
    }

    function release(uint256 _amount, bytes32[] memory _proof) external {
        if (block.timestamp > releaseTimeLimit)
            revert ReleaseTimeLimitReached();
        bytes32 _leaf = keccak256(abi.encodePacked(msg.sender, _amount));
        if (!MerkleProof.verify(_proof, merkleRoot, _leaf))
            revert InvalidMerkleProof();
        uint256 _halfAmount = _amount / 2; // half of the amount is locked, half is vested
        uint256 _localReleased = released[msg.sender]; // gas optimization
        // if this is the first time the user calls release, immediately give them the
        // unlocked amount (half of the total one)
        bool _unlockedAmountClaimed = _localReleased >= _halfAmount;
        uint256 _releasedAmount = _unlockedAmountClaimed ? 0 : _halfAmount;
        if (block.timestamp > cliff) {
            uint256 _localStart = start; // gas optimization
            uint256 _localDuration = duration; // gas optimization
            // gets the amount previously released, excluding the
            // unlocked amount
            uint256 _previouslyReleasedAmount = _unlockedAmountClaimed
                ? _localReleased - _halfAmount
                : 0;
            // caps the current timestamp to the end of the vesting period, to avoid
            // calculation errors
            uint256 _endingTimestamp = _localStart + _localDuration;
            uint256 _correctCurrentTimestamp = block.timestamp >
                _endingTimestamp
                ? _endingTimestamp
                : block.timestamp;
            _releasedAmount +=
                ((_halfAmount * (_correctCurrentTimestamp - _localStart)) /
                    _localDuration) -
                _previouslyReleasedAmount;
        }
        if (_releasedAmount == 0) revert NothingToRelease();
        released[msg.sender] += _releasedAmount;
        IERC20(swprToken).safeTransfer(msg.sender, _releasedAmount);
    }

    function recover() external {
        if (block.timestamp < releaseTimeLimit)
            revert ReleaseTimeLimitNotYetReached();
        IERC20(swprToken).safeTransfer(
            owner(),
            IERC20(swprToken).balanceOf(address(this))
        );
    }
}
