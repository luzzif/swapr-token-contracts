pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";

error InvalidGatewayAddress();
error ShouldRegisterGateway();

interface Gateway {
    function registerTokenToL2(
        address _l2Address,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        uint256 _maxSubmissionCost,
        address _creditBackAddress
    ) external payable returns (uint256);
}

/**
 * @title SWPR
 * @dev SWPR token contract
 * @author Federico Luzzi - <fedeluzzi00@gmail.com>
 * SPDX-License-Identifier: GPL-3.0
 */
contract SWPR is ERC20BurnableUpgradeable {
    address public gateway;
    bool public shouldRegisterGateway;

    function initialize(address _ownerAddress, address _gatewayAddress)
        external
        initializer
    {
        __ERC20_init("Swapr", "SWPR");
        if (_gatewayAddress == address(0)) revert InvalidGatewayAddress();
        gateway = _gatewayAddress;
        _mint(_ownerAddress, 100000000 ether);
    }

    function isArbitrumEnabled() external view returns (uint8) {
        if (!shouldRegisterGateway) revert ShouldRegisterGateway();
        return 177;
    }

    function registerTokenOnL2(
        address _l2CustomTokenAddress,
        uint256 _maxSubmissionCost,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        address _creditBackAddress
    ) public {
        bool _previous = shouldRegisterGateway;
        shouldRegisterGateway = true;
        Gateway(gateway).registerTokenToL2(
            _l2CustomTokenAddress,
            _maxGas,
            _gasPriceBid,
            _maxSubmissionCost,
            _creditBackAddress
        );
        shouldRegisterGateway = _previous;
    }
}
