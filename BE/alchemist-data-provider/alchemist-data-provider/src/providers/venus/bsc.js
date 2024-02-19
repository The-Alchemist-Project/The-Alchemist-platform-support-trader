const fetch = require('node-fetch');

const URL = 'https://api.venus.io/api/governance/venus';

const WBNB = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';

const run = async () => {
  const resp = await fetch(URL).then((i) => i.json());
  return resp.data.markets.map(
    ({
      underlyingAddress,
      underlyingSymbol,
      totalSupplyUsd,
      supplyApy,
      supplyVenusApy,
    }) => ({
      name: underlyingSymbol,
      address: underlyingSymbol === 'BNB' ? WBNB : underlyingAddress,
      depositCoins: [underlyingSymbol === 'BNB' ? WBNB : underlyingAddress],
      tvl: parseInt(totalSupplyUsd),
      apy: (parseFloat(supplyApy) + parseFloat(supplyVenusApy)) / 100,
      lp: false,
    }),
  );
};

module.exports = {
  version: 1,
  run,
};
