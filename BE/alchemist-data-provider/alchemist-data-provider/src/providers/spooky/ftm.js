const fetch = require('node-fetch');
const { ethers } = require('ethers');
const evm = require('../../sdk/evm');

const tradeInfoUrl =
  'https://api.thegraph.com/subgraphs/name/eerieeight/spookyswap';

const provider = evm.getProvider('ftm');

const chefAddress = '0x2b2929E785374c651a81A63878Ab22742656DcDd';

const erc20Abi = new ethers.utils.Interface([
  'function balanceOf(address owner) view returns (uint)',
  'function totalSupply() view returns (uint)',
  'function symbol() view returns (string memory)',
]);

const chefAbi = new ethers.utils.Interface([
  'function poolLength() view returns (uint)',
  'function totalAllocPoint() view returns (uint)',
  'function poolInfo(uint i) view returns (address, uint, uint, uint)',
  'function booPerSecond() view returns (uint)',
]);

const uniV2PairAbi = new ethers.utils.Interface([
  'function name() view returns (string memory)',
  'function symbol() view returns (string memory)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint)',
  'function balanceOf(address owner) view returns (uint)',
  'function allowance(address owner, address spender) view returns (uint)',

  'function factory() view returns (address)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function price0CumulativeLast() view returns (uint)',
  'function price1CumulativeLast() view returns (uint)',
]);

const uniV2RouterAbi = new ethers.utils.Interface([
  'function getAmountsOut(uint, address[] memory) view returns (uint[] memory)',
]);

const routerAddress = '0xF491e7B69E4244ad4002BC14e878a34207E38c29';
const router = new ethers.Contract(routerAddress, uniV2RouterAbi, provider);

const wftm = '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83'; // 18
const btc = '0x321162Cd933E2Be498Cd2267a90534A804051b11'; // 8
const usdc = '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75'; // 6
const boo = '0x841FAD6EAe12c286d1Fd18d1d525DFfA75C7EFFE'; // 18

const E18 = ethers.BigNumber.from('1000000000000000000'); // 1e18
const E8 = ethers.BigNumber.from('100000000'); // 1e8
const E6 = ethers.BigNumber.from('1000000'); // 1e6
const E4 = ethers.BigNumber.from('10000'); // 1e4

const blocksPerYear = ethers.BigNumber.from(60 * 60 * 24 * 365); // 1e18

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
  'content-type': 'application/json',
};

// TODO: add trading apy
const composeBody = (vals) => {
  let s = 'query days {\n  pairDayDatas(first: 100, where: {pairAddress_in: [';
  vals.forEach((val) => {
    s = s + '"' + val.address + '"';
  });
  s = s + '], date: ';
  let timestamp = parseInt(new Date().getTime() / 1000);
  let beginOfDay = timestamp - (timestamp % 86400);
  s = s + beginOfDay;
  s =
    s +
    '}) {\n    id\n    pairAddress\n    dailyVolumeUSD\n    reserveUSD\n    __typename\n  }\n}\n';
  return s;
};

const fetchGraphQLData = async (vals) => {
  let b = composeBody(vals);
  let body = {
    operationName: 'days',
    query: b,
    variables: {},
  };
  const resp = await fetch(tradeInfoUrl, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: HEADERS,
  }).then((i) => i.json());
  let data = resp.data.pairDayDatas;
  let res = {};
  data.forEach(({ pairAddress, dailyVolumeUSD, reserveUSD }) => {
    let apy = (dailyVolumeUSD / reserveUSD) * 365 * 0.0017;
    res[pairAddress.toLowerCase()] = apy;
  });
  return res;
};

const patchTradingApy = async (vals) => {
  let trandingApys = await fetchGraphQLData(vals);
  for (let i = 0; i < vals.length; i++) {
    let trandingApy = trandingApys[vals[i].address.toLowerCase()];
    if (!trandingApy) {
      trandingApy = 0;
    }
    vals[i].apy = vals[i].apy + trandingApy;
  }
};

const getPrice = async (path, amt, divDecimal) => {
  // return price * E18
  const amts = await router.getAmountsOut(amt, path);
  const lastAmt = amts[amts.length - 1];
  return lastAmt.mul(E18).div(divDecimal);
};

const getPairTVL = async (pairAddr, ftmPrice, btcPrice) => {
  // return tvl(usd) * E18
  const pairContract = new ethers.Contract(pairAddr, uniV2PairAbi, provider);
  let token0 = null;
  try {
    token0 = await pairContract.token0();
  } catch (e) {
    return [null, null, null];
  }
  const token1 = await pairContract.token1();
  let baseToken = null;
  let baseTokenPrice = E18;
  let baseTokenDecimals = E6;
  if (token0 === wftm || token1 === wftm) {
    baseToken = token0 === wftm ? token0 : token1;
    baseTokenPrice = ftmPrice;
    baseTokenDecimals = E18;
  } else if (token0 === usdc || token1 === usdc) {
    baseToken = token0 === usdc ? token0 : token1;
  } else if (token0 === btc || token1 === btc) {
    baseToken = token0 === btc ? token0 : token1;
    baseTokenPrice = btcPrice;
    baseTokenDecimals = E8;
  } else {
    return [null, null, null];
  }

  const chefHoldShare = await pairContract.balanceOf(chefAddress);
  const totalSupply = await pairContract.totalSupply();
  const tokenContract = new ethers.Contract(baseToken, erc20Abi, provider);
  return [
    (await tokenContract.balanceOf(pairAddr))
      .mul(2)
      .mul(baseTokenPrice)
      .mul(chefHoldShare)
      .div(totalSupply)
      .div(E18)
      .div(baseTokenDecimals),

    token0,
    token1,
  ];
};

const run = async () => {
  const ftmPrice = await getPrice([wftm, usdc], E18, E6);
  const btcPrice = await getPrice([btc, wftm, usdc], E8, E6);
  const booPrice = await getPrice([boo, wftm, usdc], E18, E6);

  const chefContract = new ethers.Contract(chefAddress, chefAbi, provider);
  const poolSize = (await chefContract.poolLength()).toNumber();
  const booPerSecond = await chefContract.booPerSecond();
  const totalPoint = await chefContract.totalAllocPoint();

  const apys = [];

  // TODO use multi call
  for (let i = 0; i < poolSize; i++) {
    let info = await chefContract.poolInfo(i);
    let addr = info[0];
    let allocPoint = info[1];

    if (allocPoint.toNumber() > 0) {
      let [tvl, token0, token1] = await getPairTVL(addr, ftmPrice, btcPrice);
      if (tvl !== null) {
        if (tvl.lt(E4)) {
          continue;
        }
        const apy = booPerSecond
          .mul(blocksPerYear)
          .mul(allocPoint)
          .mul(booPrice)
          .mul(10000)
          .div(totalPoint)
          .div(E18)
          .div(E18)
          .div(tvl);
        const floatApy = apy.toNumber() / 10000;
        const token0Contract = new ethers.Contract(token0, erc20Abi, provider);
        const token1Contract = new ethers.Contract(token1, erc20Abi, provider);
        const name =
          (await token0Contract.symbol()) +
          '_' +
          (await token1Contract.symbol());
        apys.push({
          name: name,
          address: addr,
          depositCoins: [token0, token1],
          tvl: tvl.toNumber(),
          apy: floatApy,
          lp: true,
        });
      }
    }
  }
  await patchTradingApy(apys);
  return apys;
};

module.exports = {
  version: 1,
  run,
};
