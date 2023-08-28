// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IVault {
    function setAdminImpl(address newImpl) external;
    function setFeeExempt(address _addr, bool _value) external;
    function setMintFeeBps(uint256 _mintFeeBps) external;
    function withdrawAllFromStrategies() external;
    function withdrawAllFromStrategy(address _strategyAddr) external;
    function transferToken(address _asset, uint256 _amount) external;
    function pauseCapital() external;
    function unpauseCapital() external;
    function pauseRebase() external;
    function unpauseRebase() external;
    function setCashMetaStrategy(address _cashMetaStrategy) external;
    function setTrusteeFeeBps(uint256 _basis) external;
    function setRedeemFeeBps(uint256 _redeemFeeBps) external;
    function setAutobribeAddress(address _address) external;
    function setPerformanceFeeAddress(address _address) external;
    function setWithdrawFeeAddress(address _address) external;
    function setDepositFeeAddress(address _address) external;
    function setMaxSupplyDiff(uint256 _maxSupplyDiff) external;
    function withdrawFromStrategy(address _strategyFromAddress, address[] calldata _assets, uint256[] calldata _amounts) external;
    function depositToStrategy(address _strategyToAddress, address[] calldata _assets,uint256[] calldata _amounts) external;
    function reallocate(address _strategyFromAddress, address _strategyToAddress, address[] calldata _assets, uint256[] calldata _amounts) external;
    function removeStrategy(address _addr) external;
    function approveStrategy(address _addr) external;
    function supportAsset(address _asset) external;
    function setAssetDefaultStrategy(address _asset, address _strategy) external;
    function setStrategistAddr(address _address) external;
    function setRebaseThreshold(uint256 _threshold) external;
    function setAutoAllocateThreshold(uint256 _threshold) external;
    function setVaultBuffer(uint256 _vaultBuffer) external;
    function setPriceProvider(address _priceProvider) external;
}

interface IStrategy {
    function setHarvesterAddress(address _harvesterAddress) external;
    function withdrawAll() external;
    function setOracleRouter() external;
}

interface ISharedGovernable {
    function upgradeTo(address newImplementation) external;
    function transferGovernance(address _newGovernor) external;
    function claimGovernance() external;
    function transferToken(address _asset, uint256 _amount) external;
}

