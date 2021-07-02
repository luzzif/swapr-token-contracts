pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title SWPR
 * @dev SWPR token contract
 * @author Federico Luzzi - <fedeluzzi00@gmail.com>
 * SPDX-License-Identifier: GPL-3.0
 */
contract SWPR is ERC20 {
    constructor(address _dxDaoAddress) public ERC20("Swapr", "SWPR") {
        _mint(_dxDaoAddress, 100000000 ether);
    }
}
