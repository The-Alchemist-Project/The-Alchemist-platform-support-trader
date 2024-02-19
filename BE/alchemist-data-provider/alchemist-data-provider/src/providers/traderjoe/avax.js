const fetch = require('node-fetch');

const URL =
  'https://analytics.traderjoexyz.com/_next/data/8lLP3iNXyYEb8QV8zmRt9/index.json';

const run = async () => {
  const resp = await fetch(URL).then((i) => i.json());
  let pools = [];
  for (const [key, value] of Object.entries(
    resp.pageProps.initialApolloState,
  )) {
    if (key.startsWith('Pool:')) {
      if (value.roiPerYear !== undefined && value.liquidityPair !== undefined) {
        let depositCoins = [
          value.liquidityPair.token0.id,
          value.liquidityPair.token1.id,
        ];
        pools.push({
          name:
            value.liquidityPair.token0.symbol +
            '-' +
            value.liquidityPair.token1.symbol,
          address: value.liquidityPair.id,
          depositCoins,
          tvl: parseInt(value.tvl),
          apy: value.roiPerYear,
          lp: true,
        });
      }
    }
  }
  return pools;
};

module.exports = {
  version: 1,
  run,
};
