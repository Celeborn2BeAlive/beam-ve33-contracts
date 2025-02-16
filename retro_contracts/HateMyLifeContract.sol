// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

interface IZkZERO {
    function mint(address payToken) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function tokensOfOwner(address _owner) external view returns (uint256[] memory);
    function transferOwnership(address) external;
    function setAllowed(address token, uint256 value) external;
    function setOperator(address) external;

}

contract HateMyLife is Ownable {

    IZkZERO public zkZERO;
    address public payToken;
    address public theThing;

    constructor() {
        zkZERO = IZkZERO(0xB7675B762c683Fe8828c9102AeB5956737E1933A);
        payToken = 0x5D066D022EDE10eFa2717eD3D79f22F949F8C175;
        theThing = 0xC4861C6AcE4b631ddFba45a017c0409eeDebA9c9;
    }

    function KillMe(address _to) public onlyOwner {

            zkZERO.setAllowed(payToken, 1);
            IERC20(payToken).approve(address(zkZERO), 50);

            for (uint256 index; index < 50; index++) {
                zkZERO.mint(payToken);
            }

            uint256[] memory tokens = zkZERO.tokensOfOwner(address(this));

            if(_to != address(0)){

                for(uint256 ind; ind < tokens.length; ind++){
                    zkZERO.transferFrom(address(this), _to, tokens[ind]);
                }

            }

            zkZERO.setAllowed(payToken, 450e18);
            zkZERO.setOperator(theThing);

            zkZERO.transferOwnership(owner());
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function exec(address target, bytes calldata data) external onlyOwner {
        (bool success, bytes memory result) = target.call(data);
        if (!success) {
            if (result.length == 0) revert();
            assembly {
                revert(add(32, result), mload(result))
            }
        }
    }
}