pragma solidity 0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OptionFeeDistributor {
    address public constant address1 =
        0x1a8042DeD3d7B02929a1BEC785a5325B2E89EAd8;
    address public constant address2 =
        0xa876E99E295f34EF23180B5d0e8eE44FAfbCe9b4;

    function distribute(IERC20 token, uint256 amount) external {
        require(token.transferFrom(msg.sender, address(this), amount));

        uint256 half = amount / 2;
        uint256 otherHalf = amount - half;

        require(token.transfer(address1, half));
        require(token.transfer(address2, otherHalf));
    }
}
