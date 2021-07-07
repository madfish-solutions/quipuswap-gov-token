const { accounts } = require('../scripts/sandbox/accounts');
const { migrate } = require("../scripts/helpers");
const { MichelsonMap } = require("@taquito/michelson-encoder");


const totalSupply = "10000000";

const metadata = MichelsonMap.fromLiteral({
  "": Buffer.from("tezos-storage:qs", "ascii").toString("hex"),
  qs: Buffer.from(
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

module.exports = async (tezos) => {
  const contractAddress = await migrate(
    tezos,
    "FA2",
    {
      account_info: MichelsonMap.fromLiteral({}),
      token_info: MichelsonMap.fromLiteral({}),
      metadata: metadata,
      token_metadata: MichelsonMap.fromLiteral({}),
      minters: [],
      minters_info: [],
      last_token_id: "0",
      admin: accounts[0],
      permit_counter: "0",
      permits: MichelsonMap.fromLiteral({}),
      default_expiry: "1000",
      totalMinterShares: "0",
    }
  );

  console.log(`FA2 token: ${contractAddress}`);
};
