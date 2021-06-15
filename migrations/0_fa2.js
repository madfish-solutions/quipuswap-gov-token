const { accounts } = require('../scripts/sandbox/accounts');
const { migrate } = require("../scripts/helpers");
const { MichelsonMap } = require("@taquito/michelson-encoder");

module.exports = async (tezos) => {
  console.log(accounts[0]);
  const contractAddress = await migrate(
    tezos,
    "FA2",
    module.exports = {
        account_info: MichelsonMap.fromLiteral({}),
        token_info: MichelsonMap.fromLiteral({}),
        metadata: MichelsonMap.fromLiteral({}),
        token_metadata: MichelsonMap.fromLiteral({}),
        minters: [],
        minters_info: [],
        tokens_ids: [],
        admin: accounts[0],
    }
  );

  console.log(`FA2 token: ${contractAddress}`);
};
