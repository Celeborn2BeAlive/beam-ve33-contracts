// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.8.0;

import "./libraries/Math.sol";
import "./interfaces/IMinter.sol";
import "./interfaces/IRebaseDistributor.sol";
import "./interfaces/IEmissionToken.sol";
import "./interfaces/IEpochDistributor.sol";
import "./interfaces/IVotingEscrow.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// codifies the minting rules as per ve(3,3), abstracted from the token to support any token that allows minting

contract MinterUpgradeable is IMinter, OwnableUpgradeable {

    uint public constant PRECISION = 1000;
    uint public constant STARTING_EMISSION = 2_600_000 * 1e18; // represents a starting weekly emission of 2.6M tokens (EmissionToken has 18 decimals)
    uint public constant WEEK = 86400 * 7; // allows minting once per week (reset every Thursday 00:00 UTC)

    // Configuration, can be set by team:
    uint public EMISSION;
    uint public TAIL_EMISSION;
    uint public REBASEMAX;
    uint public teamRate;

    // Epoch state:
    bool public isFirstMint;
    uint public weekly; // track the amount of tokens that was minted last epoch flip
    uint public active_period; // track the timestamp of the start of the current epoch

    // Admin addresses:
    address internal _initializer;
    address public team;
    address public pendingTeam;

    // External contracts the Minter interact with:
    IEmissionToken public _emissionToken;
    IEpochDistributor public _epochDistributor;
    IVotingEscrow public _ve;
    IRebaseDistributor public _rebase_distributor;

    event Mint(address indexed sender, uint weekly, uint circulating_supply, uint circulating_emission);

    constructor() {}

    function initialize(
        address __epoch_distributor, // the farming distribution system
        address __ve, // the ve(3,3) system that will be locked into
        address __rebase_distributor // the distribution system that ensures users aren't diluted
    ) initializer public {
        __Ownable_init();

        _initializer = msg.sender;
        team = msg.sender;

        teamRate = 25; // 25 bps = 2.5%

        EMISSION = 980; // 2% decay
        TAIL_EMISSION = 2; // 0.2% weekly increase after tail emissions starts => ~2.8% annual inflation
        REBASEMAX = 300; // 30% max to rebase

        _emissionToken = IEmissionToken(IVotingEscrow(__ve).token());
        _epochDistributor = IEpochDistributor(__epoch_distributor);
        _ve = IVotingEscrow(__ve);
        _rebase_distributor = IRebaseDistributor(__rebase_distributor);

        weekly = STARTING_EMISSION;
        isFirstMint = true;
    }

    // Should be called once by the deployer address to initialize the Minter
    // Allow minter.update_period() to mint new emissions starting next Thursday
    function _initialize() external {
        require(_initializer == msg.sender);
        _initializer = address(0);
        active_period = ((block.timestamp) / WEEK) * WEEK;
    }

    function setTeam(address _team) external {
        require(msg.sender == team, "not team");
        pendingTeam = _team;
    }

    function acceptTeam() external {
        require(msg.sender == pendingTeam, "not pending team");
        team = pendingTeam;
    }

    function setEpochDistributor(address __epochDistributor) external {
        require(__epochDistributor != address(0));
        require(msg.sender == team, "not team");
        _epochDistributor = IEpochDistributor(__epochDistributor);
    }

    function setTeamRate(uint _teamRate) external {
        require(msg.sender == team, "not team");
        require(_teamRate <= PRECISION, "rate too high");
        teamRate = _teamRate;
    }

    function setEmission(uint _emission) external {
        require(msg.sender == team, "not team");
        require(_emission <= PRECISION, "rate too high");
        EMISSION = _emission;
    }

    function setTailEmission(uint _tailEmission) external {
        require(msg.sender == team, "not team");
        require(_tailEmission <= PRECISION, "rate too high");
        TAIL_EMISSION = _tailEmission;
    }


    function setRebase(uint _rebase) external {
        require(msg.sender == team, "not team");
        require(_rebase <= PRECISION, "rate too high");
        REBASEMAX = _rebase;
    }

    // calculate circulating supply as total token supply - locked supply
    function circulating_supply() public view returns (uint) {
        return _emissionToken.totalSupply() - _emissionToken.balanceOf(address(_ve));
    }

    // emission calculation is 1% of available supply to mint adjusted by circulating / total supply
    function calculate_emission() public view returns (uint) {
        return (weekly * EMISSION) / PRECISION;
    }

    // weekly emission takes the max of calculated (aka target) emission versus circulating tail end emission
    function weekly_emission() public view returns (uint) {
        return Math.max(calculate_emission(), circulating_emission());
    }

    // calculates tail end (infinity) emissions as 0.2% of total supply
    function circulating_emission() public view returns (uint) {
        return (circulating_supply() * TAIL_EMISSION) / PRECISION;
    }

    // calculate inflation and adjust ve balances accordingly
    function calculate_rebase(uint _weeklyMint) public view returns (uint) {
        uint _veTotal = _emissionToken.balanceOf(address(_ve));
        uint _emissionTokenTotal = _emissionToken.totalSupply();

        uint lockedShare = (_veTotal) * PRECISION  / _emissionTokenTotal;
        if(lockedShare >= REBASEMAX){
            return _weeklyMint * REBASEMAX / PRECISION;
        } else {
            return _weeklyMint * lockedShare / PRECISION;
        }
    }

    // @inheritdoc IMinter
    function update_period() external returns (uint) {
        uint _period = active_period;
        if (block.timestamp >= _period + WEEK && _initializer == address(0)) { // only trigger if new week
            _period = (block.timestamp / WEEK) * WEEK;
            active_period = _period;

            if(!isFirstMint){
                weekly = weekly_emission();
            } else {
                isFirstMint = false;
            }

            uint _rebase = calculate_rebase(weekly);
            uint _teamEmissions = weekly * teamRate / PRECISION;
            uint _required = weekly;

            uint _gauge = weekly - _rebase - _teamEmissions;

            uint _balanceOf = _emissionToken.balanceOf(address(this));
            if (_balanceOf < _required) {
                _emissionToken.mint(address(this), _required - _balanceOf);
            }

            require(_emissionToken.transfer(team, _teamEmissions));

            require(_emissionToken.transfer(address(_rebase_distributor), _rebase));
            _rebase_distributor.checkpoint_token(); // checkpoint token balance that was just minted in rewards distributor
            _rebase_distributor.checkpoint_total_supply(); // checkpoint supply

            _emissionToken.approve(address(_epochDistributor), _gauge);
            _epochDistributor.notifyRewardAmount(_gauge);

            emit Mint(msg.sender, weekly, circulating_supply(), circulating_emission());
        }
        return _period;
    }

    // @inheritdoc IMinter
    function check_update_period() external view returns(bool) {
        uint _period = active_period;
        return (block.timestamp >= _period + WEEK && _initializer == address(0));
    }

    // @inheritdoc IMinter
    function block_period() external view returns(uint) {
        return _block_period();
    }

    // @inheritdoc IMinter
    function is_period_updated() external view returns(bool) {
        return active_period == _block_period();
    }

    function _block_period() internal view returns(uint) {
        return (block.timestamp / WEEK) * WEEK;
    }

    function setRewardDistributor(address _rebaseDistro) external {
        require(msg.sender == team);
        _rebase_distributor = IRebaseDistributor(_rebaseDistro);
    }
}
