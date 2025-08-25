// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IEmissionToken is IERC20 {
    function mint(address, uint) external;
    function minter() external returns (address);
    function setMinter(address) external;
}
