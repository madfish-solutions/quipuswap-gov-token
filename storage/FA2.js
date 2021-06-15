const { MichelsonMap } = require("@taquito/michelson-encoder");

const { accounts } = require('../scripts/sandbox/accounts');

module.exports = {
    account_info: MichelsonMap.fromLiteral({}),
    token_info: MichelsonMap.fromLiteral({}),
    metadata: MichelsonMap.fromLiteral({}),
    token_metadata: MichelsonMap.fromLiteral({}),
    non_transferable: [],
    minters: [],
    minters_info: [],
    tokens_ids: [],
    admin: accounts[0],
};
