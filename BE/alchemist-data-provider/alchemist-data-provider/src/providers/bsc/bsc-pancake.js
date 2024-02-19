const fetch = require('node-fetch');

const { ethers } = require('ethers');
const evm = require('../../sdk/evm');

const provider = evm.getProvider('bsc');

const graphUrl =
  'https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2';

const abiCoder = ethers.utils.defaultAbiCoder;

const chefAddress = '0x73feaa1eE314F8c655E354234017bE2193C9E24E';

const multiCallAddress = '0xfF6FD90A470Aaa0c1B8A54681746b07AcdFedc9B';

const multiCallAbi = new ethers.utils.Interface([
  'function aggregate(tuple(address, bytes)[] memory) public returns (uint256 blockNumber, bytes[] memory)',
]);

const chefAbi = new ethers.utils.Interface([
  'function poolLength() view returns (uint)',
  'function totalAllocPoint() view returns (uint)',
  'function poolInfo(uint i) view returns (address, uint, uint, uint)',
  'function cakePerBlock() view returns (uint)',
]);

const uniV2RouterAbi = new ethers.utils.Interface([
  'function getAmountsOut(uint, address[] memory) view returns (uint[] memory)',
]);

const routerAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const router = new ethers.Contract(routerAddress, uniV2RouterAbi, provider);

const cake = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
const busd = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';

const E18 = ethers.BigNumber.from('1000000000000000000'); // 1e18
const blocksPerYear = ethers.BigNumber.from(20 * 60 * 24 * 365); // 1e18

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
  'content-type': 'application/json',
};

const composeBody = (lps) => {
  let prefix =
    '\n      query pools {\n        now: pairs(\n    where: { id_in: ["';
  let subfix =
    '"] }\n    \n    orderBy: trackedReserveBNB\n    orderDirection: desc\n  ) {\n    id\n    reserve0\n    reserve1\n    reserveUSD\n    volumeUSD\n    token0Price\n    token1Price\n    token0 {\n      id\n      symbol\n      name\n    }\n    token1 {\n      id\n      symbol\n      name\n    }\n  }\n }';
  return prefix + lps.join('","') + subfix;
};

const queryGraph = async (lps) => {
  let b = composeBody(lps);
  let body = { query: b };
  const resp = await fetch(graphUrl, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: HEADERS,
  }).then((i) => i.json());

  return resp.data.now;
};

const getPrice = async (path, amt = E18) => {
  // return price * E18
  const amts = await router.getAmountsOut(amt, path);
  const lastAmt = amts[amts.length - 1];
  return lastAmt.mul(E18).div(amt);
};

const run = async () => {
  const cakePrice = await getPrice([cake, busd]);

  const chefContract = new ethers.Contract(chefAddress, chefAbi, provider);
  const poolSize = (await chefContract.poolLength()).toNumber();
  const cakePerBlock = await chefContract.cakePerBlock();
  const totalPoint = await chefContract.totalAllocPoint();

  const calls = [];
  for (let i = 250; i < poolSize; i++) {
    // old pool id < 250
    calls.push([chefAddress, chefAbi.encodeFunctionData('poolInfo', [i])]);
  }
  const y = await provider.call({
    to: multiCallAddress,
    data: multiCallAbi.encodeFunctionData('aggregate', [calls]),
  });
  const [, results] = abiCoder.decode(['uint', 'bytes[]'], y);

  const pools = [];

  // TODO use multi call
  let lps = [];
  let pointMap = {};
  for (let i = 0; i < results.length; i++) {
    let [addr, allocPoint] = chefAbi.decodeFunctionResult(
      'poolInfo',
      results[i],
    );
    addr = addr.toLowerCase();
    if (allocPoint.toNumber() >= 100) {
      lps.push(addr);
      pointMap[addr] = allocPoint.toNumber();
    }
  }
  let lpInfos = await queryGraph(lps);
  lpInfos.forEach(({ reserveUSD, id, token0, token1 }) => {
    let name = token0.symbol + '-' + token1.symbol;

    let allocPoint = pointMap[id];
    const yearlyProduceCake = cakePerBlock.mul(blocksPerYear).div(E18);
    let tvl = parseFloat(reserveUSD);
    if (tvl <= 100) {
      return;
    }

    const apy = yearlyProduceCake
      .mul(allocPoint)
      .div(totalPoint)
      .mul(cakePrice)
      .mul(10000)
      .div(E18)
      .div(Math.floor(tvl));
    const floatApy = apy.toNumber() / 10000;

    pools.push({
      name: name,
      address: id,
      depositCoins: [token0.id, token1.id],
      tvl: parseInt(tvl),
      apy: floatApy,
      lp: true,
    });
  });

  return pools;
};

module.exports = {
  version: 1,
  run,
};
