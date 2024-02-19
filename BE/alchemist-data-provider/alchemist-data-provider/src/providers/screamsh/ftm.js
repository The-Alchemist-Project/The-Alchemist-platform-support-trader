const fetch = require('node-fetch');

const fetchFromGraph = () =>
  fetch('https://api.thegraph.com/subgraphs/name/screamsh/scream-v1', {
    body: '{"query":"{\\n                    markets(first: 100) {\\n                      borrowRate\\n                      cash\\n                      collateralFactor\\n                      exchangeRate\\n                      interestRateModelAddress\\n                      name\\n                      reserves\\n                      supplyRate\\n                      symbol\\n                      id\\n                      totalBorrows\\n                      totalSupply\\n                      underlyingAddress\\n                      underlyingName\\n                      underlyingPrice\\n                      underlyingSymbol\\n                      underlyingPriceUSD\\n                      accrualBlockNumber\\n                      blockTimestamp\\n                      borrowIndex\\n                      reserveFactor\\n                      underlyingDecimals\\n                    }\\n                  }"}',
    method: 'POST',
    mode: 'cors',
  }).then((i) => i.json());

const run = async () => {
  const result = await fetchFromGraph();
  return result.data.markets
    .map((market) => ({
      name: market.underlyingSymbol,
      tvl: market.cash * market.underlyingPriceUSD,
      apy: parseFloat(market.supplyRate),
      address: market.id,
      depositCoins: [market.underlyingAddress],
      lp: false,
    }))
    .filter((i) => i.tvl > 0 && i.apy > 0);
};

module.exports = {
  version: 1,
  run,
};
