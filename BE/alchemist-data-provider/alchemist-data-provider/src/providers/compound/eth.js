const fetch = require('node-fetch');
const BigNumber = require('bignumber.js');

const URL = 'https://api.compound.finance/api/v2/ctoken';

const PRICE_URL = 'https://prices.compound.finance/';

const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

const run = async () => {
  const priceResp = await fetch(PRICE_URL).then((i) => i.json());
  const ethPrice = parseFloat(priceResp.coinbase.prices.ETH);
  const resp = await fetch(URL).then((i) => i.json());
  return resp.cToken.map(
    ({
      underlying_symbol,
      underlying_address,
      total_supply,
      supply_rate,
      comp_supply_apy,
      underlying_price,
      exchange_rate,
    }) => {
      return {
        address: underlying_symbol === 'ETH' ? WETH : underlying_address,
        depositCoins: [underlying_symbol === 'ETH' ? WETH : underlying_address],
        name: underlying_symbol,
        tvl: parseInt(
          new BigNumber(total_supply.value)
            .multipliedBy(
              new BigNumber(
                parseFloat(underlying_price.value) *
                  parseFloat(exchange_rate.value) *
                  ethPrice,
              ),
            )
            .toNumber(),
        ),
        apy:
          parseFloat(supply_rate.value) +
          parseFloat(comp_supply_apy.value) / 10000,
        lp: false,
      };
    },
  );
};

module.exports = {
  version: 1,
  run,
};
