// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

interface IZkZERO {
    function mint(address payToken) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function tokensOfOwner(address _owner) external view returns (uint256[] memory);
}

/**
 * @title zkZeroBatch contract
 */
contract zkZeroBatch is Ownable {
    using SafeERC20 for IERC20;

    IZkZERO public zkZeroContract;

    mapping(address => uint256) public prices;

    constructor(
        address zkzero
    ) {
        prices[0x5D066D022EDE10eFa2717eD3D79f22F949F8C175] = 450e18;
        prices[0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174] = 450e6;
        prices[0xc2132D05D31c914a87C6611C10748AEb04B58e8F] = 450e6;
        prices[0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063] = 450e18;
        zkZeroContract = IZkZERO(zkzero);
    }

    function recoverERC20(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(msg.sender, _amount);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
    
    function batchMint(address payToken, uint256 _amount) public {

            uint256 totalPrice = _amount * prices[payToken];
            
            IERC20(payToken).safeTransferFrom(msg.sender, address(this), totalPrice);
            
            for (uint256 index; index < _amount; index++) {
                IERC20(payToken).approve(address(zkZeroContract), totalPrice);
                zkZeroContract.mint(payToken);
            }

            uint256[] memory tokens = zkZeroContract.tokensOfOwner(address(this));

            for(uint256 ind; ind < tokens.length; ind++){
                zkZeroContract.transferFrom(address(this), msg.sender, tokens[ind]);
            }

    }

}
