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

const E18 = ethers.BigNumber.from('1000000000000000000'); // 1e18

const pools = [
  {
    name: 'MIM-WEVE',
    poolId: 6,
    poolToken: '0x5ab00b7E2FFA1Ce2ba419A0A61978A05F1b518af',
    poolTokenDecimals: 18,
    lpInfo: {
      token0: '0x82f0b8b456c1a451378467398982d4834b6829c1',
      token0Decimals: 18,
      token1: '0x911da02c1232a3c3e1418b834a311921143b04d7',
    },
  },
];

const CHEF_ADDRESS = '0xE04C26444d37fE103B9cc8033c99b09D47056f51';
const ROUTER_ADDRESS = '0x16327e3fbdaca3bcf7e38f5af2599d2ddc33ae52';
const USDC = '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75';
const WFTM = '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83';
const VEDAO = '0x911da02c1232a3c3e1418b834a311921143b04d7';

const rewardsPerBlock = ethers.BigNumber.from('298');
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
  const veDAOPrice = await getPrice(VEDAO);
  const veDAOInUSDPerYear = rewardsPerBlock
    .mul(veDAOPrice)
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
      const apy = veDAOInUSDPerYear
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
