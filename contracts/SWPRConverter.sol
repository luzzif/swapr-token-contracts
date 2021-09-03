pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./SWPR.sol";

error ZeroAddressInput();
error InconsistentArrayLengths();
error NothingToConvert();

/**
 * @title SWPRConverter
 * @dev SWPRConverter contract
 * Smart contracts to convert SWPRTokenA to SWPRTokenB using a 1:1 ratio.
 * Convertion steps:
 * 1.- The user needs to approve all his SWPRTokenA to the SWPRConverter contract.
 * 2.- The SWPRConverter contract is called to execute the convertion of tokens.
      SWPRTokenA is burned and the same amount in SWPRTokenB is sent to the user.
 * @author Augusto Lemble - <augustolemble@pm.me>
 * SPDX-License-Identifier: GPL-3.0
 */
contract SWPRConverter is Ownable, ReentrancyGuard {
    address public swprTokenA;
    address public swprTokenB;

    event Convert(address account, uint256 amount);

    constructor(address _swprTokenA, address _swprTokenB) {
        if (_swprTokenA == address(0)) revert ZeroAddressInput();
        if (_swprTokenB == address(0)) revert ZeroAddressInput();
        swprTokenA = _swprTokenA;
        swprTokenB = _swprTokenB;
    }

    // Burn allowed SWPRTokenA to this SWPRConverter and transfer SWPRTokenB to the account
    function convert(address account) external nonReentrant {
        // Check that the account has SWPRTokenA balance
        uint256 swprTokenABalance = SWPR(swprTokenA).balanceOf(account);
        if (swprTokenABalance == 0) revert NothingToConvert();

        // Burn SWPRTokenA
        SWPR(swprTokenA).burnFrom(account, swprTokenABalance);

        // Transfer the SWPRTokenB to the account
        SWPR(swprTokenB).transfer(account, swprTokenABalance);

        emit Convert(account, swprTokenABalance);
    }

    // Transfer the SWPRTokenB balance from the SWPRConverter to the owner
    function recover() external onlyOwner {
        SWPR(swprTokenB).transfer(
            owner(),
            SWPR(swprTokenB).balanceOf(address(this))
        );
    }
}
