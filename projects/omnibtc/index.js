const { sumTokensExport } = require("../helper/sumTokens");
const ADDRESSES = require("../helper/coreAssets.json");
const sui = require("../helper/chain/sui");

const RESERVE_DYNAMIC_TABLE =
  "0x6ce8b223c47b5037d6791819694b32619ab0edfa5da139d21e416781cae487aa";

const POOLS = {
  arbitrum: "0x53eCC006a0073b3351E9e38d94f052E3864C7935",
  base: "0x68953027738216A63B39D55B18C02FeD5c329Dfa",
  optimism: "0x233DDEce6a96c49ecE6Ad9ae820690fE62a28975",
  polygon: "0xC3Eb696184b8927D677D8AB390A26563De4798c3",
};
const DEFAULT_TOKEN = ADDRESSES.null;

const DECIMAL_SHIFTS = {
  [ADDRESSES.sui.USDC]: -2,
  [ADDRESSES.sui.SUI]: 1,
};

const SUI_TOKENS = [
  { symbol: "SUI", poolId: 3, address: ADDRESSES.sui.SUI },
  { symbol: "USDC", poolId: 8, address: ADDRESSES.sui.USDC },
];

async function fetchDataBasedOnPoolId() {
  return Promise.all(
    SUI_TOKENS.map(({ poolId }) =>
      sui.getDynamicFieldObject(RESERVE_DYNAMIC_TABLE, poolId.toString(), {
        idType: "u16",
      })
    )
  );
}

// Calculate and add to API
function calculateAndAdd(objectsList, type, indexName, api) {
  objectsList.forEach((object, index) => {
    const { address } = SUI_TOKENS[index];

    const dataFields = object.fields.value.fields;

    const total_supply = dataFields.otoken_scaled?.fields?.total_supply || 0;
    const total_borrow = dataFields.dtoken_scaled?.fields?.total_supply || 0;
    const indexValue = dataFields[indexName] || 0;

    const shiftValue = 10 ** (DECIMAL_SHIFTS[address] ?? 0);
    const mainValue =
      type === "tvl" ? total_supply - total_borrow : total_borrow;

    const amount = (mainValue * shiftValue * indexValue) / Math.pow(10, 27);

    api.add(address, amount);
  });
}

async function suiTvl() {
  const { api } = arguments[3];
  const objectsList = await fetchDataBasedOnPoolId();
  calculateAndAdd(objectsList, "tvl", "current_liquidity_index", api);
}

async function suiBorrow() {
  const { api } = arguments[3];
  const objectsList = await fetchDataBasedOnPoolId();
  calculateAndAdd(objectsList, "borrow", "current_borrow_index", api);
}

module.exports = {
  timetravel: false,
  arbitrum: {
    tvl: sumTokensExport({
      owner: POOLS.arbitrum,
      tokens: [
        DEFAULT_TOKEN,
        ADDRESSES.arbitrum.ARB,
        ADDRESSES.arbitrum.USDC,
        ADDRESSES.arbitrum.USDT,
      ],
    }),
  },
  base: {
    tvl: sumTokensExport({
      owner: POOLS.base,
      tokens: [DEFAULT_TOKEN, ADDRESSES.base.USDbC],
    }),
  },
  optimism: {
    tvl: sumTokensExport({
      owner: POOLS.optimism,
      tokens: [
        DEFAULT_TOKEN,
        ADDRESSES.optimism.OP,
        ADDRESSES.optimism.USDC,
        ADDRESSES.optimism.USDT,
      ],
    }),
  },
  polygon: {
    tvl: sumTokensExport({
      owner: POOLS.polygon,
      tokens: [DEFAULT_TOKEN, ADDRESSES.polygon.USDC, ADDRESSES.polygon.USDT],
    }),
  },
  sui: {
    tvl: suiTvl,
    borrowed: suiBorrow,
  },
};
