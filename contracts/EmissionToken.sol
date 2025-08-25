// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IEmissionToken.sol";

contract EmissionToken is IEmissionToken, ERC20 {
    error NotMinter();

    address public minter;

    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {
        minter = msg.sender;
    }

    // No checks as its meant to be once off to set minting rights to BaseV1 Minter
    function setMinter(address _minter) external {
        if (msg.sender != minter) revert NotMinter();
        minter = _minter;
    }

    function mint(address account, uint amount) external {
        if (msg.sender != minter) revert NotMinter();
        _mint(account, amount);
    }
}
