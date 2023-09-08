// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title zkZERO contract
 * @dev Extends ERC721 Non-Fungible Token Standard basic implementation
 */
contract zkZERO is ERC721Enumerable, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    uint256 public MAX_SUPPLY;
    uint256 public NFT_PRICE;
    uint256 public MAX_MINT = 1200;
    uint256 public SALE_START_TIMESTAMP;
    address public cashReceiver;
    bool public ended;
    IERC20 public cash = IERC20(0x5D066D022EDE10eFa2717eD3D79f22F949F8C175);
    address public operator;

    constructor(
        uint256 _maxSupply,
        uint256 _startTimestamp,
        address multisig
    ) ERC721("zkZERO", "zkZERO") {
        MAX_SUPPLY = _maxSupply;
        NFT_PRICE = 500e18; //change to 500e18
        SALE_START_TIMESTAMP = _startTimestamp;
        cashReceiver = multisig;
    }

    function setEnded(bool _value) external onlyOwner {
        ended = _value;
    }

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
    }

    function setNftPrice(uint256 _nftPrice) external onlyOwner {
        NFT_PRICE = _nftPrice;
    }

    function setCashReceiver(address _cashReceiver) external onlyOwner {
        cashReceiver = _cashReceiver;
    }

    /**
     * Get the array of token for owner.
     */
    function tokensOfOwner(address _owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(_owner);
        if (tokenCount == 0) {
            return new uint256[](0);
        } else {
            uint256[] memory result = new uint256[](tokenCount);
            for (uint256 index; index < tokenCount; index++) {
                result[index] = tokenOfOwnerByIndex(_owner, index);
            }
            return result;
        }
    }

    function mint() public {
        require(balanceOf(msg.sender) < MAX_MINT, "Exceeded max allowed amount per wallet");
        require(block.timestamp >= SALE_START_TIMESTAMP, "Sale has not started yet.");
        require(!ended, "Sale has ended.");

        cash.safeTransferFrom(msg.sender, cashReceiver, NFT_PRICE);

        _mintTo(msg.sender);
    }

    function _mintTo(address account) internal {
        require(totalSupply() + 1 <= MAX_SUPPLY, "Mint would exceed max supply.");
        _safeMint(account, totalSupply());
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal override virtual {
        require(from == address(0) || msg.sender == operator, "Err: token transfer is BLOCKED");   
        super._beforeTokenTransfer(from, to, tokenId, batchSize);  
    }
}
