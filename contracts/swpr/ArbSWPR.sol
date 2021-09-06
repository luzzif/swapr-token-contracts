pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";

error InvalidGatewayAddress();
error ShouldntRegisterGateway();
error GatewayCallerRequired();

interface IArbToken {
    function bridgeMint(address _account, uint256 _amount) external;

    function bridgeBurn(address _account, uint256 _amount) external;

    function l1Address() external view returns (address);
}

/**
 * @title ArbSWPR
 * @dev ArbSWPR token contract runnable on Arbitrum chains
 * @author Federico Luzzi - <fedeluzzi00@gmail.com>
 * SPDX-License-Identifier: GPL-3.0
 */
contract ArbSWPR is ERC20BurnableUpgradeable, IArbToken {
    address public gateway;
    address private innerL1Addres;

    function initialize(address _gatewayAddress) external initializer {
        __ERC20_init("Swapr", "SWPR");
        if (_gatewayAddress == address(0)) revert InvalidGatewayAddress();
        gateway = _gatewayAddress;
    }

    function l1Address() external view override returns (address) {
        return innerL1Addres;
    }

    function bridgeBurn(address _account, uint256 _amount)
        external
        override
        onlyGateway
    {
        _mint(_account, _amount);
    }

    function bridgeMint(address _account, uint256 _amount)
        external
        override
        onlyGateway
    {
        _burn(_account, _amount);
    }

    modifier onlyGateway() {
        if (msg.sender != gateway) revert GatewayCallerRequired();
        _;
    }
}
