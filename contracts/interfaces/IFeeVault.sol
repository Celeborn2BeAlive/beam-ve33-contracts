// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IFeeVault {

    function claimFees() external returns(uint256 gauge0, uint256 gauge1);
    function setTreasury(address treasury) external;
    function setTreasuryShare(uint256 share) external;
    function setGauge(address _gauge) external;
    function allow(address caller, bool status) external;
    function setPool(address _pool) external;
    function recoverERC20(address _tokenAddress, uint256 _tokenAmount) external;

    error AddressZero();
    error NotAllowed();
    error TreasuryShareTooHigh();

    event Fees(uint256 totAmount0, uint256 totAmount1, uint256 treasury_0, uint256 treasury_1, address indexed pool, uint timestamp);
    event SetGauge(address indexed oldgauge, address indexed newgauge);
    event SetPool(address indexed oldPool, address indexed newPool);
    event SetTreasury(address indexed treasury);
    event SetTreasuryShare(uint256 indexed share);
    event Allow(address indexed caller, bool status);
    event WithdrawERC20(address indexed token, uint256 amount);
}
