const { dev } = require("../scripts/sandbox/accounts");
const { migrate } = require("../scripts/helpers");
const { MichelsonMap } = require("@taquito/michelson-encoder");

const metadata = MichelsonMap.fromLiteral({
  "": Buffer.from("tezos-storage:qs", "ascii").toString("hex"),
  qs: Buffer.from(
    JSON.stringify({
      name: "Quipuswap Governance Token",
      version: "v1.0.0",
      description: "QUIPU token is used in QuipuSwap AMM governance and as a means of payment for future services.",
      authors: ["madfish.solutions"],
      source: {
        tools: ["Ligo", "Flextesa"],
        location: "https://ligolang.org/",
      },
      homepage:"https://quipuswap.com",
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
      symbol: Buffer.from("QUIPU").toString("hex"),
      name: Buffer.from("Quipuswap Governance Token").toString("hex"),
      decimals: Buffer.from("6").toString("hex"),
      thumbnailUri: Buffer.from("ipfs://QmcSH2iaipU1kqcQfZhV5b2CL6Rm8Q8agRwdk1xq38Y3sP").toString("hex"),
      is_transferable: Buffer.from("true").toString("hex"),
      is_boolean_amount: Buffer.from("false").toString("hex"),
      should_prefer_symbol: Buffer.from("false").toString("hex"),
    }),
  },
});

module.exports = async (tezos) => {
  const contractAddress = await migrate(tezos, "FA2", {
    account_info: MichelsonMap.fromLiteral({}),
    token_info: MichelsonMap.fromLiteral({}),
    metadata: metadata,
    token_metadata: tokenMetadata,
    minters_info: MichelsonMap.fromLiteral({
      "tz1heYY9Y1oFUtKHJnXEFnTB3NkSbRYF4JnQ": "71000000",
      "tz1VNvjvQPufKb38KYF6DC3PHWR8SVWEiHUW": "10000000",
      "tz1S63meJvu7Zzzs13wwWxnHD331RmECDX5N": "5000000",
      "tz1QwXUVrc5PadDZP32CaxkzsyNmh82utujf": "13500000",
      "tz1QSuWvtkZcpmNyyuyP8966TA5yeSLZaNyf": "500000",
    }),
    last_token_id: "1",
    admin: dev.pkh,
    permit_counter: "0",
    permits: MichelsonMap.fromLiteral({}),
    default_expiry: "1000",
    total_minter_shares: "100000000",
  });

  console.log(`FA2 token: ${contractAddress}`);
};
