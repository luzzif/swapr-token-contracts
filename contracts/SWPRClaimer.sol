pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SWPRClaimer
 * @dev SWPRClaimer contract
 * @author Federico Luzzi - <fedeluzzi00@gmail.com>
 * SPDX-License-Identifier: GPL-3.0
 *
 * Error messages
 *   SC01: 0-address given as contribution token.
 *   SC02: invalid Merkle root.
 *   SC03: Specified claim time limit is in the past.
 *   SC04: The claim time limit has been reached. Claiming is not available anymore.
 *   SC05: The user already claimed their share in the past.
 *   SC06: Merkle proof verification failed when claiming.
 *   SC07: Claim time limit not yet reached, cannot recover leftover SWPR.
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
        require(_swprToken != address(0), "SC01");
        require(_merkleRoot != bytes32(""), "SC02");
        require(_claimTimeLimit > block.timestamp, "SC03");
        swprToken = _swprToken;
        merkleRoot = _merkleRoot;
        claimTimeLimit = _claimTimeLimit;
    }

    function claim(uint256 _amount, bytes32[] memory _proof) external {
        require(block.timestamp <= claimTimeLimit, "SC04");
        require(!claimed[msg.sender], "SC05");
        bytes32 _leaf = keccak256(abi.encodePacked(msg.sender, _amount));
        require(MerkleProof.verify(_proof, merkleRoot, _leaf), "SC06");
        claimed[msg.sender] = true;
        IERC20(swprToken).safeTransfer(msg.sender, _amount);
    }

    function recover() external {
        require(block.timestamp > claimTimeLimit, "SC07");
        IERC20(swprToken).safeTransfer(
            owner(),
            IERC20(swprToken).balanceOf(address(this))
        );
    }
}
