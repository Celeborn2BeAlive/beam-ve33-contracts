// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./Gauge.sol";
import "./algebra/GaugeEternalFarming.sol";
import "./interfaces/IGauge.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface IGaugeEternalFarming {
    function setIncentiveMaker(address _incentiveMaker) external;
}

contract GaugeFactory is AccessControl {

    /// @notice Role to manage GaugeFactory
    bytes32 public constant GAUGE_FACTORY_MANAGER_ROLE = keccak256("GAUGE_FACTORY_MANAGER_ROLE");

    /// @notice Role to create gauge contracts
    bytes32 public constant CREATE_ROLE = keccak256("CREATE_ROLE");

    /// @notice Role to create gauge contracts
    bytes32 public constant CLAIMER_ROLE = keccak256("CLAIMER_ROLE");

    /// @notice Global factory that creates the gauges
    address public globalFactory;

    constructor(address _globalFactory) {
        if(_globalFactory != address(0)){
            globalFactory = _globalFactory;
            _grantRole(CREATE_ROLE, globalFactory);
            _grantRole(GAUGE_FACTORY_MANAGER_ROLE, globalFactory);
        }
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GAUGE_FACTORY_MANAGER_ROLE, msg.sender);
        _grantRole(CREATE_ROLE, msg.sender);
    }


    /// @notice Create a Gauge contract
    /// @param _rewardtokens    the reward tokens
    /// @param _token           the underlying LP strategy
    /// @param _distribution    the reward tokens distribution address
    /// @param _feeVault        the fee vault where to claim fees
    /// @param _votingIncentives the voting incentives where to send fees
    /// @param _claimer         the claimer contract to manage multiple claims
    /// @param isWeighted       the boolean to define if it's weighted pool
    function createGauge(address[] memory _rewardtokens,address _token,address _distribution, address _feeVault, address _votingIncentives, address _claimer, bool isWeighted) external onlyRole(CREATE_ROLE) returns(address){
        address gauge = address ( new Gauge(_rewardtokens, _token, _distribution, _feeVault, _votingIncentives, _claimer, isWeighted) );
        emit CreateGauge(_token, gauge);
        return gauge;
    }

    /// @notice Create an Eternal Gauge contract
    /// @param _pool Address of the pool
    /// @param _distribution Address of the distribution contract
    /// @param _feeVault Address of the fee vault
    /// @param _votingIncentives Address of the voting incentives contract
    /// @param _incentiveMaker Address of the farming contract
    /// @return Address of the newly created gauge
    function createEternalGauge(address _pool, address _distribution, address _feeVault, address _votingIncentives, address _incentiveMaker) external onlyRole(CREATE_ROLE) returns(address){
        address gauge = address ( new GaugeEternalFarming(_pool, _distribution, _feeVault, _votingIncentives, _incentiveMaker) );
        emit CreateGauge(_pool, gauge);
        return gauge;
    }



    /// @notice Set a new Global factory address
    function setGlobalFactory(address _gf) external onlyRole(GAUGE_FACTORY_MANAGER_ROLE) {
        require(_gf != address(0), 'GF: ZeroAddress');
        globalFactory = _gf;
        _grantRole(CREATE_ROLE, _gf);
        _grantRole(GAUGE_FACTORY_MANAGER_ROLE, _gf);
        emit SetGlobalFactory(_gf);
    }


    /*
    -----------------------------
            Gauge Management
    -----------------------------
    */

    /// @notice Automation call to claim gauge fees
    /// @param _gauges array of gauges
    function claimFees(address[] calldata _gauges) external onlyRole(CLAIMER_ROLE) {
        uint i;
        for ( i ; i < _gauges.length; i++){
            IGauge(_gauges[i]).claimFees();
        }
    }

    /// @notice Activate the emergency mode for gauges
    /// @param _gauges array of gauges
    function activateEmergencyMode( address[] calldata _gauges) external onlyRole(GAUGE_FACTORY_MANAGER_ROLE) {
        uint i;
        for ( i ; i < _gauges.length; i++){
            IGauge(_gauges[i]).activateEmergencyMode();
        }
    }

    /// @notice Deactivate the emergency mode for gauges
    /// @param _gauges array of gauges
    function stopEmergencyMode( address[] calldata _gauges) external onlyRole(GAUGE_FACTORY_MANAGER_ROLE) {
        uint i;
        for ( i ; i < _gauges.length; i++){
            IGauge(_gauges[i]).stopEmergencyMode();
        }
    }

    /// @notice Pause gauge contracts
    /// @param _gauges     array of gauge contract
    function pauseGauge(address[] calldata _gauges) external onlyRole(GAUGE_FACTORY_MANAGER_ROLE) {
        uint i;
        for ( i ; i < _gauges.length; i++){
            IGauge(_gauges[i]).pause(true);
        }
    }

    /// @notice Unpause gauge contracts
    /// @param _gauges     array of gauge contract
    function unpauseGauge(address[] calldata _gauges) external onlyRole(GAUGE_FACTORY_MANAGER_ROLE) {
        uint i;
        for ( i ; i < _gauges.length; i++){
            IGauge(_gauges[i]).pause(false);
        }
    }

    /// @notice Set a new distribution address for gauges
    /// @param _gauges  array of gauges
    /// @param distro   distribution address
    function setDistribution(address[] calldata _gauges,  address distro) external onlyRole(GAUGE_FACTORY_MANAGER_ROLE) {
        uint i;
        for ( i ; i < _gauges.length; i++){
            IGauge(_gauges[i]).setDistribution(distro);
        }
    }

    /// @notice Set a new FeeVault address for gauges
    /// @param _gauges  array of gauges
    /// @param feevault vault for the underlying lps fees
    function setFeeVault(address[] calldata _gauges,  address[] calldata feevault) external onlyRole(GAUGE_FACTORY_MANAGER_ROLE) {
        require(_gauges.length == feevault.length, "Length mismatch");
        uint i;
        for ( i ; i < _gauges.length; i++){
            IGauge(_gauges[i]).setFeeVault(feevault[i]);
        }
    }

    /// @notice Add a new reward Token in the gauge
    /// @param _gauge Gauge address
    /// @param _token token address to add as reward
    function addRewardToken(address _gauge, address _token) external onlyRole(GAUGE_FACTORY_MANAGER_ROLE) {
        IGauge(_gauge).addRewardToken(_token);
    }

    /// @notice Add a new reward Token in the gauges
    /// @param _gauges array of gauges address
    /// @param _token token address to add as reward
    function addRewardToken(address[] calldata _gauges, address _token) external onlyRole(GAUGE_FACTORY_MANAGER_ROLE) {
        uint i;
        for ( i ; i < _gauges.length; i++){
            IGauge(_gauges[i]).addRewardToken(_token);
        }
    }

    /// @notice Remove a reward Token from the gauges
    /// @param gauge Gauge address
    /// @param _token token address to remove from rewards
    function removeRewardToken(address gauge, address _token) external onlyRole(GAUGE_FACTORY_MANAGER_ROLE) {
        IGauge(gauge).removeRewardToken(_token);
    }


    /// @notice Set a new Voting Incentives address in the gauge
    /// @param _gauges  array of gauges address
    /// @param _vi      array of voting incentives addresses
    function setVotingIncentives(address[] calldata _gauges,  address[] calldata _vi) external onlyRole(GAUGE_FACTORY_MANAGER_ROLE) {
        require(_gauges.length == _vi.length);
        uint i;
        for ( i ; i < _gauges.length; i++){
            IGauge(_gauges[i]).setVotingIncentives(_vi[i]);
        }
    }

    /// @notice Set a new Voting Incentives address in a gauge
    /// @param _gauges  gauge address
    /// @param _vi      voting incentives addresses
    function setVotingIncentives(address _gauges,  address _vi) external onlyRole(GAUGE_FACTORY_MANAGER_ROLE) {
        IGauge(_gauges).setVotingIncentives(_vi);
    }

    /// @notice Set a new claimer in the gauges
    /// @param claimer  new claimer address
    /// @param _gauges  array of gauges address
    function setClaimer(address claimer, address[] calldata _gauges) external onlyRole(GAUGE_FACTORY_MANAGER_ROLE) {
        uint i;
        for ( i ; i < _gauges.length; i++){
            IGauge(_gauges[i]).setClaimer(claimer);
        }
    }

    /// @notice Set a new incentive maker in the gauges
    /// @param _gauges  array of gauges address
    /// @param _incentiveMaker  incentive maker address
    function setIncentiveMaker(address[] calldata _gauges,  address _incentiveMaker) external onlyRole(GAUGE_FACTORY_MANAGER_ROLE) {
        uint i;
        for ( i ; i < _gauges.length; i++){
            IGaugeEternalFarming(_gauges[i]).setIncentiveMaker(_incentiveMaker);
        }
    }

    // Events
    event CreateGauge(address indexed strategy, address indexed gauge);
    event SetGlobalFactory(address indexed globalfactory);

}
