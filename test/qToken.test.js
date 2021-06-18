const { MichelsonMap } = require("@taquito/michelson-encoder");
const { InMemorySigner } = require("@taquito/signer");
const { TezosToolkit } = require("@taquito/taquito");

const { accounts } = require("../scripts/sandbox/accounts");
const { accountsMap } = require("../scripts/sandbox/accounts");

const { rejects, ok, strictEqual } = require("assert");

const { FA2 } = require("../test/utills/FA2");
const { Utils } = require("../test/utills/Utils");

const { confirmOperation } = require("../scripts/confirmation");
const { minters } = require("../storage/FA2");

require("ts-node").register({
  files: true,
});

const tokenMetadata = MichelsonMap.fromLiteral({
      symbol: Buffer.from("QST").toString("hex"),
      name: Buffer.from("QSTT").toString("hex"),
      decimals: Buffer.from("6").toString("hex"),
      icon: Buffer.from("").toString("hex"),
    });

describe("Test Q token", async function () {
  var tezos;
  var fa2;

  before("setup", async () => {
    tezos = await Utils.initTezos();
    fa2 = await FA2.originate(tezos);
  });

  it("set new admin", async () => {
    tezos = await Utils.setProvider(tezos, accountsMap.get(accounts[0]));
    await fa2.updateAdmin(accounts[1]);
    await fa2.updateStorage();

    strictEqual(fa2.storage.admin, accounts[1]);
  });

  it("create new token", async () => {
    tezos = await Utils.setProvider(tezos, accountsMap.get(accounts[1]));
    await fa2.createToken(tokenMetadata);
    await fa2.updateStorage();

    console.log(await fa2.storage.token_metadata.get(0))
    console.log(await fa2.storage.token_metadata.get(1))
    console.log(fa2.storage.tokens_ids)
  });

  it("set minters", async () => {
    tezos = await Utils.setProvider(tezos, accountsMap.get(accounts[1]));
    await fa2.updateMinters(accounts[0], 1, 20);
    await fa2.updateStorage();

    strictEqual(fa2.storage.minters[0], accounts[0]);
  });

  it("mint tokens by adm", async () => {
    tezos = await Utils.setProvider(tezos, accountsMap.get(accounts[1]));

    await fa2.mint([{token_id:0, receiver:accounts[1], amount:10}]);
    await fa2.updateStorage();

    console.log(await fa2.storage.token_info.get(0));
  });

  it("mint zero_tokens by minter", async () => {
    tezos = await Utils.setProvider(tezos, accountsMap.get(accounts[0]));

    await fa2.mintZero(500);
    await fa2.updateStorage();

    console.log(await fa2.storage.token_info.get(0));
  });
});