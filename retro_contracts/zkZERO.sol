// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

interface veretro {
    function getVotes(address account) external view returns(uint256);
}

/**
 * @title zkZERO contract
 * @dev Extends ERC721 Non-Fungible Token Standard basic implementation
 */
contract zkZERO is ERC721Enumerable, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    uint256 public MAX_SUPPLY = 929;
    uint256 public MAX_MINT = 3;
    uint256 public SALE_START_TIMESTAMP;
    address public cashReceiver;
    bool public ended;

    mapping(address => uint256) public prices;

    address public operator;

    constructor(
        address multisig
    ) ERC721("zkZERO", "zkZERO") {
        prices[0x5D066D022EDE10eFa2717eD3D79f22F949F8C175] = 450e18;
        prices[0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174] = 450e6;
        prices[0xc2132D05D31c914a87C6611C10748AEb04B58e8F] = 450e6;
        prices[0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063] = 450e18;
        SALE_START_TIMESTAMP = block.timestamp;
        cashReceiver = multisig;
    }

    function setEnded(bool _value) external onlyOwner {
        ended = _value;
    }

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
    }

    function setAllowed(address token, uint256 value) external onlyOwner {
        prices[token] = value;
    }

    function setMaxSupply(uint256 _maxSupply) external onlyOwner {
        MAX_SUPPLY = _maxSupply;
    }

    function setMaxMint(uint256 _maxMint) external onlyOwner {
        MAX_MINT = _maxMint;
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

    function mint(address payToken) public {
        require(prices[payToken] > 0, "token is not whitelisted for presale");
        require(balanceOf(msg.sender) < MAX_MINT, "Exceeded max allowed amount per wallet");
        require(block.timestamp >= SALE_START_TIMESTAMP, "Sale has not started yet.");
        require(!ended, "Sale has ended.");

        IERC20(payToken).safeTransferFrom(msg.sender, cashReceiver, prices[payToken]);

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

    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        return "https://ipfs.io/ipfs/QmPD9oiAUS3Lr6EqLTHFEBazackAzRT1LU74UiaWJoSSPo";
    }

}
