My tx of setDefaultFeeConfiguration: https://zetachain.blockscout.com/tx/0xacc8ab030f0f6aeacd09abc8c3b85b5678c70f40558d85bb7abc175737492d4a

Called on BasePluginV1Factory: https://zetachain.blockscout.com/address/0x219889d6b091840dBd6139A18958800a1b793cf0
Can be called by an address with ALGEBRA_BASE_PLUGIN_FACTORY_ADMINISTRATOR role (0x267da724c255813ae00f4522fe843cb70148a4b8099cbc5af64f9a4151e55ed6)

This is our AlgebraFactory: https://zetachain.blockscout.com/address/0x28b5244B6CA7Cb07f2f7F40edE944c07C2395603

This is a AlgebraPool: https://zetachain.blockscout.com/address/0x7e2514b5e7880335A87F9953d9C54EFE62b349e9
It has a plugin: https://zetachain.blockscout.com/address/0x52E222C5a6b7525875C218D1aB0d77b6f4DBc8E2

On it we can call changeFeeConfiguration from an address with the role ALGEBRA_BASE_PLUGIN_MANAGER (0x8e8000aba5b365c0be9685da1153f7f096e76d1ecfb42c050ae1e387aa65b4f5)

This is AlgebraCommunityVault https://zetachain.blockscout.com/address/0xDe3b76539271E2c634f0c41F5261855234d05879
gathering protocol fees and forwarding to algebra, defining algebra fee share setting

---

# Protocol fees (named community fee in contract)

To change the community fee of a specific pool, needs the POOLS_ADMINISTRATOR_ROLE role (0xb73ce166ead2f8e9add217713a7989e4edfba9625f71dfd2516204bb67ad3442)

When pool is initialized, community fee is set from the `_getDefaultConfiguration` => `IAlgebraFactory(factory).defaultConfigurationForPool(address(this))`

```
function defaultConfigurationForPool(
  address pool
) external view override returns (uint16 communityFee, int24 tickSpacing, uint16 fee, address communityVault) {
  if (address(vaultFactory) != address(0)) {
    communityVault = vaultFactory.getVaultForPool(pool);
  }
  return (defaultCommunityFee, defaultTickspacing, defaultFee, communityVault);
}
```

To set the community fee for future pools, call `setDefaultCommunityFee(uint16 newDefaultCommunityFee)` on AlgebraFactory (0x28b5244B6CA7Cb07f2f7F40edE944c07C2395603)
Only the Algebra Factory Owner can do that.

Our current communityFee is 150 => 15%
Algebra fee is 200 => 20%, which is 20% of 15% = 3%

If we pump communityFee to 500 => 50%
then we need to find x such that 500 * x == 150 * 200
=> x = (150 * 200) / 500 = 60

=> this can be changed on AlgebraCommunityVault 0xDe3b76539271E2c634f0c41F5261855234d05879


Only a COMMUNITY_FEE_VAULT_ADMINISTRATOR (0x63e58c34d94475ba3fc063e19800b940485850d84d09cd3c1f2c14192c559a68) can accept a change of that fee setting.

---

Changing AILUCY/WZETA fee config

Pool is https://zetachain.blockscout.com/address/0x0Ac40eA8Cb2068FC9eBE2cacb285AC5FC4aBF423?tab=read_write_contract

Plugin is https://zetachain.blockscout.com/address/0xF04b803c671DFa543209ba9278DD432BbA03CBE3?tab=read_write_contract

feeConfig is:

alpha1 (uint16) : 2900
alpha2 (uint16) : 12000
beta1 (uint32) : 360
beta2 (uint32) : 60000
gamma1 (uint16) : 59
gamma2 (uint16) : 8500
baseFee (uint16) : 500

We want to set:

alpha1 (uint16) : 2900
alpha2 (uint16) : 12000
beta1 (uint32) : 360
beta2 (uint32) : 60000
gamma1 (uint16) : 59
gamma2 (uint16) : 8500
baseFee (uint16) : 3000

The tx calling changeFeeConfig: https://zetachain.blockscout.com/tx/0x2700d68c1d26fce51fe93e73fc77a4f23fd5a98b5a3104a545b556c679b8f958
