pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SWPR.sol";

error ZeroAddressInput();
error InconsistentArrayLengths();

/**
 * @title SWPRConvertor
 * @dev SWPRConvertor contract
 * Smart contracts to convert SWPRTokenA to SWPRTokenB using a 1:1 ratio.
 * Convertion steps:
 * 1.- The user needs to approve all his SWPRTokenA to the SWPRConvertor contract.
 * 2.- The SWPRConvertor contract is called to execute the convertion of tokens.
      SWPRTokenA is burned and the same amount in SWPRTokenB is sent to the user.
 * @author Augusto Lemble - <augustolemble@pm.me>
 * SPDX-License-Identifier: GPL-3.0
 */
contract SWPRConvertor is Ownable {

    address public swprTokenA;
    address public swprTokenB;

    constructor(address _swprTokenA, address _swprTokenB) {
        if (_swprTokenA == address(0)) revert ZeroAddressInput();
        if (_swprTokenB == address(0)) revert ZeroAddressInput();
        swprTokenA = _swprTokenA;
        swprTokenB = _swprTokenB;
    }

    // Burn allowed SWPRTokenA to this SWPRConvertor and transfer SWPRTokenB to the account
    function convert(address account) external {
        
        // Check that the account has SWPRTokenA balance
        uint256 swprTokenABalance = SWPR(swprTokenA).balanceOf(account);
        require(
          swprTokenABalance > 0,
          "SWPRConvertor: SWPRTokenA balance is 0"
        );

        // Check that the SWPRTokenA allowance is enough to do the convertion
        uint256 swprTokenAAllowance = SWPR(swprTokenA).allowance(account, address(this));
        require(
          swprTokenAAllowance >= swprTokenABalance,
          "SWPRConvertor: SWPRTokenA allowance is not enough"
        );
        
        // Burn SWPRTokenA
        SWPR(swprTokenA).burnFrom(
            account,
            swprTokenABalance
        );
        
        // Transfer the SWPRTokenB to the account
        SWPR(swprTokenB).transfer(account, swprTokenABalance);
    }

    // Transfer the SWPRTokenB balance from the SWPRConvertor to the owner
    function recover() external {
        SWPR(swprTokenB).transfer(
            owner(),
            SWPR(swprTokenB).balanceOf(address(this))
        );
    }
}
