pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

error ZeroAddressInput();
error InconsistentArrayLengths();

/**
 * @title SWPRDistributor
 * @dev SWPRDistributor contract
 * @author Federico Luzzi - <fedeluzzi00@gmail.com>
 * SPDX-License-Identifier: GPL-3.0
 */
contract SWPRDistributor is Ownable {
    using SafeERC20 for IERC20;

    address public swprToken;

    constructor(address _swprToken) {
        if (_swprToken == address(0)) revert ZeroAddressInput();
        swprToken = _swprToken;
    }

    function distribute(
        uint256 _totalAmount,
        address[] calldata _addresses,
        uint256[] calldata _amounts
    ) external onlyOwner {
        if (_addresses.length != _amounts.length)
            revert InconsistentArrayLengths();
        IERC20(swprToken).safeTransferFrom(
            msg.sender,
            address(this),
            _totalAmount
        );
        for (uint256 _i; _i < _addresses.length; _i++) {
            IERC20(swprToken).safeTransfer(_addresses[_i], _amounts[_i]);
        }
    }

    function recover() external {
        IERC20(swprToken).safeTransfer(
            owner(),
            IERC20(swprToken).balanceOf(address(this))
        );
    }
}
