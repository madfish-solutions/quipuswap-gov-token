const { MichelsonMap } = require("@taquito/michelson-encoder");

const { accounts } = require('../scripts/sandbox/accounts');

const metadata = MichelsonMap.fromLiteral({
  "": Buffer.from("tezos-storage:paul", "ascii").toString("hex"),
  paul: Buffer.from(
    JSON.stringify({
      version: "v1.0.0",
      description: "Quipuswap Gov Token",
      authors: ["<degentech@gmail.com>"],
      source: {
        tools: ["Ligo", "Flextesa"],
        location: "https://ligolang.org/",
      },
      interfaces: ["TZIP-12", "TZIP-16", "TZIP-17"],
      errors: [],
      views: [],
    }),
    "ascii"
  ).toString("hex"),
});

const tokenMetadata = MichelsonMap.fromLiteral({
  0: {
    token_id: "0",
    token_info: MichelsonMap.fromLiteral({
      symbol: Buffer.from("QSGV").toString("hex"),
      name: Buffer.from("QSGOV").toString("hex"),
      decimals: Buffer.from("6").toString("hex"),
      icon: Buffer.from("").toString("hex"),
    }),
  },
});

module.exports = {
  account_info: MichelsonMap.fromLiteral({}),
  token_info: MichelsonMap.fromLiteral({}),
  metadata: metadata,
  token_metadata: tokenMetadata,
  minters: [],
  minters_info: [],
  tokens_ids: [0],
  last_token_id: "1",
  admin: accounts[0],
  permit_counter: "0",
  permits: MichelsonMap.fromLiteral({}),
  default_expiry: "1000",
  total_mint_percent: "0",
  bob: accounts[1],
  bobs_accumulator: "0",
};
