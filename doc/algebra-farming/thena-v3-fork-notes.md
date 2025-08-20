Thena V3 CL farming:
- Deposit liquidity ETH/BNB:
  - https://bscscan.com/tx/0x3a017e0890f2e0501f920779a44b5d5ed0cb39c1de64d6efb25302525f79c6bb
- Approve for farming: https://bscscan.com/tx/0x2653e92ff1718f1076ad8734abb011f0b8b9da7b02b5bcea650cedf8a4c88560
  - Called on Algebra Positions NFT-V: https://bscscan.com/address/0x643b68bf3f855b8475c0a700b6d1020bfc21d02e
- Enter farming: https://bscscan.com/tx/0x3bb3af4a01ac0c256d3ea06e95b4c6eabc4e6036bec5442c22ace8616a3dd4c3
  - Called on FarmingCenter: https://bscscan.com/address/0x0cd53eeb75d72ee0e3e64206b63d7204351d08bf#code

Voter: https://bscscan.com/address/0x8FBB1ECEbb9E9839bC0dE00b9c4C585CabDD0462#code
  - Handle gauges
  - GaugeEternalFarming: https://bscscan.com/address/0xb02D0719d9019234D29f5a4B448bf4371aE31116#code
  - Each pool is linked to gauge & voting incentives
    - VotingIncentives: https://bscscan.com/address/0x04e5cd31cda647cf897935e8704d2f933402b6fa#code
      - Seems to be bribes + swap fees
      - With a factory: https://bscscan.com/address/0x82f144accf4779ca8c49928be28fac5fa157d218#code
  - Each gauge has feeVault
    - https://bscscan.com/address/0x76646C15678965fdfe2B7ae9C1c7975bb90DB89E#code
    - An AlgebraVault instance
  - incentiveMaker is responsible of farm updates
    - https://bscscan.com/address/0x80ad2f2Ed4F00b152D7cA5E74920c944BFEF0701#code
    - An upgradable contract
    - Implem is IncentiveMaker: https://bscscan.com/address/0x9433ea1d457d5b205f14e029812da28477b1c7b8#code
  - GaugeFactory is https://bscscan.com/address/0x479cE658DD4195556C60Ea9fdE92cF0F42EA8692#code

Minter https://bscscan.com/address/0x86069feb223ee303085a1a505892c9d4bdbee996#readProxyContract
  - References voter as https://bscscan.com/address/0x3005b0d329141d75b62CCeEe57BF00153fE26074#code
  - Upgradable as, implem is https://bscscan.com/address/0xe84a0ab90cd7825357a62418cc71277f8c8887a7#code
    - -> EpochDistributorBSC
    - References the voter at 0x8FBB1ECEbb9E9839bC0dE00b9c4C585CabDD0462
      - Check `_distribute`


They have a global factory https://bscscan.com/address/0x247009C6F39bC08d5d39ac38c9D5a0D316947D9C#code

Analysis of BNB/ETH:
  - The pool: https://bscscan.com/address/0x58f04aada1051885a3c4e296aab0a454ea1233a3#code
  - The position NFT: https://bscscan.com/address/0x643b68bf3f855b8475c0a700b6d1020bfc21d02e#code
  - The `communityVault`: https://bscscan.com/address/0x76646C15678965fdfe2B7ae9C1c7975bb90DB89E#code
  - The gauge (GaugeEternalFarming): https://bscscan.com/address/0xb02D0719d9019234D29f5a4B448bf4371aE31116#code
    - We have `feeVault` = `0x76646C15678965fdfe2B7ae9C1c7975bb90DB89E` as expected
