const fetch = require('node-fetch');

const { ethers } = require('ethers');
const evm = require('../../sdk/evm');

const provider = evm.getProvider('ftm');

const URL = 'https://api.geist.finance/api/getApys';

const erc20Abi = new ethers.utils.Interface([
  'function symbol() view returns (string memory)',
]);

const LENDING_POOL_ADDR = '0x9FAD24f572045c7869117160A571B2e50b10d068';

const E18 = ethers.BigNumber.from('1000000000000000000'); // 1e18

const lendingPoolAbi = new ethers.utils.Interface([
  'function getReserveData(address) view returns (tuple(uint), uint128, uint128, uint128, uint128, uint128, uint40, address, address, address, address, uint8)',
]);

const lendingPoolContract = new ethers.Contract(
  LENDING_POOL_ADDR,
  lendingPoolAbi,
  provider,
);

// TODO add lending apy
const run = async () => {
  const resp = await fetch(URL).then((i) => i.json());

  const pools = [];

  for (const [idx, item] of resp.data.apyDetails.entries()) {
    if (idx % 2 === 0) {
      let tokenContract = new ethers.Contract(
        item.underlyingAsset,
        erc20Abi,
        provider,
      );
      let reserveData = await lendingPoolContract.getReserveData(
        item.underlyingAsset,
      );
      let lendingApr = reserveData[3].div(E18).toNumber() / 1e9;
      let name = await tokenContract.symbol();
      pools.push({
        tvl: parseInt(item.poolValue),
        apy: item.apy + lendingApr,
        address: item.underlyingAsset,
        depositCoins: [item.underlyingAsset],
        lp: false,
        name,
      });
    }
  }
  return pools;
};

module.exports = {
  version: 1,
  run,
};
