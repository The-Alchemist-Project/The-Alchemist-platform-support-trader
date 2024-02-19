// https://docs.alpacafinance.org/our-protocol-1/global-parameters#borrowing-interest-m-utilization-+-b

const { ethers } = require('ethers');
const evm = require('../../sdk/evm');

const provider = evm.getProvider('bsc');

const IB_ABI = new ethers.utils.Interface([
  'function totalToken() view returns (uint)',
  'function vaultDebtVal() view returns (uint)',
]);

const chefAbi = new ethers.utils.Interface([
  'function alpacaPerBlock() view returns (uint)',
  'function totalAllocPoint() view returns (uint)',
  'function poolInfo(uint i) view returns (address, uint, uint, uint, uint)',
]);

const chefAddress = '0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F';

const E18 = ethers.BigNumber.from('1000000000000000000'); // 1e18

const vaults = [
  [
    'BNB',
    '0xd7D069493685A581d27824Fc46EdA46B7EfC0063',
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    1,
    0,
  ],
  [
    'BUSD',
    '0x7C9e73d4C71dae564d41F78d56439bB4ba87592f',
    '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    3,
    E18,
  ],
  [
    'ETH',
    '0xbfF4a34A4644a113E8200D7F1D79b3555f723AfE',
    '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    9,
    0,
  ],
  [
    'ALPACA',
    '0xf1bE8ecC990cBcb90e166b71E368299f0116d421',
    '0x8F0528cE5eF7B51152A59745bEfDD91D97091d2F',
    11,
    0,
  ],
  [
    'USDT',
    '0x158Da805682BdC8ee32d52833aD41E74bb951E59',
    '0x55d398326f99059fF775485246999027B3197955',
    16,
    E18,
  ],
  [
    'BTC',
    '0x08FC9Ba2cAc74742177e0afC3dC8Aed6961c24e7',
    '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    18,
    0,
  ],
  [
    'TUSD',
    '0x3282d2a151ca00BfE7ed17Aa16E42880248CD3Cd',
    '0x14016E85a25aeb13065688cAFB43044C2ef86784',
    20,
    E18,
  ],
];

const uniV2RouterAbi = new ethers.utils.Interface([
  'function getAmountsOut(uint, address[] memory) view returns (uint[] memory)',
]);

const routerAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const router = new ethers.Contract(routerAddress, uniV2RouterAbi, provider);

const getPrice = async (path, amt = E18) => {
  // return price * E18
  const amts = await router.getAmountsOut(amt, path);
  const lastAmt = amts[amts.length - 1];
  return lastAmt.mul(E18).div(amt);
};

const run = async () => {
  let pools = [];
  let chefContract = new ethers.Contract(chefAddress, chefAbi, provider);
  let alpacaPerBlock = (await chefContract.alpacaPerBlock()).div(E18);
  let totalPoint = await chefContract.totalAllocPoint();

  let alpacaPrice = await getPrice([
    '0x8F0528cE5eF7B51152A59745bEfDD91D97091d2F',
    '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
  ]);

  for (let i = 0; i < vaults.length; i++) {
    let [name, ibToken, token, poolId, presetPrice] = vaults[i];
    let ibBnbContract = new ethers.Contract(ibToken, IB_ABI, provider);
    let totalToken = await ibBnbContract.totalToken();
    let vaultDebt = await ibBnbContract.vaultDebtVal();

    let ratio = vaultDebt.mul(10000).div(totalToken).toNumber() / 10000;

    let borrow_apy = 0;
    if (ratio < 0.6) {
      borrow_apy = ratio / 3;
    } else if (ratio < 0.9) {
      borrow_apy = 0.2;
    } else {
      borrow_apy = 0.2 + 13 * ratio;
    }
    let apy = borrow_apy * ratio * 0.81;

    let price = presetPrice;
    if (price === 0) {
      price = await getPrice([
        token,
        '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      ]);
    }
    let tvl = totalToken.mul(price).div(E18).div(E18).toNumber();

    let v = await chefContract.poolInfo(poolId);

    let alpacaApr =
      alpacaPerBlock
        .mul(alpacaPrice)
        .mul(10512000)
        .mul(v[1])
        .div(totalPoint)
        .div(E18)
        .toNumber() / tvl;

    pools.push({
      name,
      tvl: parseInt(tvl),
      apy: apy + alpacaApr,
      address: token,
      depositCoins: [token],
      lp: false,
    });
  }

  return pools;
};

module.exports = {
  version: 1,
  run,
};
