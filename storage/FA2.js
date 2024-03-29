const { MichelsonMap } = require("@taquito/michelson-encoder");

const { bob } = require("../scripts/sandbox/accounts");

const metadata = MichelsonMap.fromLiteral({
  "": Buffer.from("tezos-storage:qs", "ascii").toString("hex"),
  qs: Buffer.from(
    JSON.stringify({
      version: "v1.0.0",
      description: "Quipuswap Gov Token",
      authors: [""],
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
  minters_info: MichelsonMap.fromLiteral({}),
  last_token_id: "1",
  admin: bob.pkh,
  permit_counter: "0",
  permits: MichelsonMap.fromLiteral({}),
  default_expiry: "1000",
  total_minter_shares: "0",
};
