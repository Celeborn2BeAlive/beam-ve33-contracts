// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IVault {
    function transferGovernance(address _newGovernor) external;
    function claimGovernance() external;
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

contract StablTimelockVault {

    address public cashVault;
    address public ecosystemMultisig;
    address public teamMultisig;

    uint256 public constant MAX_BUFFER = 5 days;
    uint256 public buffer = 36 hours;

    mapping (bytes32 => uint256) public pendingActions;

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

    event SignalTransferToken(address asset, uint256 amount);
    event TransferToken(address asset, uint256 amount);

    event SignalWithdrawAllFromStrategy(address strategyAddr);
    event WithdrawAllFromStrategy(address strategyAddr);

    event SignalWithdrawAllFromStrategies();
    event WithdrawAllFromStrategies();

    event SignalSetMintFeeBps(uint256 newFee);
    event SetMintFeeBps(uint256 newFee);

    event SignalSetAdminImpl(address newImpl);
    event SetAdminImpl(address newImpl);

    event SignalClaimGovernance();
    event ClaimGovernance();

    event SignalTransferGovernance(address owner);
    event TransferGovernance(address owner);

    event SignalSetFeeExempt(address who, bool val);
    event SetFeeExempt(address who, bool val);

    event SignalPendingAction(bytes32 action);
    event ClearAction(bytes32 action);

    constructor(/*address _ecosystem, address _team, address _vault*/){
        //require(_ecosystem != address(0), "null1");
        //require(_team != address(0), "null2");
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

    function setBuffer(uint256 _buffer) external onlyTeam {
        require(_buffer <= MAX_BUFFER, "StablTimelock: invalid buffer");
        require(_buffer > buffer, "StablTimelock: buffer cannot be decreased");
        buffer = _buffer;
    }

    function signalSetPriceProvider(address _newPriceProvider) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setPriceProvider", _newPriceProvider));
        _setPendingAction(action, true); // buffer for critical actions

        emit SignalSetPriceProvider(_newPriceProvider);
    }

    function setPriceProvider(address _newPriceProvider) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setPriceProvider", _newPriceProvider));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setPriceProvider(_newPriceProvider);

        emit SetPriceProvider(_newPriceProvider);
    }

    function signalSetVaultBuffer(uint256 _newVaultBuffer) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setVaultBuffer", _newVaultBuffer));
        _setPendingAction(action, true); // buffer for critical actions

        emit SignalSetVaultBuffer(_newVaultBuffer);
    }

    function setVaultBuffer(uint256 _newVaultBuffer) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setVaultBuffer", _newVaultBuffer));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setVaultBuffer(_newVaultBuffer);

        emit SetVaultBuffer(_newVaultBuffer);
    }

    function signalSetAutoAllocateThreshold(uint256 _newThreshold) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setAutoAllocateThreshold", _newThreshold));
        _setPendingAction(action, true); // buffer for critical actions

        emit SignalSetAutoAllocateThreshold(_newThreshold);
    }

    function setAutoAllocateThreshold(uint256 _newThreshold) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setAutoAllocateThreshold", _newThreshold));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setAutoAllocateThreshold(_newThreshold);

        emit SetAutoAllocateThreshold(_newThreshold);
    }

    function signalSetRebaseThreshold(uint256 _newThreshold) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setRebaseThreshold", _newThreshold));
        _setPendingAction(action, true); // buffer for critical actions

        emit SignalSetRebaseThreshold(_newThreshold);
    }

    function setRebaseThreshold(uint256 _newThreshold) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setRebaseThreshold", _newThreshold));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setRebaseThreshold(_newThreshold);

        emit SetRebaseThreshold(_newThreshold);
    }

    function signalSetStrategistAddr(address _strategistAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setStrategistAddr", _strategistAddr));
        _setPendingAction(action, true); // buffer for critical actions

        emit SignalSetStrategistAddr(_strategistAddr);
    }

    function setStrategistAddr(address _strategistAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setStrategistAddr", _strategistAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setStrategistAddr(_strategistAddr);

        emit SetStrategistAddr(_strategistAddr);
    }

    function signalSetAssetDefaultStrategy(address _assetAddr, address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setAssetDefaultStrategy", _assetAddr, _strategyAddr));
        _setPendingAction(action, true); // buffer for critical actions

        emit SignalSetAssetDefaultStrategy(_assetAddr, _strategyAddr);
    }

    function setAssetDefaultStrategy(address _assetAddr, address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setAssetDefaultStrategy", _assetAddr, _strategyAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setAssetDefaultStrategy(_assetAddr, _strategyAddr);

        emit SetAssetDefaultStrategy(_assetAddr, _strategyAddr);
    }

    function signalSupportAsset(address _assetAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("supportAsset", _assetAddr));
        _setPendingAction(action, true); // buffer for critical actions

        emit SignalSupportAsset(_assetAddr);
    }

    function supportAsset(address _assetAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("supportAsset", _assetAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).supportAsset(_assetAddr);

        emit SupportAsset(_assetAddr);
    }

    function signalApproveStrategy(address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("approveStrategy", _strategyAddr));
        _setPendingAction(action, true); // buffer for removing old strategies

        emit SignalApproveStrategy(_strategyAddr);
    }

    function approveStrategy(address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("approveStrategy", _strategyAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).approveStrategy(_strategyAddr);

        emit ApproveStrategy(_strategyAddr);
    }

    function signalRemoveStrategy(address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("removeStrategy", _strategyAddr));
        _setPendingAction(action, true); // buffer for removing old strategies

        emit SignalRemoveStrategy(_strategyAddr);
    }

    function removeStrategy(address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("removeStrategy", _strategyAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).removeStrategy(_strategyAddr);

        emit RemoveStrategy(_strategyAddr);
    }

    function signalReallocate(address _strategyFromAddress, address _strategyToAddress, address[] calldata _assets, uint256[] calldata _amounts) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("reallocate", _strategyFromAddress, _strategyToAddress, _assets, _amounts));
        _setPendingAction(action, false); // no buffer for moving funds between strategies

        emit SignalReallocate(_strategyFromAddress, _strategyToAddress, _assets, _amounts);
    }

    function reallocate(address _strategyFromAddress, address _strategyToAddress, address[] calldata _assets, uint256[] calldata _amounts) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("reallocate", _strategyFromAddress, _strategyToAddress, _assets, _amounts));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).reallocate(_strategyFromAddress, _strategyToAddress, _assets, _amounts);

        emit Reallocate(_strategyFromAddress, _strategyToAddress, _assets, _amounts);
    }

    function signalDepositToStrategy(address _strategyToAddress, address[] calldata _assets, uint256[] calldata _amounts) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("depositToStrategy", _strategyToAddress, _assets, _amounts));
        _setPendingAction(action, false); // no buffer for moving funds between strategies

        emit SignalDepositToStrategy(_strategyToAddress, _assets, _amounts);
    }

    function depositToStrategy(address _strategyToAddress, address[] calldata _assets, uint256[] calldata _amounts) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("depositToStrategy", _strategyToAddress, _assets, _amounts));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).depositToStrategy(_strategyToAddress, _assets, _amounts);

        emit DepositToStrategy(_strategyToAddress, _assets, _amounts);
    }

    function signalWithdrawFromStrategy(address _strategyFromAddress, address[] calldata _assets, uint256[] calldata _amounts) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("withdrawFromStrategy", _strategyFromAddress, _assets, _amounts));
        _setPendingAction(action, true); // no buffer for moving funds between strategies

        emit SignalWithdrawFromStrategy(_strategyFromAddress, _assets, _amounts);
    }

    function withdrawFromStrategy(address _strategyFromAddress, address[] calldata _assets, uint256[] calldata _amounts) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("withdrawFromStrategy", _strategyFromAddress, _assets, _amounts));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).withdrawFromStrategy(_strategyFromAddress, _assets, _amounts);

        emit WithdrawFromStrategy(_strategyFromAddress, _assets, _amounts);
    }

    function signalSetMaxSupplyDiff(uint256 _newDiff) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setMaxSupplyDiff", _newDiff));
        _setPendingAction(action, true); // 36h buffer for critical changes

        emit SignalSetMaxSupplyDiff(_newDiff);
    }

    function setMaxSupplyDiff(uint256 _newDiff) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setMaxSupplyDiff", _newDiff));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setMaxSupplyDiff(_newDiff);

        emit SetMaxSupplyDiff(_newDiff);
    }

    function signalSetDepositFeeAddress(address _depositFeeAddr) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setDepositFeeAddress", _depositFeeAddr));
        _setPendingAction(action, true); // buffer for adding new strategies

        emit SignalSetDepositFeeAddress(_depositFeeAddr);
    }

    function setDepositFeeAddress(address _depositFeeAddr) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setDepositFeeAddress", _depositFeeAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setDepositFeeAddress(_depositFeeAddr);

        emit SetDepositFeeAddress(_depositFeeAddr);
    }

    function signalSetWithdrawFeeAddress(address _withdrawFeeAddr) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setWithdrawFeeAddress", _withdrawFeeAddr));
        _setPendingAction(action, true); // buffer for adding new strategies

        emit SignalSetWithdrawFeeAddress(_withdrawFeeAddr);
    }

    function setWithdrawFeeAddress(address _withdrawFeeAddr) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setWithdrawFeeAddress", _withdrawFeeAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setWithdrawFeeAddress(_withdrawFeeAddr);

        emit SetWithdrawFeeAddress(_withdrawFeeAddr);
    }

    function signalSetPerformanceFeeAddress(address _performanceFeeAddr) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setPerformanceFeeAddress", _performanceFeeAddr));
        _setPendingAction(action, true); // buffer for adding new strategies

        emit SignalSetPerformanceFeeAddress(_performanceFeeAddr);
    }

    function setPerformanceFeeAddress(address _performanceFeeAddr) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setPerformanceFeeAddress", _performanceFeeAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setPerformanceFeeAddress(_performanceFeeAddr);

        emit SetPerformanceFeeAddress(_performanceFeeAddr);
    }

    function signalSetAutobribeAddress(address _autobribeAddr) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setAutobribeAddress", _autobribeAddr));
        _setPendingAction(action, false);

        emit SignalSetAutobribeAddress(_autobribeAddr);
    }

    function setAutobribeAddress(address _autobribeAddr) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setAutobribeAddress", _autobribeAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setAutobribeAddress(_autobribeAddr);

        emit SetAutobribeAddress(_autobribeAddr);
    }

    function signalSetRedeemFeeBps(uint256 _newFee) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setRedeemFeeBps", _newFee));
        _setPendingAction(action, true); // 36h buffer for critical changes

        emit SignalSetRedeemFeeBps(_newFee);
    }

    function setRedeemFeeBps(uint256 _newFee) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setRedeemFeeBps", _newFee));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setRedeemFeeBps(_newFee);

        emit SetRedeemFeeBps(_newFee);
    }

    function signalSetTrusteeFeeBps(uint256 _newFee) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setTrusteeFeeBps", _newFee));
        _setPendingAction(action, true); // 36h buffer for critical changes

        emit SignalSetTrusteeFeeBps(_newFee);
    }

    function setTrusteeFeeBps(uint256 _newFee) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setTrusteeFeeBps", _newFee));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setTrusteeFeeBps(_newFee);

        emit SetTrusteeFeeBps(_newFee);
    }

    function signalSetCashMetaStrategy(address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setCashMetaStrategy", _strategyAddr));
        _setPendingAction(action, true); // buffer for adding new strategies

        emit SignalSetCashMetaStrategy(_strategyAddr);
    }

    function setCashMetaStrategy(address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setCashMetaStrategy", _strategyAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setCashMetaStrategy(_strategyAddr);

        emit SetCashMetaStrategy(_strategyAddr);
    }

    function signalPauseRebase() external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("pauseRebase"));
        _setPendingAction(action, false); // no buffer for pausing rebase

        emit SignalPauseRebase();
    }

    function pauseRebase() external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("pauseRebase"));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).pauseRebase();

        emit PauseRebase();
    }

    function signalUnpauseRebase() external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("unpauseRebase"));
        _setPendingAction(action, false); // no buffer for unpausing rebase

        emit SignalUnpauseRebase();
    }

    function unpauseRebase() external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("unpauseRebase"));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).unpauseRebase();

        emit UnpauseRebase();
    }    

    function signalPauseCapital() external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("pauseCapital"));
        _setPendingAction(action, false); // no buffer for pausing capital

        emit SignalPauseCapital();
    }

    function pauseCapital() external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("pauseCapital"));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).pauseCapital();

        emit PauseCapital();
    }

    function signalUnpauseCapital() external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("unpauseCapital"));
        _setPendingAction(action, false); // no buffer for unpausing capital

        emit SignalUnpauseCapital();
    }

    function unpauseCapital() external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("unpauseCapital"));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).unpauseCapital();

        emit UnpauseCapital();
    }    

    function signalTransferToken(address asset, uint256 amount) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("transferToken", asset, amount));
        _setPendingAction(action, true); // buffer for moving assets outside of vault

        emit SignalTransferToken(asset, amount);
    }

    function transferToken(address asset, uint256 amount) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("transferToken", asset, amount));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).transferToken(asset, amount);

        emit TransferToken(asset, amount);
    }

    function signalWithdrawAllFromStrategy(address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("withdrawAllFromStrategy", _strategyAddr));
        _setPendingAction(action, false); // no buffer for moving assets inside vault

        emit SignalWithdrawAllFromStrategy(_strategyAddr);
    }

    function withdrawAllFromStrategy(address _strategyAddr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("withdrawAllFromStrategy", _strategyAddr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).withdrawAllFromStrategy(_strategyAddr);

        emit WithdrawAllFromStrategy(_strategyAddr);
    }

    function signalWithdrawAllFromStrategies() external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("withdrawAllFromStrategies"));
        _setPendingAction(action, false); // no buffer for moving assets inside vault

        emit SignalWithdrawAllFromStrategies();
    }

    function withdrawAllFromStrategies() external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("withdrawAllFromStrategies"));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).withdrawAllFromStrategies();

        emit WithdrawAllFromStrategies();
    }

    function signalSetMintFeeBps(uint256 _newFee) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setMintFeeBps", _newFee));
        _setPendingAction(action, true); // 36h buffer for critical changes

        emit SignalSetMintFeeBps(_newFee);
    }

    function setMintFeeBps(uint256 _newFee) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setMintFeeBps", _newFee));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setMintFeeBps(_newFee);

        emit SetMintFeeBps(_newFee);
    }

    function signalSetAdminImpl(address _addr) external onlyEcosystem {
        require(_addr != address(0), "StablTimelock: invalid _addr");

        bytes32 action = keccak256(abi.encodePacked("setAdminImpl", _addr));
        _setPendingAction(action, true); // 36h buffer for critical changes

        emit SignalSetAdminImpl(_addr);
    }

    function setAdminImpl(address _addr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("setAdminImpl", _addr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setAdminImpl(_addr);

        emit SetAdminImpl(_addr);
    }

    function signalClaimGovernance() external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("claimGovernance"));
        _setPendingAction(action, false); // no buffer for accepting gov role

        emit SignalClaimGovernance();
    }

    function claimGovernance() external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("claimGovernance"));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).claimGovernance();

        emit ClaimGovernance();
    }

    function signalTransferGovernance(address _addr) external onlyEcosystem {
        require(_addr != address(0), "StablTimelock: invalid _addr");

        bytes32 action = keccak256(abi.encodePacked("transferGovernance", _addr));
        _setPendingAction(action, true); // 36h buffer for critical changes

        emit SignalTransferGovernance(_addr);
    }

    function transferGovernance(address _addr) external onlyEcosystem {
        bytes32 action = keccak256(abi.encodePacked("transferGovernance", _addr));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).transferGovernance(_addr);

        emit TransferGovernance(_addr);
    }

    function signalSetFeeExempt(address _addr, bool _value) external onlyTeam {
        require(_addr != address(0), "StablTimelock: invalid _addr");

        bytes32 action = keccak256(abi.encodePacked("setFeeExempt", _addr, _value));
        _setPendingAction(action, true); // 36h buffer for fee related changes

        emit SignalSetFeeExempt(_addr, _value);
    }

    function setFeeExempt(address _addr, bool _value) external onlyTeam {
        bytes32 action = keccak256(abi.encodePacked("setFeeExempt", _addr, _value));
        _validateAction(action);
        _clearAction(action);

        IVault(cashVault).setFeeExempt(_addr, _value);

        emit SetFeeExempt(_addr, _value);
    }

    function _setPendingAction(bytes32 _action, bool _needsBuffer) private {
        require(pendingActions[_action] == 0, "StablTimelock: action already signalled");

        if(_needsBuffer){
            pendingActions[_action] = block.timestamp + buffer;
        }else{
            pendingActions[_action] = block.timestamp;
        }

        emit SignalPendingAction(_action);
    }

    function _validateAction(bytes32 _action) private view {
        require(pendingActions[_action] != 0, "StablTimelock: action not signalled");
        require(pendingActions[_action] <= block.timestamp, "StablTimelock: action time not yet passed");
    }

    function _clearAction(bytes32 _action) private {
        require(pendingActions[_action] != 0, "StablTimelock: invalid _action");
        delete pendingActions[_action];
        emit ClearAction(_action);
    }
}