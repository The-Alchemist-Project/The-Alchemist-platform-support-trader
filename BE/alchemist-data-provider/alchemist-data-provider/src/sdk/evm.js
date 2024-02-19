const { ethers } = require('ethers');
const assert = require('assert');
const fetch = require('node-fetch');

globalThis.fetch = fetch;
const _PROVIDERS = {};

const setUpProvider = (name, chainId, urls, append = true) => {
  const providers = urls.map(
    (url) => new ethers.providers.StaticJsonRpcProvider(url, chainId),
  );

  if (append) {
    const originFallbackProvider = _PROVIDERS[name];
    originFallbackProvider &&
      providers.push(...originFallbackProvider.providerConfigs);
  }

  _PROVIDERS[name] = new ethers.providers.FallbackProvider(providers);
};

let DEFAULT_PROVIDERS_ALREADY_SETUP = false;

const _setupDefaultProviders = () => {
  if (DEFAULT_PROVIDERS_ALREADY_SETUP) {
    return;
  }

  setUpProvider(
    'eth',
    1,
    [
      'https://eth-mainnet.gateway.pokt.network/v1/5f3453978e354ab992c4da79',
      'https://cloudflare-eth.com/',
      'https://main-light.eth.linkpool.io/',
      'https://api.mycryptoapi.com/eth',
    ],
    false,
  );
  setUpProvider(
    'bsc',
    56,
    [
      'https://nodes.pancakeswap.com/',
      'https://bsc-dataseed.binance.org/',
      'https://bsc-dataseed1.defibit.io/',
      'https://bsc-dataseed1.ninicoin.io/',
      'https://bsc-dataseed2.defibit.io/',
      'https://bsc-dataseed2.ninicoin.io/',
    ],
    false,
  );
  setUpProvider(
    'polygon',
    137,
    ['https://polygon-rpc.com/', 'https://rpc-mainnet.maticvigil.com/'],
    false,
  );
  setUpProvider(
    'heco',
    128,
    [
      'https://http-mainnet.hecochain.com',
      'https://http-mainnet-node.huobichain.com',
      'https://pub001.hg.network/rpc',
    ],
    false,
  );
  setUpProvider(
    'ftm',
    250,
    ['https://rpc.ftm.tools/', 'https://rpcapi.fantom.network'],
    false,
  );
  setUpProvider(
    'xdai',
    100,
    [
      'https://rpc.xdaichain.com/',
      'https://xdai.poanetwork.dev',
      'https://dai.poa.network',
      'https://xdai-archive.blockscout.com',
    ],
    false,
  );
  setUpProvider(
    'avax',
    43114,
    ['https://api.avax.network/ext/bc/C/rpc'],
    false,
  );
  setUpProvider('oec', 66, ['https://exchainrpc.okex.org'], false);
  setUpProvider('optimism', 10, ['https://mainnet.optimism.io/'], false);
  setUpProvider('arbitrum', 42161, ['https://arb1.arbitrum.io/rpc'], false);
  setUpProvider(
    'moonriver',
    1285,
    ['https://rpc.moonriver.moonbeam.network/'],
    false,
  );

  DEFAULT_PROVIDERS_ALREADY_SETUP = true;
};

const getProvider = (name) => {
  _setupDefaultProviders();

  const provider = _PROVIDERS[name];
  assert(
    typeof provider !== 'undefined',
    `Please setup provider first. name: ${name}`,
  );
  return provider;
};

module.exports = { getProvider, setUpProvider };
