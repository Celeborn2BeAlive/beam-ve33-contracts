// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import 'contracts/interfaces/IPairInfo.sol';
import 'contracts/interfaces/IFeeVault.sol';

contract ALMFeeVault is Ownable, IFeeVault {

    using SafeERC20 for IERC20;

    /* -----------------------------------------------------------------------------
    --------------------------------------------------------------------------------
                                    DATA
    --------------------------------------------------------------------------------
    ----------------------------------------------------------------------------- */
    /// @dev PRECISION for decimals
    uint256 constant public PRECISION = 1e6;
    /// @dev Share for the treasury
    uint256 public treasuryShare = 0;

    /// @dev underlying pool of the feevault
    address public pool;
    /// @dev underlying gauge of the feevault
    address public gauge;
    /// @dev treasury fee receiver address
    address public treasury;
    /// @dev the token0 of the underlying pool
    address public token0;
    /// @dev the token1 of the underlying pool
    address public token1;

    /// @dev fee vault version
    string public constant version = "3.0.0";

    /// @dev map if an address is allowed to call
    mapping(address => bool) public isAllowed;




    /* -----------------------------------------------------------------------------
    --------------------------------------------------------------------------------
                                    MODIFIERS
    --------------------------------------------------------------------------------
    ----------------------------------------------------------------------------- */
    /// @notice check if msg.sender is allowed to operate
    modifier onlyAllowed() {
        require(isAllowed[msg.sender],'!allowed');
        _;
    }


    /* -----------------------------------------------------------------------------
    --------------------------------------------------------------------------------
                                    CONSTRUCTOR AND INIT
    --------------------------------------------------------------------------------
    ----------------------------------------------------------------------------- */
    /// @notice Deploy Fee vault
    /// @param _pool    underlying pool contract
    /// @param _gauge   underlying gauge contract
    /// @param _treasury  the nft converter contract
    constructor(address _pool, address _gauge, address _treasury) {
        if(_pool == address(0)) revert AddressZero();
        if(_treasury == address(0)) revert AddressZero();

        pool = _pool;
        // gauge can be set later using ::setgauge()
        if(_gauge != address(0)){
            isAllowed[_gauge] = true;
            gauge = _gauge;
        }

        treasury = _treasury;

        token0 = IPairInfo(pool).token0();
        token1 = IPairInfo(pool).token1();
    }



    /* -----------------------------------------------------------------------------
    --------------------------------------------------------------------------------
                                    LP FEES CLAIM
    --------------------------------------------------------------------------------
    ----------------------------------------------------------------------------- */

    /// @notice Claim Fees from the pool and send to the votingIncentives
    /// @dev gauge must be set != address(0) else revert
    function claimFees() external returns(uint256 gauge0, uint256 gauge1) {

        if(!isAllowed[msg.sender]) revert NotAllowed();
        if(gauge == address(0)) revert AddressZero();
        if(treasury == address(0)) revert AddressZero();

        // token0
        address t0 = token0;
        uint256 balance = IERC20(t0).balanceOf(address(this));
        uint256 treasury_0 =  balance * treasuryShare / PRECISION;
        gauge0 = balance - treasury_0;

        // token1
        address t1 = token1;
        balance = IERC20(t1).balanceOf(address(this));
        uint256 treasury_1 =  balance * treasuryShare / PRECISION;
        gauge1 = balance - treasury_1;

        if(gauge0 > 0){
            if(treasury_0 > 0) IERC20(t0).safeTransfer(treasury, treasury_0);
            IERC20(t0).safeTransfer(msg.sender, gauge0);
        }
        if(gauge1 > 0){
            if(treasury_1 > 0) IERC20(t1).safeTransfer(treasury, treasury_1);
            IERC20(t1).safeTransfer(msg.sender, gauge1);
        }

        emit Fees(gauge0, gauge1, treasury_0, treasury_1, pool, block.timestamp);

    }



    /* -----------------------------------------------------------------------------
    --------------------------------------------------------------------------------
                                    ADMIN FUNCTIONS
    --------------------------------------------------------------------------------
    ----------------------------------------------------------------------------- */

    /// @notice Set a treasury fee receiver address
    function setTreasury(address _treasury) external onlyOwner {
        if(_treasury == address(0)) revert AddressZero();
        treasury = _treasury;
        emit SetTreasury(_treasury);
    }

    /// @notice Set treasury fees share
    /// @dev Share cant be higher than 100%.
    function setTreasuryShare(uint256 share) external onlyOwner {
        if(share > PRECISION) revert TreasuryShareTooHigh();
        treasuryShare = share;
        emit SetTreasuryShare(share);
    }


    /// @notice Set the gauge where to send fees
    function setGauge(address _gauge) external onlyOwner {
        if(_gauge == address(0)) revert AddressZero();
        address _oldgauge = gauge;
        gauge = _gauge;
        emit SetGauge(_oldgauge, _gauge);
    }

    /// @notice allow an EOA or Contract to claimFees
    function allow(address caller, bool status) external onlyOwner {
        isAllowed[caller] = status;
        emit Allow(caller, status);
    }

    /// @notice set the underlying pool where to get fees
    function setPool(address _pool) external onlyOwner {
        if(_pool == address(0)) revert AddressZero();
        address _oldPool = pool;
        pool = _pool;
        // update tokens
        token0 = IPairInfo(pool).token0();
        token1 = IPairInfo(pool).token1();
        emit SetPool(_oldPool, _pool);
    }

    /// @notice Recover ERC20 from the contract.
    function recoverERC20(address _tokenAddress, uint256 _tokenAmount) external onlyOwner {
        require(_tokenAmount <= IERC20(_tokenAddress).balanceOf(address(this)));
        IERC20(_tokenAddress).safeTransfer(msg.sender, _tokenAmount);
        emit WithdrawERC20(_tokenAddress, _tokenAmount);
    }

}
