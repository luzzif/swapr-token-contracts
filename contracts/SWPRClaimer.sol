pragma solidity ^0.8.4;

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
 *   SC03: The user already claimed their share in the past.
 *   SC04: Merkle proof verification failed when claiming.
 */
contract SWPRClaimer {
    using SafeERC20 for IERC20;

    address public swprToken;
    bytes32 public merkleRoot;
    mapping(address => bool) public claimed;

    constructor(address _swprToken, bytes32 _merkleRoot) {
        require(_swprToken != address(0), "SC01");
        require(_merkleRoot != bytes32(""), "SC02");
        swprToken = _swprToken;
        merkleRoot = _merkleRoot;
    }

    function claim(uint256 _amount, bytes32[] memory _proof) external {
        require(!claimed[msg.sender], "SC03");
        bytes32 _leaf = keccak256(abi.encodePacked(msg.sender, _amount));
        require(MerkleProof.verify(_proof, merkleRoot, _leaf), "SC04");
        claimed[msg.sender] = true;
        IERC20(swprToken).safeTransfer(msg.sender, _amount);
    }
}