contract StablTimelock {

    address public cashVault;
    address public ecosystemMultisig;
    address public teamMultisig;

    uint256 public constant MAX_BUFFER = 5 days;
    uint256 public buffer = 36 hours;
    uint256 public bufferLight = 24 hours;

    mapping (bytes32 => uint256) public pendingActions;

    event SignalSetHarvesterAddress(address target, address harvester);
    event SetHarvesterAddress(address target, address harvester);

    event SignalWithdrawAll(address target);
    event WithdrawAll(address target);

    event SignalSetOracleRouter(address target);
    event SetOracleRouter(address target);

    event SignalUpgradeTo(address target, address newImplementation);
    event UpgradeTo(address target, address newImplementation);

    event SignalSetPriceProvider(address priceProvider);
    event SetPriceProvider(address priceProvider);

    event SignalSetVaultBuffer(uint256 vaultBuffer);
    event SetVaultBuffer(uint256 vaultBuffer);

    event SignalSetAutoAllocateThreshold(uint256 threshold);
    event SetAutoAllocateThreshold(uint256 threshold);

    event SignalSetRebaseThreshold(uint256 threshold);
    event SetRebaseThreshold(uint256 threshold);

    event SignalSetStrategistAddr(address strategist);
    event SetStrategistAddr(address strategist);

    event SignalSetAssetDefaultStrategy(address asset, address strategy);
    event SetAssetDefaultStrategy(address asset, address strategy);

    event SignalSupportAsset(address asset);
    event SupportAsset(address strategy);

    event SignalApproveStrategy(address strategy);
    event ApproveStrategy(address strategy);

    event SignalRemoveStrategy(address strategy);
    event RemoveStrategy(address strategy);

    event SignalReallocate(address strategyFromAddress, address strategyToAddress, address[] assets, uint256[] amounts);
    event Reallocate(address strategyFromAddress, address strategyToAddress, address[] assets, uint256[] amounts);

    event SignalDepositToStrategy(address strategyToAddress, address[] assets, uint256[] amounts);
    event DepositToStrategy(address strategyToAddress, address[] assets, uint256[] amounts);

    event SignalWithdrawFromStrategy(address strategyFromAddress, address[] assets, uint256[] amounts);
    event WithdrawFromStrategy(address strategyFromAddress, address[] assets, uint256[] amounts);

    event SignalSetMaxSupplyDiff(uint256 newDiff);
    event SetMaxSupplyDiff(uint256 newDiff);

    event SignalSetDepositFeeAddress(address depositFeeAddr);
    event SetDepositFeeAddress(address depositFeeAddr);

    event SignalSetWithdrawFeeAddress(address withdrawFeeAddr);
    event SetWithdrawFeeAddress(address withdrawFeeAddr);

    event SignalSetPerformanceFeeAddress(address performanceFeeAddr);
    event SetPerformanceFeeAddress(address performanceFeeAddr);

    event SignalSetAutobribeAddress(address autobribeAddr);
    event SetAutobribeAddress(address autobribeAddr);

    event SignalSetRedeemFeeBps(uint256 newFee);
    event SetRedeemFeeBps(uint256 newFee);

    event SignalSetTrusteeFeeBps(uint256 newFee);
    event SetTrusteeFeeBps(uint256 newFee);

    event SignalSetCashMetaStrategy(address strategyAddr);
    event SetCashMetaStrategy(address strategyAddr);

    event SignalPauseRebase();
    event PauseRebase();

    event SignalUnpauseRebase();
    event UnpauseRebase();

    event SignalPauseCapital();
    event PauseCapital();

    event SignalUnpauseCapital();
    event UnpauseCapital();

    event SignalTransferToken(address target, address asset, uint256 amount);
    event TransferToken(address target, address asset, uint256 amount);

    event SignalWithdrawAllFromStrategy(address strategyAddr);
    event WithdrawAllFromStrategy(address strategyAddr);

    event SignalWithdrawAllFromStrategies();
    event WithdrawAllFromStrategies();

    event SignalSetMintFeeBps(uint256 newFee);
    event SetMintFeeBps(uint256 newFee);

    event SignalSetAdminImpl(address newImpl);
    event SetAdminImpl(address newImpl);

    event SignalClaimGovernance(address target);
    event ClaimGovernance(address target);

    event SignalTransferGovernance(address target, address owner);
    event TransferGovernance(address target, address owner);

    event SignalSetFeeExempt(address who, bool val);
    event SetFeeExempt(address who, bool val);

    event SignalPendingAction(bytes32 action);
    event ClearAction(bytes32 action);

    constructor(){
        ecosystemMultisig = 0x83aA9E41bb3B8295F5b192C111B57DFD213A2d5b;
        teamMultisig = 0x35dCEaD4670161a3D123b007922d61378D3A9d18;
        cashVault = 0x2D62f6D8288994c7900e9C359F8a72e84D17bfba;
    }

    modifier onlyEcosystem() {
        require(msg.sender == ecosystemMultisig, "StablTimelock: ecosystem forbidden");
        _;
    }

    modifier onlyTeam() {
        require(msg.sender == teamMultisig, "StablTimelock: team forbidden");
        _;
    }

    //ok
    function setBuffer(uint256 _buffer) external onlyEcosystem {
        require(_buffer <= MAX_BUFFER, "StablTimelock: invalid buffer");
        require(_buffer > buffer, "StablTimelock: buffer cannot be decreased");
        buffer = _buffer;
    }
    //ok
    function setBufferLight(uint256 _bufferLight) external onlyEcosystem {
        require(_bufferLight <= MAX_BUFFER, "StablTimelock: invalid bufferLight");
        require(_bufferLight > bufferLight, "StablTimelock: bufferLight cannot be decreased");
        bufferLight = _bufferLight;
    }
    //ok
    function signalWithdrawAll(address _target) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("withdrawAll", _target));
        _setPendingAction(action, false, false); //no buffer for moving assets to vault

        emit SignalWithdrawAll(_target);
    }
    //ok
    function withdrawAll(address _target) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("withdrawAll", _target));
        _validateAction(action);
        _clearAction(action);

        IStrategy(_target).withdrawAll();

        emit WithdrawAll(_target);
    }
    //ok
    function signalSetOracleRouter(address _target) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setOracleRouter", _target));
        _setPendingAction(action, false, false); // no buffer for this action as its already buffered in setPriceProvider

        emit SignalSetOracleRouter(_target);
    }
    //ok
    function setOracleRouter(address _target) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setOracleRouter", _target));
        _validateAction(action);
        _clearAction(action);

        IStrategy(_target).setOracleRouter();

        emit SetOracleRouter(_target);
    }
    //ok
    function signalSetHarvesterAddress(address _target, address _harvester) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setHarvesterAddress", _target, _harvester));
        _setPendingAction(action, true, false); // buffer for actions

        emit SignalSetHarvesterAddress(_target, _harvester);
    }
    //ok
    function setHarvesterAddress(address _target, address _harvester) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setHarvesterAddress", _target, _harvester));
        _validateAction(action);
        _clearAction(action);

        IStrategy(_target).setHarvesterAddress(_harvester);

        emit SetHarvesterAddress(_target, _harvester);
    }
    //ok
    function signalUpgradeTo(address _target, address _newImplementation) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("upgradeTo", _target, _newImplementation));
        _setPendingAction(action, true, false); // buffer for critical actions

        emit SignalUpgradeTo(_target, _newImplementation);
    }
    //ok
    function upgradeTo(address _target, address _newImplementation) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("upgradeTo", _target, _newImplementation));
        _validateAction(action);
        _clearAction(action);

        ISharedGovernable(_target).upgradeTo(_newImplementation);

        emit UpgradeTo(_target, _newImplementation);
    }
    //ok
    function signalSetPriceProvider(address _newPriceProvider) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setPriceProvider", _newPriceProvider));
        _setPendingAction(action, true, false); // buffer for critical actions

        emit SignalSetPriceProvider(_newPriceProvider);
    }
    //ok
    function setPriceProvider(address _newPriceProvider) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setPriceProvider", _newPriceProvider));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setPriceProvider(_newPriceProvider);

        emit SetPriceProvider(_newPriceProvider);
    }
    //ok
    function signalSetVaultBuffer(uint256 _newVaultBuffer) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setVaultBuffer", _newVaultBuffer));
        _setPendingAction(action, true, false); //

        emit SignalSetVaultBuffer(_newVaultBuffer);
    }
    //ok
    function setVaultBuffer(uint256 _newVaultBuffer) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setVaultBuffer", _newVaultBuffer));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setVaultBuffer(_newVaultBuffer);

        emit SetVaultBuffer(_newVaultBuffer);
    }
    //ok
    function signalSetAutoAllocateThreshold(uint256 _newThreshold) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setAutoAllocateThreshold", _newThreshold));
        _setPendingAction(action, false, false); // no buffer

        emit SignalSetAutoAllocateThreshold(_newThreshold);
    }
    //ok
    function setAutoAllocateThreshold(uint256 _newThreshold) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setAutoAllocateThreshold", _newThreshold));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setAutoAllocateThreshold(_newThreshold);

        emit SetAutoAllocateThreshold(_newThreshold);
    }
    //ok
    function signalSetRebaseThreshold(uint256 _newThreshold) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setRebaseThreshold", _newThreshold));
        _setPendingAction(action, false, false); // no buffer

        emit SignalSetRebaseThreshold(_newThreshold);
    }
    //ok
    function setRebaseThreshold(uint256 _newThreshold) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setRebaseThreshold", _newThreshold));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setRebaseThreshold(_newThreshold);

        emit SetRebaseThreshold(_newThreshold);
    }
    //ok
    function signalSetStrategistAddr(address _strategistAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setStrategistAddr", _strategistAddr));
        _setPendingAction(action, true, false); // 36h buffer for critical actions

        emit SignalSetStrategistAddr(_strategistAddr);
    }
    //ok
    function setStrategistAddr(address _strategistAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setStrategistAddr", _strategistAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setStrategistAddr(_strategistAddr);

        emit SetStrategistAddr(_strategistAddr);
    }
    //ok
    function signalSetAssetDefaultStrategy(address _assetAddr, address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setAssetDefaultStrategy", _assetAddr, _strategyAddr));
        _setPendingAction(action, false, false); // no buffer for managing inside

        emit SignalSetAssetDefaultStrategy(_assetAddr, _strategyAddr);
    }
    //ok
    function setAssetDefaultStrategy(address _assetAddr, address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setAssetDefaultStrategy", _assetAddr, _strategyAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setAssetDefaultStrategy(_assetAddr, _strategyAddr);

        emit SetAssetDefaultStrategy(_assetAddr, _strategyAddr);
    }
    //ok
    function signalSupportAsset(address _assetAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("supportAsset", _assetAddr));
        _setPendingAction(action, true, false); // 36h buffer for critical actions

        emit SignalSupportAsset(_assetAddr);
    }
    //ok
    function supportAsset(address _assetAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("supportAsset", _assetAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).supportAsset(_assetAddr);

        emit SupportAsset(_assetAddr);
    }
    //ok
    function signalApproveStrategy(address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("approveStrategy", _strategyAddr));
        _setPendingAction(action, true, false); // 36h buffer for removing old strategies

        emit SignalApproveStrategy(_strategyAddr);
    }
    //ok
    function approveStrategy(address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("approveStrategy", _strategyAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).approveStrategy(_strategyAddr);

        emit ApproveStrategy(_strategyAddr);
    }
    //ok
    function signalRemoveStrategy(address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("removeStrategy", _strategyAddr));
        _setPendingAction(action, true, false); // 36h buffer for removing old strategies

        emit SignalRemoveStrategy(_strategyAddr);
    }
    //ok
    function removeStrategy(address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("removeStrategy", _strategyAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).removeStrategy(_strategyAddr);

        emit RemoveStrategy(_strategyAddr);
    }
    //ok
    function signalReallocate(address _strategyFromAddress, address _strategyToAddress, address[] calldata _assets, uint256[] calldata _amounts) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("reallocate", _strategyFromAddress, _strategyToAddress, _assets, _amounts));
        _setPendingAction(action, false, false); // no buffer for moving funds between strategies

        emit SignalReallocate(_strategyFromAddress, _strategyToAddress, _assets, _amounts);
    }
    //ok
    function reallocate(address _strategyFromAddress, address _strategyToAddress, address[] calldata _assets, uint256[] calldata _amounts) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("reallocate", _strategyFromAddress, _strategyToAddress, _assets, _amounts));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).reallocate(_strategyFromAddress, _strategyToAddress, _assets, _amounts);

        emit Reallocate(_strategyFromAddress, _strategyToAddress, _assets, _amounts);
    }
    //ok
    function signalDepositToStrategy(address _strategyToAddress, address[] calldata _assets, uint256[] calldata _amounts) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("depositToStrategy", _strategyToAddress, _assets, _amounts));
        _setPendingAction(action, false, false); // no buffer for moving funds between strategies

        emit SignalDepositToStrategy(_strategyToAddress, _assets, _amounts);
    }
    //ok
    function depositToStrategy(address _strategyToAddress, address[] calldata _assets, uint256[] calldata _amounts) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("depositToStrategy", _strategyToAddress, _assets, _amounts));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).depositToStrategy(_strategyToAddress, _assets, _amounts);

        emit DepositToStrategy(_strategyToAddress, _assets, _amounts);
    }
    //ok
    function signalWithdrawFromStrategy(address _strategyFromAddress, address[] calldata _assets, uint256[] calldata _amounts) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("withdrawFromStrategy", _strategyFromAddress, _assets, _amounts));
        _setPendingAction(action, false, false); // no buffer for moving funds between strategies

        emit SignalWithdrawFromStrategy(_strategyFromAddress, _assets, _amounts);
    }
    //ok
    function withdrawFromStrategy(address _strategyFromAddress, address[] calldata _assets, uint256[] calldata _amounts) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("withdrawFromStrategy", _strategyFromAddress, _assets, _amounts));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).withdrawFromStrategy(_strategyFromAddress, _assets, _amounts);

        emit WithdrawFromStrategy(_strategyFromAddress, _assets, _amounts);
    }
    //ok
    function signalSetMaxSupplyDiff(uint256 _newDiff) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setMaxSupplyDiff", _newDiff));
        _setPendingAction(action, true, false); // 36h buffer for critical changes

        emit SignalSetMaxSupplyDiff(_newDiff);
    }
    //ok
    function setMaxSupplyDiff(uint256 _newDiff) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setMaxSupplyDiff", _newDiff));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setMaxSupplyDiff(_newDiff);

        emit SetMaxSupplyDiff(_newDiff);
    }
    //ok
    function signalSetDepositFeeAddress(address _depositFeeAddr) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setDepositFeeAddress", _depositFeeAddr));
        _setPendingAction(action, true, false); // buffer for fee changes

        emit SignalSetDepositFeeAddress(_depositFeeAddr);
    }
    //ok
    function setDepositFeeAddress(address _depositFeeAddr) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setDepositFeeAddress", _depositFeeAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setDepositFeeAddress(_depositFeeAddr);

        emit SetDepositFeeAddress(_depositFeeAddr);
    }
    //ok
    function signalSetWithdrawFeeAddress(address _withdrawFeeAddr) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setWithdrawFeeAddress", _withdrawFeeAddr));
        _setPendingAction(action, true, false); // buffer for adding new strategies

        emit SignalSetWithdrawFeeAddress(_withdrawFeeAddr);
    }
    //ok
    function setWithdrawFeeAddress(address _withdrawFeeAddr) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setWithdrawFeeAddress", _withdrawFeeAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setWithdrawFeeAddress(_withdrawFeeAddr);

        emit SetWithdrawFeeAddress(_withdrawFeeAddr);
    }
    //ok
    function signalSetPerformanceFeeAddress(address _performanceFeeAddr) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setPerformanceFeeAddress", _performanceFeeAddr));
        _setPendingAction(action, true, false); // buffer for adding new strategies

        emit SignalSetPerformanceFeeAddress(_performanceFeeAddr);
    }
    //ok
    function setPerformanceFeeAddress(address _performanceFeeAddr) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setPerformanceFeeAddress", _performanceFeeAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setPerformanceFeeAddress(_performanceFeeAddr);

        emit SetPerformanceFeeAddress(_performanceFeeAddr);
    }
    //ok
    function signalSetAutobribeAddress(address _autobribeAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setAutobribeAddress", _autobribeAddr));
        _setPendingAction(action, true, false);

        emit SignalSetAutobribeAddress(_autobribeAddr);
    }
    //ok
    function setAutobribeAddress(address _autobribeAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setAutobribeAddress", _autobribeAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setAutobribeAddress(_autobribeAddr);

        emit SetAutobribeAddress(_autobribeAddr);
    }
    //ok
    function signalSetRedeemFeeBps(uint256 _newFee) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setRedeemFeeBps", _newFee));
        _setPendingAction(action, true, false); // 36h buffer for critical changes

        emit SignalSetRedeemFeeBps(_newFee);
    }
    //ok
    function setRedeemFeeBps(uint256 _newFee) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setRedeemFeeBps", _newFee));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setRedeemFeeBps(_newFee);

        emit SetRedeemFeeBps(_newFee);
    }
    //ok
    function signalSetTrusteeFeeBps(uint256 _newFee) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setTrusteeFeeBps", _newFee));
        _setPendingAction(action, true, false); // 36h buffer for fee changes

        emit SignalSetTrusteeFeeBps(_newFee);
    }
    //ok
    function setTrusteeFeeBps(uint256 _newFee) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setTrusteeFeeBps", _newFee));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setTrusteeFeeBps(_newFee);

        emit SetTrusteeFeeBps(_newFee);
    }
    //ok
    function signalSetCashMetaStrategy(address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setCashMetaStrategy", _strategyAddr));
        _setPendingAction(action, true, false); // buffer for adding new strategies

        emit SignalSetCashMetaStrategy(_strategyAddr);
    }
    //ok
    function setCashMetaStrategy(address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setCashMetaStrategy", _strategyAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setCashMetaStrategy(_strategyAddr);

        emit SetCashMetaStrategy(_strategyAddr);
    }
    //ok
    function signalPauseRebase() external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("pauseRebase"));
        _setPendingAction(action, false, false); // no buffer for pausing rebase

        emit SignalPauseRebase();
    }
    //ok
    function pauseRebase() external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("pauseRebase"));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).pauseRebase();

        emit PauseRebase();
    }
    //ok
    function signalUnpauseRebase() external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("unpauseRebase"));
        _setPendingAction(action, false, false); // no buffer for unpausing rebase

        emit SignalUnpauseRebase();
    }
    //ok
    function unpauseRebase() external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("unpauseRebase"));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).unpauseRebase();

        emit UnpauseRebase();
    }    
    //ok
    function signalPauseCapital() external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("pauseCapital"));
        _setPendingAction(action, false, false); // no buffer for pausing capital

        emit SignalPauseCapital();
    }
    //ok
    function pauseCapital() external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("pauseCapital"));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).pauseCapital();

        emit PauseCapital();
    }
    //ok
    function signalUnpauseCapital() external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("unpauseCapital"));
        _setPendingAction(action, false, false); // no buffer for unpausing capital

        emit SignalUnpauseCapital();
    }
    //ok
    function unpauseCapital() external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("unpauseCapital"));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).unpauseCapital();

        emit UnpauseCapital();
    }    
    //ok
    function signalTransferToken(address _target, address asset, uint256 amount) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("transferToken", _target, asset, amount));
        _setPendingAction(action, true, false); // 36h buffer for moving assets outside of vault

        emit SignalTransferToken(_target, asset, amount);
    }
    //ok
    function transferToken(address _target, address asset, uint256 amount) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("transferToken", _target, asset, amount));
        _validateAction(action);
        _clearAction(action);

        ISharedGovernable(_target).transferToken(asset, amount);

        emit TransferToken(_target, asset, amount);
    }
    //ok
    function signalWithdrawAllFromStrategy(address _strategyAddr) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("withdrawAllFromStrategy", _strategyAddr));
        _setPendingAction(action, false, false); // no buffer for moving assets inside vault

        emit SignalWithdrawAllFromStrategy(_strategyAddr);
    }
    //ok
    function withdrawAllFromStrategy(address _strategyAddr) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("withdrawAllFromStrategy", _strategyAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).withdrawAllFromStrategy(_strategyAddr);

        emit WithdrawAllFromStrategy(_strategyAddr);
    }
    //ok
    function signalWithdrawAllFromStrategies() external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("withdrawAllFromStrategies"));
        _setPendingAction(action, false, false); // no buffer for moving assets inside vault

        emit SignalWithdrawAllFromStrategies();
    }
    //ok
    function withdrawAllFromStrategies() external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("withdrawAllFromStrategies"));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).withdrawAllFromStrategies();

        emit WithdrawAllFromStrategies();
    }
    //ok
    function signalSetMintFeeBps(uint256 _newFee) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setMintFeeBps", _newFee));
        _setPendingAction(action, true, false); // 36h buffer for critical changes

        emit SignalSetMintFeeBps(_newFee);
    }
    //ok
    function setMintFeeBps(uint256 _newFee) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setMintFeeBps", _newFee));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setMintFeeBps(_newFee);

        emit SetMintFeeBps(_newFee);
    }
    //ok
    function signalSetAdminImpl(address _addr) external onlyEcosystem {
        require(_addr != address(0), "StablTimelock: invalid _addr");

        bytes32 action = keccak256(abi.encodePacked("setAdminImpl", _addr));
        _setPendingAction(action, true, false); // 36h buffer for critical changes

        emit SignalSetAdminImpl(_addr);
    }
    //ok
    function setAdminImpl(address _addr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setAdminImpl", _addr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setAdminImpl(_addr);

        emit SetAdminImpl(_addr);
    }
    //ok
    function signalClaimGovernance(address _target) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("claimGovernance", _target));
        _setPendingAction(action, false, false); // no buffer for accepting gov role

        emit SignalClaimGovernance(_target);
    }
    //ok
    function claimGovernance(address _target) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("claimGovernance", _target));
        _validateAction(action);
        _clearAction(action);

        ISharedGovernable(_target).claimGovernance();

        emit ClaimGovernance(_target);
    }
    //ok
    function signalTransferGovernance(address _target, address _addr) external onlyEcosystem {
        require(_addr != address(0), "StablTimelock: invalid _addr");

        bytes32 action = keccak256(abi.encodePacked("transferGovernance", _target, _addr));
        _setPendingAction(action, true, false); // 36h buffer for critical changes

        emit SignalTransferGovernance(_target, _addr);
    }
    //ok
    function transferGovernance(address _target, address _addr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("transferGovernance", _target, _addr));
        _validateAction(action);
        _clearAction(action);

        ISharedGovernable(_target).transferGovernance(_addr);

        emit TransferGovernance(_target, _addr);
    }

    //ok
    function signalSetFeeExempt(address _addr, bool _value) external onlyTeam {
        require(_addr != address(0), "StablTimelock: invalid _addr");

        bytes32 action = keccak256(abi.encodePacked("setFeeExempt", _addr, _value));
        _setPendingAction(action, true, true); // 24h buffer for whitelisting

        emit SignalSetFeeExempt(_addr, _value);
    }
    //ok
    function setFeeExempt(address _addr, bool _value) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setFeeExempt", _addr, _value));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setFeeExempt(_addr, _value);

        emit SetFeeExempt(_addr, _value);
    }
    //ok
    function _setPendingAction(bytes32 _action, bool _needsBuffer, bool _isLight) private {
        require(pendingActions[_action] == 0, "StablTimelock: action already signalled");

        if(_needsBuffer){
            if(!_isLight){
                pendingActions[_action] = block.timestamp + buffer;
            }else{
                pendingActions[_action] = block.timestamp + bufferLight;
            }
        }else{
            pendingActions[_action] = block.timestamp;
        }

        emit SignalPendingAction(_action);
    }
    //ok
    function _validateAction(bytes32 _action) private view {
        require(pendingActions[_action] != 0, "StablTimelock: action not signalled");
        require(pendingActions[_action] <= block.timestamp, "StablTimelock: action time not yet passed");
    }
    //ok
    function _clearAction(bytes32 _action) private {
        require(pendingActions[_action] != 0, "StablTimelock: invalid _action");
        delete pendingActions[_action];
        emit ClearAction(_action);
    }
}