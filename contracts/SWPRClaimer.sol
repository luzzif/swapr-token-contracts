pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

error ZeroAddressInput();
error InvalidMerkleRoot();
error PastClaimTimeLimit();
error ClaimTimeLimitReached();
error AlreadyClaimed();
error InvalidMerkleProof();
error ClaimTimeLimitNotYetReached();

/**
 * @title SWPRClaimer
 * @dev SWPRClaimer contract
 * @author Federico Luzzi - <fedeluzzi00@gmail.com>
 * SPDX-License-Identifier: GPL-3.0
 */
contract SWPRClaimer is Ownable {
    using SafeERC20 for IERC20;

    address public swprToken;
    bytes32 public merkleRoot;
    uint256 public claimTimeLimit;
    mapping(address => bool) public claimed;

    constructor(
        address _swprToken,
        bytes32 _merkleRoot,
        uint256 _claimTimeLimit
    ) {
        if (_swprToken == address(0)) revert ZeroAddressInput();
        if (_merkleRoot == bytes32("")) revert InvalidMerkleRoot();
        if (_claimTimeLimit <= block.timestamp) revert PastClaimTimeLimit();
        swprToken = _swprToken;
        merkleRoot = _merkleRoot;
        claimTimeLimit = _claimTimeLimit;
    }

    function claim(uint256 _amount, bytes32[] memory _proof) external {
        if (block.timestamp > claimTimeLimit) revert ClaimTimeLimitReached();
        if (claimed[msg.sender]) revert AlreadyClaimed();
        bytes32 _leaf = keccak256(abi.encodePacked(msg.sender, _amount));
        if (!MerkleProof.verify(_proof, merkleRoot, _leaf))
            revert InvalidMerkleProof();
        claimed[msg.sender] = true;
        IERC20(swprToken).safeTransfer(msg.sender, _amount);
    }

    function recover() external {
        if (block.timestamp < claimTimeLimit)
            revert ClaimTimeLimitNotYetReached();
        IERC20(swprToken).safeTransfer(
            owner(),
            IERC20(swprToken).balanceOf(address(this))
        );
    }
}
