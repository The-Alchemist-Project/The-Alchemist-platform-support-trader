const fetch = require('node-fetch');

const URL = 'https://gateway.mdex.one/v2/mingpool/lps?mdex_chainid=56';

const run = async () => {
  const resp = await fetch(URL).then((i) => i.json());
  return resp.result
    .filter((item) => {
      return item.pool_apy !== 0 && item.token0 !== undefined;
    })
    .map(({ address, pool_name, pool_tvl, pool_apy, token0, token1 }) => ({
      name: pool_name,
      address: address,
      tvl: parseInt(pool_tvl),
      depositCoins: [token0, token1],
      apy: pool_apy,
      lp: true,
    }));
};

module.exports = {
  version: 1,
  run,
};
