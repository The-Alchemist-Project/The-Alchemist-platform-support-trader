const { ethers } = require('ethers');
const evm = require('../../sdk/evm');

const ERC20_ABI = new ethers.utils.Interface([
  'function balanceOf(address account) view returns (uint)',
]);

const UNIV2_LP_ABI = new ethers.utils.Interface([
  'function totalSupply() view returns (uint)',
  'function getReserves() view returns (uint112,uint112,uint32)',
]);

const UNIV2_ROUTER_ABI = new ethers.utils.Interface([
  'function getAmountsOut(uint, address[] memory) view returns (uint[] memory)',
]);

const CHEF_ABI = new ethers.utils.Interface([
  'function totalAllocPoint() view returns (uint)',
  'function poolInfo(uint i) view returns (address, uint, uint, uint)',
]);

const XCREDIT_ABI = new ethers.utils.Interface([
  'function getShareValue() view returns (uint)',
]);

const XBOO_ABI = new ethers.utils.Interface([
  'function xBOOForBOO(uint i) view returns (uint)',
]);

const XSCREAM_ABI = XCREDIT_ABI;

const E18 = ethers.BigNumber.from('1000000000000000000'); // 1e18

const pools = [
  {
    name: 'OXD-USDC',
    poolId: 0,
    poolToken: '0xD5fa400a24EB2EA55BC5Bd29c989E70fbC626FfF',
    poolTokenDecimals: 18,
    lpInfo: {
      token0: '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
      token0Decimals: 6,
      token1: '0xc165d941481e68696f43ee6e99bfb2b23e0e3114',
    },
  },
  {
    name: 'xBOO',
    poolId: 7,
    poolToken: '0xa48d959AE2E88f1dAA7D5F611E01908106dE7598',
    poolTokenDecimals: 18,
    tvlCalculateHelper: async (poolToken, value) => {
      const price = await getPrice(
        '0x841fad6eae12c286d1fd18d1d525dffa75c7effe',
      );
      const shareValue = await new ethers.Contract(
        poolToken,
        XBOO_ABI,
        provider,
      ).xBOOForBOO(E18);
      return value.mul(price).mul(shareValue).div(E18);
    },
  },
  {
    name: 'xSCREAM',
    poolId: 8,
    poolToken: '0xe3D17C7e840ec140a7A51ACA351a482231760824',
    poolTokenDecimals: 18,
    tvlCalculateHelper: async (poolToken, value) => {
      const price = await getPrice(
        '0xe0654c8e6fd4d733349ac7e09f6f23da256bf475',
      );
      const shareValue = await new ethers.Contract(
        poolToken,
        XSCREAM_ABI,
        provider,
      ).getShareValue();
      return value.mul(price).mul(shareValue).div(E18);
    },
  },
  {
    name: 'LQDR',
    poolId: 9,
    poolToken: '0x10b620b2dbAC4Faa7D7FFD71Da486f5D44cd86f9',
    poolTokenDecimals: 18,
  },
  {
    name: 'XTAROT',
    poolId: 10,
    poolToken: '0x74D1D2A851e339B8cB953716445Be7E8aBdf92F4',
    poolTokenDecimals: 18,
    tvlCalculateHelper: async (poolToken, value) => {
      const price = await getPrice(
        '0xc5e2b037d30a390e62180970b3aa4e91868764cd',
      );
      const shareValue = ethers.BigNumber.from('1050000000000000000'); // hard to calculate
      return value.mul(price).mul(shareValue).div(E18);
    },
  },
  {
    name: 'XCREDIT',
    poolId: 11,
    poolToken: '0xd9e28749e80D867d5d14217416BFf0e668C10645',
    poolTokenDecimals: 18,
    tvlCalculateHelper: async (poolToken, value) => {
      const price = await getPrice(
        '0x77128dfdd0ac859b33f44050c6fa272f34872b5e',
      );
      const shareValue = await new ethers.Contract(
        poolToken,
        XCREDIT_ABI,
        provider,
      ).getShareValue();
      return value.mul(price).mul(shareValue).div(E18);
    },
  },
  {
    name: 'TOMB',
    poolId: 12,
    poolToken: '0x6c021Ae822BEa943b2E66552bDe1D2696a53fbB7',
    poolTokenDecimals: 18,
  },
  // {
  //   name: 'fBEETS',
  //   poolId: 13,
  //   poolToken: '0xfcef8a994209d6916EB2C86cDD2AFD60Aa6F54b1',
  //   poolTokenDecimals: 18,
  // },
];

