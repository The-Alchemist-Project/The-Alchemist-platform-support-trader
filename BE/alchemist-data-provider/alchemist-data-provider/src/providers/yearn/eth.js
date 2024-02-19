const fetch = require('node-fetch');
const URL = 'https://api.yearn.finance/v1/chains/1/vaults/all';

const run = async () => {
  const resp = await fetch(URL).then((i) => i.json());
  let pools = [];
  let ids = new Map();
  resp.forEach(({ type, inception, token, version }) => {
    if (type !== 'v2') {
      return;
    }
    const addr = token.address.toLowerCase();
    if (!ids.has(addr)) {
      ids.set(addr, [inception, version]);
    } else {
      if (ids.get(addr)[1] < version) {
        ids.set(addr, [inception, version]);
      }
    }
  });

  resp.forEach(({ inception, token, tvl, apy }) => {
    const addr = token.address.toLowerCase();
    if (!ids.has(addr)) {
      return;
    }
    if (ids.get(addr)[0] !== inception) {
      return;
    }

    pools.push({
      name: token.symbol,
      address: addr,
      depositCoins: [addr],
      tvl: parseInt(tvl.tvl),
      apy: apy['net_apy'],
      lp: false,
    });
  });
  return pools;
};

module.exports = {
  version: 1,
  run,
};
