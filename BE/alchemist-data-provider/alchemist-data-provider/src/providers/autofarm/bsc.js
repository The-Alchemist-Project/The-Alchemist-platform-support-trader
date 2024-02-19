const fetch = require('node-fetch');

const URL = 'https://static.autofarm.network/bsc/farm_data.json';

const deadAddr = '0x000000000000000000000000000000000000dEaD';

const run = async () => {
  const resp = await fetch(URL).then((i) => i.json());
  const bscData = Object.values(resp.pools);

  return bscData.map((item) => {
    if (item.wantIsLP) {
      let coins = [];
      if (item.token0Address !== deadAddr) {
        coins.push(item.token0Address);
      }
      if (item.token1Address !== deadAddr) {
        coins.push(item.token1Address);
      }
      return {
        name: item.wantName,
        address: item.wantAddress,
        depositCoins: coins,
        tvl: item.poolWantTVL,
        apy: item.APR,
        lp: item.wantIsLP,
      };
    } else {
      return {
        name: item.wantName,
        address: item.wantAddress,
        depositCoins: [item.wantAddress],
        tvl: parseInt(item.poolWantTVL),
        apy: item.APR,
        lp: item.wantIsLP,
      };
    }
  });
};

module.exports = {
  version: 1,
  run,
};
