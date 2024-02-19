const fetch = require('node-fetch');

const URL = 'https://cache-api-avalanche.aave.com/graphql';
const MARKET_URL = 'https://aave-api-v2.aave.com/data/markets-data';

const BODY = {
  operationName: 'C_ProtocolData',
  variables: {
    lendingPoolAddressProvider: '0xb6a86025f0fe1862b372cb0ca18ce3ede02a318f',
  },
  query:
    'query C_ProtocolData($lendingPoolAddressProvider: String!) {\n  protocolData(lendingPoolAddressProvider: $lendingPoolAddressProvider) {\n    reserves {\n      ...ReserveDataFragment\n      __typename\n    }\n    baseCurrencyData {\n      ...BaseCurrencyDataFragment\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment ReserveDataFragment on ReserveData {\n  id\n  underlyingAsset\n  name\n  symbol\n  decimals\n  isActive\n  isFrozen\n  usageAsCollateralEnabled\n  aTokenAddress\n  stableDebtTokenAddress\n  variableDebtTokenAddress\n  borrowingEnabled\n  stableBorrowRateEnabled\n  reserveFactor\n  interestRateStrategyAddress\n  baseLTVasCollateral\n  stableRateSlope1\n  stableRateSlope2\n  averageStableRate\n  stableDebtLastUpdateTimestamp\n  variableRateSlope1\n  variableRateSlope2\n  liquidityIndex\n  reserveLiquidationThreshold\n  reserveLiquidationBonus\n  variableBorrowIndex\n  variableBorrowRate\n  availableLiquidity\n  stableBorrowRate\n  liquidityRate\n  totalPrincipalStableDebt\n  totalScaledVariableDebt\n  lastUpdateTimestamp\n  priceInMarketReferenceCurrency\n  __typename\n}\n\nfragment BaseCurrencyDataFragment on BaseCurrencyData {\n  marketReferenceCurrencyDecimals\n  marketReferenceCurrencyPriceInUsd\n  networkBaseTokenPriceInUsd\n  networkBaseTokenPriceDecimals\n  __typename\n}\n',
};

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
  'content-type': 'application/json',
};

const run = async () => {
  const resp = await fetch(URL, {
    method: 'POST',
    body: JSON.stringify(BODY),
    headers: HEADERS,
  }).then((i) => i.json());
  const idSymbolMap = new Map();
  const data = resp.data.protocolData.reserves;
  data.forEach(({ id, symbol }) => {
    idSymbolMap.set(id, symbol);
  });
  const marketResp = await fetch(MARKET_URL).then((i) => i.json());
  const apys = [];
  marketResp.reserves.forEach(
    ({
      id,
      underlyingAsset,
      totalLiquidityUSD,
      liquidityRate,
      aIncentivesAPY,
    }) => {
      if (idSymbolMap.has(id)) {
        apys.push({
          name: idSymbolMap.get(id),
          address: underlyingAsset,
          depositCoins: [underlyingAsset],
          tvl: parseInt(totalLiquidityUSD),
          apy: parseFloat(aIncentivesAPY) + parseFloat(liquidityRate),
          lp: false,
        });
      }
    },
  );
  return apys;
};

module.exports = {
  version: 1,
  run,
};
