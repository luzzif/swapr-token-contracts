pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

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
    using SafeERC20 for IERC20;

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
        uint256 swprTokenAAllowance = IERC20(swprTokenA).allowance(account, address(this));
        uint256 swprTokenABalance = IERC20(swprTokenA).balanceOf(account);
        
        // Check that the SWPRTokenA allowance is enough to do the convertion
        require(
          swprTokenAAllowance > 0,
          "SWPRConvertor: SWPRTokenA allowance is 0"
          );
        require(
          swprTokenABalance > 0,
          "SWPRConvertor: SWPRTokenA balance is 0"
        );
        require(
          swprTokenAAllowance >= swprTokenABalance,
          "SWPRConvertor: SWPRTokenA allowance is not enough"
        );
        
        // Burn SWPRTokenA by sending them to address(1)
        IERC20(swprTokenA).safeTransferFrom(
            account,
            address(1),
            swprTokenABalance
        );
        
        // Transfer the SWPRTokenB to the account
        IERC20(swprTokenB).safeTransfer(account, swprTokenABalance);
    }

    // Transfer the SWPRTokenB balance from the SWPRConvertor to the owner
    function recover() external {
        IERC20(swprTokenB).safeTransfer(
            owner(),
            IERC20(swprTokenB).balanceOf(address(this))
        );
    }
}
