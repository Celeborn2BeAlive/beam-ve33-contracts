# IncentiveMakerUpgradeable

Interacts with Algebra contracts:

```solidity
/// @notice Interface to interact with the algebra eternal farming contract
IAlgebraEternalFarming public algebraEternalFarming;

/// @notice Interface to interact with the farming center contract
IFarmingCenter public farmingCenter;
```

External calls:

In `_createAndSaveIncentive`:
```solidity
address _virtualPool = algebraEternalFarming.createEternalFarming(key, params, plugin);
```

In `updateIncentive`:
```solidity
if(_incentiveExists) algebraEternalFarming.setRates(key, 0, 0);

// [...]

algebraEternalFarming.addRewards(key, uint128(reward), 0);
algebraEternalFarming.setRates(key, rate, 0);
```

Both `createEternalFarming` and `setRates` are protected with `onlyIncentiveMaker`. Role required on AlgebraFactory: `INCENTIVE_MAKER_ROLE`

`addRewards` seems permissionless.
