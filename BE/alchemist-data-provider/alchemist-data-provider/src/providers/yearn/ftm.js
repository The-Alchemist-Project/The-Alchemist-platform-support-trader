const { ethers } = require('ethers');
const fetch = require('node-fetch');
const URL = 'https://test-api.yearn.network/v1/chains/250/vaults/get';

const E6 = ethers.BigNumber.from('1000000');

const run = async () => {
  const resp = await fetch(URL).then((i) => i.json());
  let pools = [];

  resp.forEach(({ metadata, token, underlyingTokenBalance }) => {
    let tvl = ethers.BigNumber.from(underlyingTokenBalance.amountUsdc)
      .div(E6)
      .toNumber();
    let name = metadata.displayName;
    if (name === 'TEST_ONLY') {
      return;
    }
    pools.push({
      name: metadata.displayName,
      address: token,
      depositCoins: [token],
      tvl: parseInt(tvl),
      apy: metadata.apy.net_apy,
      lp: false,
    });
  });
  return pools;
};

module.exports = {
  version: 1,
  run,
};
