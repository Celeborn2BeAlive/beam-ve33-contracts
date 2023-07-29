// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IVotingEscrow.sol";
import "./interfaces/IRetro.sol";
import "./interfaces/IPermissionsRegistry.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `from` to `to` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function burn(address, uint256) external;
}


contract SatinMigration is Ownable, ReentrancyGuard {

    IERC20 public satinReceipt = IERC20(0x48DB082Dbf85615820809e0BD4CEDb19229f0B91);
    IRetro public retro = IRetro(0xBFA35599c7AEbb0dAcE9b5aa3ca5f2a79624D8Eb);
    IVotingEscrow public veRetro = IVotingEscrow(0xB419cE2ea99f356BaE0caC47282B9409E38200fa);
    IPermissionsRegistry public permissionsRegistry = IPermissionsRegistry(0xE14261E4c0347f6dfc74D515cA48BAA6A818EDfA);

    uint256 public constant boost_denominator = 10000;

    mapping(uint256 => uint256) public level_to_boost;
    mapping(address => bool) public blacklisted;

    uint256 public startTime;
    uint256 public endTime;
    uint256 public retroPerSatin;

    constructor() public {

        startTime = block.timestamp;
        endTime = block.timestamp + 60 * 86400; // 60 days
        uint256 three_months = 93 * 86400;
        uint256 six_months = three_months * 2;
        uint256 one_year = six_months * 2;
        uint256 two_years = 365 * 2 * 86400; //2 years

        retroPerSatin = 1365500000000000; //0.0013655 RETRO per single SATIN

        level_to_boost[three_months] = 10500; //5%
        level_to_boost[six_months] = 11000; //10%
        level_to_boost[one_year] = 11500; //15%
        level_to_boost[two_years] = 12500; //25%
        blacklisted[0x13477168151aD9E8269C57C969F59C9ed0855b97] = true;
        blacklisted[0xEC93A4A53be1b7E2A49fB0F076b79743D0B7C168] = true;
        blacklisted[0x6158163FACE033046dC3773df300972f489d42f7] = true;
        blacklisted[0x56899E31704584Ad7AD211215F67555967532e21] = true;
        blacklisted[0x42F2D5C7FDab13A5d740fbEbCc66D227Fb993D81] = true;
        blacklisted[0x6992Bd823bB63E189a827566C648eCE23adC6dE9] = true;
        blacklisted[0x69cD1C2E13113C09a22Ff98cBd2dB3f682f716B4] = true;
        blacklisted[0x4be92e8062fA7F142A485449FF21E1d88Fc9E357] = true;
        blacklisted[0x4Dfa03c64ABd96359B77E7cCa8219B451C19f27E] = true;
        blacklisted[0x1d5961d69425E8AFD5614fdb387461Efa8283B06] = true;
        blacklisted[0xB7f1219dB39EA0CB029E4DcC3daFFDCFd233DEFD] = true;
        blacklisted[0x0c0f1a11b220fd1d53306F67b9327CDeb31D662b] = true;
        blacklisted[0x94DC0b13E66ABa9450b3Cc44c2643BBb4C264BC7] = true;
        blacklisted[0xD3D89583d0E220C4Bb9331FA326cCA3a1da213E2] = true;
        blacklisted[0x12B3D7976FB3128B4b055965ED900A9A5C8Af4A5] = true;
        blacklisted[0xC3a6afD262FA35ADdcAa4929B87353E65038a536] = true;
        blacklisted[0x3Ceb4c9CB783a7e7761f26E66133f7D84690728f] = true;
        blacklisted[0xa766fAfe4Ec445A28f5AA0d9F67f0480d1d7c48A] = true;
        blacklisted[0x39069AdD37ea21D3db98E01e8Ad81baCEF739168] = true;
        blacklisted[0xbf297Ce6E28958971DF557b9c69e1297D414ABA5] = true;
        blacklisted[0x7CB5D5802817b44c9AE92C379a0c0b143a4d702D] = true;
        blacklisted[0xDCB5A4b6Ee39447D700F4FA3303B1d1c25Ea9cA7] = true;
        blacklisted[0x80fd0accC8Da81b0852d2Dca17b5DDab68f22253] = true;
        blacklisted[0x81a7525cD96603Eb335A9E6e8473246f232FD71D] = true;
        blacklisted[0x5D18b089e838DFFbb417A87874435175F3A9B000] = true;
        blacklisted[0x1d8a6b7941ef1349c1b5E378783Cd56B001EcfBc] = true;
        blacklisted[0x2709fa6FA31BD336455d4F96DdFC505b3ACA5A68] = true;
        blacklisted[0x2709fa6FA31BD336455d4F96DdFC505b3ACA5A68] = true;
        blacklisted[0x2709fa6FA31BD336455d4F96DdFC505b3ACA5A68] = true;
        blacklisted[0xAE1c38847Fb90A13a2a1D7E5552cCD80c62C6508] = true;
        blacklisted[0xADDC413C6D63A5fA654D7a2e31aF3a34c88A1206] = true;
        blacklisted[0x06917EFCE692CAD37A77a50B9BEEF6f4Cdd36422] = true;
        blacklisted[0xe37dD9A535c1D3c9fC33e3295B7e08bD1C42218D] = true;
        blacklisted[0xD204E3dC1937d3a30fc6F20ABc48AC5506C94D1E] = true;
        blacklisted[0x2709fa6FA31BD336455d4F96DdFC505b3ACA5A68] = true;
        blacklisted[0x20D61737f972EEcB0aF5f0a85ab358Cd083Dd56a] = true;
        blacklisted[0x203D15f68d594060C0EaE4edecBD2aB124d6450C] = true;
        blacklisted[0x3ef000Bae3e8105be55F76FDa784fD7d69CFf30e] = true;
        blacklisted[0x28aa4F9ffe21365473B64C161b566C3CdeAD0108] = true;
        blacklisted[0x94DC0b13E66ABa9450b3Cc44c2643BBb4C264BC7] = true;
        blacklisted[0x928e8f55c7C5695f5E0Dc621551cF53964593406] = true;

        retro.approve(address(veRetro), type(uint256).max);
    }

    function claimRetro() public nonReentrant {
        require(!blacklisted[msg.sender], "blacklisted");
        require(block.timestamp <= endTime, "ended");

        uint256 satinBalance = satinReceipt.balanceOf(msg.sender);
        satinReceipt.burn(msg.sender, satinBalance);
        
        uint256 retroToRelease = satinBalance * retroPerSatin / 1e18;
        retro.transfer(msg.sender, retroToRelease);
    }

    function claimRetroAndLock(uint256 _level) public nonReentrant {
        require(level_to_boost[_level] > 0, "level doesnt exist");
        require(!blacklisted[msg.sender], "blacklisted");
        require(block.timestamp <= endTime, "ended");

        uint256 satinBalance = satinReceipt.balanceOf(msg.sender);
        satinReceipt.burn(msg.sender, satinBalance);

        uint256 retroToRelease = satinBalance * retroPerSatin / 1e18;
        veRetro.create_lock_for(retroToRelease * level_to_boost[_level] / boost_denominator, _level, msg.sender);
    }

    function getRetroToRelease(address _addr) public view returns(uint256) {
        uint256 satinBalance = satinReceipt.balanceOf(_addr);
        uint256 retroToRelease = satinBalance * retroPerSatin / 1e18;
        return retroToRelease;
    }

    function setLevelToBoost(uint256 _level, uint256 _boost) public onlyOwner {
        level_to_boost[_level] = _boost;
    } 

    function setRetroPerSatin(uint256 _retroPerSatin) public onlyOwner {
        retroPerSatin = _retroPerSatin;
    } 

    function closeContract() public onlyOwner {
        require(block.timestamp >= endTime, "not ended yet");
        uint256 remainingBalance = retro.balanceOf(address(this));
        retro.transfer(owner(), remainingBalance);
    }

    function recoverTokens(address _token, uint256 amount, address _who) public onlyOwner {
        require(_token != address(retro), "retro");
        IERC20(_token).transfer(_who, amount);
    }

}