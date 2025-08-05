// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./VotingIncentives.sol";
import "./interfaces/IVotingIncentives.sol";
import "./interfaces/IVotingIncentivesFactory.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract VotingIncentivesFactory is AccessControl, IVotingIncentivesFactory {

    /// @notice Role to manage VotingIncentivesFactory
    bytes32 public constant VOTING_INCENTIVES_FACTORY_MANAGER_ROLE = keccak256("VOTING_INCENTIVES_FACTORY_MANAGER_ROLE");

    /// @notice Role to create voting incentives contracts
    bytes32 public constant CREATE_ROLE = keccak256("CREATE_ROLE");


    /// @dev The last voting incentives contract deployed
    address public last_votingIncentives;
    /// @dev The global factory that creates the voting incentives contracts
    address public globalFactory;
    /// @dev the list of voting incentives contracts
    address[] internal _votingIncentives;
    /// @dev the list of deafult reward tokens for external incentives
    address[] public defaultRewardToken;

    constructor(address _globalFactory, address[] memory defaultTokens) {
        if(_globalFactory != address(0)){
            globalFactory = _globalFactory;
            _grantRole(CREATE_ROLE, globalFactory);
            _grantRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE, globalFactory);
        }

        //VotingIncetives default tokens
        uint i;
        for(; i < defaultTokens.length; i++){
            defaultRewardToken.push(defaultTokens[i]);
        }

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE, msg.sender);
        _grantRole(CREATE_ROLE, msg.sender);

    }


    /// @notice create a votingIncentives contract
    /// @param _token0  the token0 of the LP pair
    /// @param _token1  the token1 of the LP pair
    /// @param voter    the voter contract address
    /// @param gauge    the gauge where to stake LP tokens
    /// @param claimer  the claim contract that allows multiple claims
    /// @dev    _owner must be thenaTeamMultisig
    function createVotingIncentives(address _token0, address _token1, address voter, address gauge, address claimer) external onlyRole(CREATE_ROLE) returns (address) {

        if(voter == address(0)) revert AddressZero();
        if(gauge == address(0)) revert AddressZero();
        if(claimer == address(0)) revert AddressZero();

        VotingIncentives vi = new VotingIncentives(address(this), voter, gauge, claimer);

        if(_token0 != address(0)) vi.addReward(_token0);
        if(_token1 != address(0)) vi.addReward(_token1);

        vi.addRewards(defaultRewardToken);

        last_votingIncentives = address(vi);
        _votingIncentives.push(last_votingIncentives);

        emit CreateVotingIncentives(gauge, last_votingIncentives);

        return last_votingIncentives;
    }

    /* -----------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
                                    VIEW
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    ----------------------------------------------------------------------------- */

    /// @notice Read all voting incentives contract deployed
    function votingIncentives() external view returns(address[] memory){
        return _votingIncentives;
    }

    /* -----------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
                                    ONLY ALLOWED
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    ----------------------------------------------------------------------------- */

    /// @notice set a new global factory
    function setGlobalFactory(address _gf) external onlyRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE) {
        require(_gf != address(0));
        _grantRole(CREATE_ROLE, _gf);
        _grantRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE, _gf);
        globalFactory = _gf;
    }


    /// @notice set the VotingIncetives factory permission registry
    /// @param _token add a new token as defaultRewardtoken
    function pushDefaultRewardToken(address _token) external onlyRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE) {
        require(_token != address(0));
        defaultRewardToken.push(_token);
    }


    /// @notice set the VotingIncetives factory permission registry
    /// @param _token   remove a token from defaultRewardtoken list
    function removeDefaultRewardToken(address _token) external onlyRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE) {
        require(_token != address(0));
        uint i;
        for(i; i < defaultRewardToken.length; i++){
            if(defaultRewardToken[i] == _token){
                defaultRewardToken[i] = defaultRewardToken[defaultRewardToken.length -1];
                defaultRewardToken.pop();
                break;
            }
        }
    }


    /// @notice Add a reward token to a given VotingIncetives
    /// @param _token   token to add as reward token
    /// @param _vi     voting incentives contract
    function addRewardToVotingIncetives(address _token, address _vi) external onlyRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE) {
        IVotingIncentives(_vi).addReward(_token);
    }

    /// @notice Add multiple reward token to a given VotingIncetives
    /// @param _token   array of tokens to add as reward token
    /// @param _vi     voting incentives contract
    function addRewardsToVotingIncetives(address[] calldata _token, address _vi) external onlyRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE) {
        IVotingIncentives(_vi).addRewards(_token);
    }

    /// @notice Add a reward token to a given VotingIncetives
    /// @param _token   token to add as reward token
    /// @param _vi     voting incentives contract
    function removeRewardToVotingIncetives(address _token, address _vi) external onlyRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE) {
        IVotingIncentives(_vi).removeReward(_token);
    }

    /// @notice Add a reward token to a given VotingIncetives
    /// @param _token   token to add as reward token
    /// @param _vi     voting incentives contract
    function removeRewardsToVotingIncetives(address[] calldata _token, address _vi) external onlyRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE) {
        IVotingIncentives(_vi).removeRewards(_token);
    }



    /// @notice set a new voter in given VotingIncetivess
    /// @param _vi     array of voting incentives contract
    /// @param _voter  new voter contract
    function setVotingIncetivesVoter(address[] calldata _vi, address _voter) external onlyRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE) {
        uint i;
        for(i; i< _vi.length; i++){
            IVotingIncentives(_vi[i]).setVoter(_voter);
        }
    }

    /// @notice set a new minter in given VotingIncetivess
    /// @param _vi     array of voting incentives contract
    /// @param _minter  new minter contract
    function setVotingIncetivesMinter(address[] calldata _vi, address _minter) external onlyRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE) {
        uint i;
        for(i; i< _vi.length; i++){
            IVotingIncentives(_vi[i]).setMinter(_minter);
        }
    }

    /// @notice set a new owner in given VotingIncetivess
    /// @param _vi     array of voting incentives contract
    /// @param _owner  new owner address
    function setVotingIncetivesOwner(address[] calldata _vi, address _owner) external onlyRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE) {
        uint i;
        for(i; i< _vi.length; i++){
            IVotingIncentives(_vi[i]).setOwner(_owner);
        }
    }

    /// @notice Set a new claimer in the VotingIncetivess
    /// @param _vi     array of voting incentives contract
    /// @param claimer  new claimer contract
    function setClaimer(address claimer, address[] calldata _vi) external onlyRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE) {
        uint i;
        for ( i ; i < _vi.length; i++){
            IVotingIncentives(_vi[i]).setClaimer(claimer);
        }
    }

    /// @notice recover an ERC20 from VotingIncetives contracts.
    /// @param _vi      array of voting incentives contract
    /// @param _tokens  array of tokens to recover
    /// @param _amounts array of amounts to recover
    function emergencyRecoverERC20(address[] calldata _vi, address[] calldata _tokens, uint[] calldata _amounts) external onlyRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE) {
        require(_vi.length == _tokens.length, 'mismatch len');
        require(_tokens.length == _amounts.length, 'mismatch len');

        uint i;
        for(i; i< _vi.length; i++){
            if(_amounts[i] > 0) IVotingIncentives(_vi[i]).emergencyRecoverERC20(_tokens[i], _amounts[i]);
        }
    }

    /// @notice recover an ERC20 from VotingIncetives contracts and update.
    /// @param _vi     array of voting incentives contract
    /// @param _tokens array of tokens to recover
    /// @param _amounts array of amounts to recover
    /// @dev Used in case a project wants to remove the external incentives from the current epoch
    function recoverERC20AndUpdateData(address[] calldata _vi, address[] calldata _tokens, uint[] calldata _amounts) external onlyRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE) {
        uint i;
        require(_vi.length == _tokens.length, 'mismatch len');
        require(_tokens.length == _amounts.length, 'mismatch len');

        for(i; i< _vi.length; i++){
            if(_amounts[i] > 0) IVotingIncentives(_vi[i]).recoverERC20AndUpdateLastIncetive(_tokens[i], _amounts[i]);
        }
    }

    /// @notice Pause VotingIncetives contracts
    /// @param _vi     array of voting incentives contract
    function pauseVotingIncentives(address[] calldata _vi) external onlyRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE) {
        uint i;
        for ( i ; i < _vi.length; i++){
            IVotingIncentives(_vi[i]).pause(true);
        }
    }

    /// @notice Unpause VotingIncetives contracts
    /// @param _vi     array of voting incentives contract
    function unpauseVotingIncentives(address[] calldata _vi) external onlyRole(VOTING_INCENTIVES_FACTORY_MANAGER_ROLE) {
        uint i;
        for ( i ; i < _vi.length; i++){
            IVotingIncentives(_vi[i]).pause(false);
        }
    }


    event CreateVotingIncentives(address indexed gauge, address indexed votingIncentives);

}
