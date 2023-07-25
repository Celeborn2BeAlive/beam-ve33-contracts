// SPDX-License-Identifier: MIT
//pragma solidity 0.8.13;

/*
    This contract handles the fee distribution from UniV3 to gauges.
*/

import './interfaces/IPermissionsRegistry.sol';
import './interfaces/IUniV3Factory.sol';
import './interfaces/IUniswapV3Pool.sol';
import './interfaces/IVoter.sol';
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IGauge{
    function feeVault() external view returns (address);
}

contract ProtocolFeeHandler {
    using SafeERC20 for IERC20;

    IPermissionsRegistry public permissionRegistry;
    IUniV3Factory public uniFactory;
    IVoter public voter;

    constructor(address _permissionRegistry, address _uniFactory, address _voter) public {
        permissionRegistry = IPermissionsRegistry(_permissionRegistry);
        uniFactory = IUniV3Factory(_uniFactory);
        voter = IVoter(_voter);
    }    

    modifier onlyGaugeOrAdmin {
        require(voter.isGauge(msg.sender) || permissionRegistry.hasRole("CL_FEES_VAULT_ADMIN",msg.sender), "ERR: NOT_GAUGE");
        _;
    }

    modifier onlyAdmin {
        require(permissionRegistry.hasRole("CL_FEES_VAULT_ADMIN",msg.sender), 'ERR: GAUGE_ADMIN');
        _;
    }

    /// @notice Set a new PermissionRegistry
    function setPermissionsRegistry(address _permissionRegistry) external onlyAdmin {
        permissionRegistry = IPermissionsRegistry(_permissionRegistry);
    }

    function changeUniFactory(address _newUniFactory) external onlyAdmin {
        uniFactory = IUniV3Factory(_newUniFactory);
    }

    function passPermissionsBack(address _receiver) external onlyAdmin {
        uniFactory.setOwner(_receiver);
    }

    function changeProtocolFees(address _pool, uint8 _one, uint8 _two) external onlyAdmin {
        IUniswapV3Pool pool = IUniswapV3Pool(_pool);
        pool.setFeeProtocol(_one, _two);
    }

    function collectFee(address _pool) external onlyGaugeOrAdmin {
        IUniswapV3Pool pool = IUniswapV3Pool(_pool);
        address _token0 = pool.token0();
        address _token1 = pool.token1();
        address _feeVault = IGauge(voter.gauges(_pool)).feeVault();
        (uint128 fee0, uint128 fee1) = pool.protocolFees();
        pool.collectProtocol(address(this), type(uint128).max, type(uint128).max);
        if(fee0 > 0){
            IERC20(_token0).safeTransfer(_feeVault, fee0);
        }
        if(fee1 > 0){
            IERC20(_token1).safeTransfer(_feeVault, fee1);
        }
    }


}