const CHEF_ADDRESS = '0xa7821c3e9fc1bf961e280510c471031120716c3d';
const ROUTER_ADDRESS = '0xf491e7b69e4244ad4002bc14e878a34207e38c29';
const USDC = '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75';
const WFTM = '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83';
const OXD = '0xc165d941481e68696f43EE6E99BFB2B23E0E3114';

const oxdPerSecond = ethers.BigNumber.from('1000');
const oneUSDCMultiplier = ethers.BigNumber.from(10).pow(6);

const provider = evm.getProvider('ftm');
const router = new ethers.Contract(ROUTER_ADDRESS, UNIV2_ROUTER_ABI, provider);

const getPrice = async (token, amount = E18) => {
  if (token === USDC) {
    return ethers.BigNumber.from(oneUSDCMultiplier);
  }

  const jobs = [router.getAmountsOut(amount, [token, USDC])];

  if (token !== WFTM) {
    jobs.push(router.getAmountsOut(amount, [token, WFTM, USDC]));
  }

  const results = await Promise.allSettled(jobs);
  const price = results
    .filter((i) => i.status === 'fulfilled')
    .map((i) => i.value)
    .reduce((last, cur) => {
      const lastValue = cur[cur.length - 1];
      return last.lt(lastValue) ? lastValue : last;
    }, ethers.BigNumber.from(-1));

  if (price.lt(0)) {
    throw new Error(
      `Invalid price. origin results: ${JSON.stringify(results)}`,
    );
  }
  return price;
};

const run = async () => {
  const results = [];
  const chefContract = new ethers.Contract(CHEF_ADDRESS, CHEF_ABI, provider);
  const totalPoint = await chefContract.totalAllocPoint();
  const oxdPrice = await getPrice(OXD);
  const oxdInUSDPerYear = oxdPerSecond
    .mul(oxdPrice)
    .mul(31536000) // 1 year in seconds
    .div(oneUSDCMultiplier);

  for (let i = 0; i < pools.length; i++) {
    try {
      const {
        name,
        poolId,
        poolToken,
        poolTokenDecimals,
        lpInfo,
        tvlCalculateHelper,
      } = pools[i];

      let tvl;

      if (!lpInfo) {
        const token = new ethers.Contract(poolToken, ERC20_ABI, provider);
        const chefBalance = await token.balanceOf(CHEF_ADDRESS);
        const oneTokenMultiplier =
          poolTokenDecimals === 18
            ? E18
            : ethers.BigNumber.from(10).pow(poolTokenDecimals);

        if (tvlCalculateHelper) {
          tvl = (await tvlCalculateHelper(poolToken, chefBalance))
            .div(oneTokenMultiplier)
            .div(oneUSDCMultiplier);
        } else {
          const price = await getPrice(poolToken, oneTokenMultiplier);

          tvl = chefBalance
            .mul(price)
            .div(oneTokenMultiplier)
            .div(oneUSDCMultiplier);
        }
      } else {
        const { token0, token0Decimals } = lpInfo;
        const lp = new ethers.Contract(poolToken, UNIV2_LP_ABI, provider);
        const [reserve0] = await lp.getReserves();
        const totalSupply = await lp.totalSupply();

        const oneToken0Multiplier =
          token0Decimals === 18
            ? E18
            : ethers.BigNumber.from(10).pow(token0Decimals);
        const price0 = await getPrice(token0, oneToken0Multiplier);

        const erc20 = new ethers.Contract(poolToken, ERC20_ABI, provider);
        const chefBalance = await erc20.balanceOf(CHEF_ADDRESS);
        const lpVolume = reserve0.mul(price0).div(oneToken0Multiplier).mul(2);
        tvl = lpVolume.mul(chefBalance).div(totalSupply).div(oneUSDCMultiplier);
      }

      const [, allocPoint] = await chefContract.poolInfo(poolId);
      const apy = oxdInUSDPerYear
        .mul(allocPoint)
        .mul(1e8)
        .div(totalPoint)
        .div(tvl);

      results.push({
        name,
        tvl: parseInt(tvl.toNumber()),
        apy: apy.toNumber() / 1e8,
        address: poolToken,
        depositCoins: lpInfo ? [lpInfo.token0, lpInfo.token1] : [poolToken],
        lp: typeof lpInfo === 'object',
      });
    } catch (e) {
      console.log('error: ', e);
    }
  }

  return results;
};

module.exports = {
  version: 1,
  run,
};
