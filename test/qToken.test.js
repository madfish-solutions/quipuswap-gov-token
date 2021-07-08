const { MichelsonMap } = require("@taquito/michelson-encoder");
const { InMemorySigner } = require("@taquito/signer");
const { TezosToolkit } = require("@taquito/taquito");

const { accounts } = require("../scripts/sandbox/accounts");
const { accountsMap } = require("../scripts/sandbox/accounts");
const { alice, bob, carol, peter } = require("../scripts/sandbox/accounts2");

const { rejects, ok, strictEqual } = require("assert");

const { FA2 } = require("../test/utills/FA2");
const { Utils } = require("../test/utills/Utils");

const { confirmOperation } = require("../scripts/confirmation");
const { minters } = require("../storage/FA2");
const BigNumber = require("bignumber.js");

const { buf2hex, hex2buf } = require("@taquito/utils");
const blake = require("blakejs");

const tokenMetadata = MichelsonMap.fromLiteral({
  symbol: Buffer.from("QST").toString("hex"),
  name: Buffer.from("QSTT").toString("hex"),
  decimals: Buffer.from("6").toString("hex"),
  icon: Buffer.from("").toString("hex"),
});

async function getTezosFor(secretKey) {
  let tz = new TezosToolkit("http://136.244.96.28:8732");
  tz.setProvider({ signer: new InMemorySigner(secretKey) });
  return tz;
}

describe("Test Q token", async function () {
  var tezos;
  var fa2;
  let contractAddress;
  let tzAlice, tzBob, tzCarol;

  before("setup", async () => {
    tzAlice = await getTezosFor(alice.sk);
    tzBob = await getTezosFor(bob.sk);
    tzCarol = await getTezosFor(carol.sk);
    tezos = await Utils.initTezos();
    fa2 = await FA2.originate(tezos);
    contractAddress = fa2.contract.address;

    tezos = await Utils.setProvider(tezos, alice.sk);

    let operation = await tezos.contract.transfer({
      to: carol.pkh,
      amount: 50000000,
      mutez: true,
    });
    await confirmOperation(tezos, operation.hash);

    operation = await tezos.contract.transfer({
      to: peter.pkh,
      amount: 50000000,
      mutez: true,
    });
    await confirmOperation(tezos, operation.hash);

    console.log("acc2", await tezos.tz.getBalance(carol.pkh));
    console.log("acc3", await tezos.tz.getBalance(peter.pkh));
  });

  it("set new admin (by not admin)", async () => {
    try {
      tezos = await Utils.setProvider(tezos, carol.sk);
      await fa2.updateAdmin(alice.pkh);
      await fa2.updateStorage();

      strictEqual(fa2.storage.admin, alice.pkh);
    } catch (e) {
      console.log("error");
    }
  });

  it("set new admin (by admin)", async () => {
    tezos = await Utils.setProvider(tezos, bob.sk);
    await fa2.updateAdmin(alice.pkh);
    await fa2.updateStorage();

    strictEqual(fa2.storage.admin, alice.pkh);
  });

  it("create new token (by not admin)", async () => {
    try {
      tezos = await Utils.setProvider(tezos, bob.sk);
      await fa2.createToken(tokenMetadata);
      await fa2.updateStorage();

      console.log("Metadata [1]: ", await fa2.storage.token_metadata.get(1));
    } catch (e) {
      console.log("error");
    }
  });

  it("create new token (by admin)", async () => {
    tezos = await Utils.setProvider(tezos, alice.sk);
    await fa2.createToken(tokenMetadata);
    await fa2.updateStorage();

    console.log("Metadata [1]: ", await fa2.storage.token_metadata.get(1));
  });

  it("set minters (by not admin)", async () => {
    try {
      tezos = await Utils.setProvider(tezos, bob.sk);

      await fa2.setMinters([
        { minter: carol.pkh, share: 8 },
        { minter: bob.pkh, share: 2 },
      ]);
      await fa2.updateStorage();
    } catch (e) {
      console.log("error");
    }
  });

  it("set minters (by admin)", async () => {
    tezos = await Utils.setProvider(tezos, alice.sk);
    await fa2.setMinters([
      { minter: carol.pkh, share: 1 },
      { minter: bob.pkh, share: 20 },
    ]);
    await fa2.updateStorage();

    // strictEqual(fa2.storage.minters[0], carol.pkh);
    // strictEqual(fa2.storage.minters[1], bob.pkh);
  });

  it("add minter (by admin)", async () => {
    tezos = await Utils.setProvider(tezos, alice.sk);

    await fa2.updateMinter(bob.pkh, 120);
    await fa2.updateStorage();

    await fa2.updateMinter(peter.pkh, 10);
    await fa2.updateStorage();

    // strictEqual(fa2.storage.minters[2], bob.pkh);
    // strictEqual(fa2.storage.minters[1], peter.pkh);
    // strictEqual(fa2.storage.minters[0], carol.pkh);
  });

  it("delete minter (by admin)", async () => {
    tezos = await Utils.setProvider(tezos, alice.sk);

    await fa2.updateMinter(peter.pkh, 0);
    await fa2.updateStorage();

    // strictEqual(fa2.storage.minters[1], bob.pkh);
    // strictEqual(fa2.storage.minters[0], carol.pkh);
    // strictEqual(fa2.storage.minters[2], undefined);
  });

  it("mint token [0] (by adm)", async () => {
    try {
      tezos = await Utils.setProvider(tezos, alice.sk);

      await fa2.mint([{ token_id: 0, receiver: alice.pkh, amount: 10 }]);
      await fa2.updateStorage();

      console.log(
        "Token info [0]: ",
        await fa2.storage.token_info.get(0).toString()
      );
    } catch (e) {
      console.log("error");
    }
  });

  it("mint token [1] (by adm)", async () => {
    tezos = await Utils.setProvider(tezos, alice.sk);

    await fa2.mint([{ token_id: 1, receiver: alice.pkh, amount: 15 }]);
    await fa2.updateStorage();

    let getStorage = await fa2.storage.account_info.get(alice.pkh);
    console.log(
      "Alice balance: ",
      await getStorage.balances.get("1").toString()
    );

    console.log("Token info [1]: ", await fa2.storage.token_info.get(1));
  });

  it("mint token [2] (by adm)", async () => {
    try {
      tezos = await Utils.setProvider(tezos, alice.sk);

      await fa2.mint([{ token_id: 2, receiver: alice.pkh, amount: 25 }]);
      await fa2.updateStorage();

      console.log("Token info [2]: ", await fa2.storage.token_info.get(2));
    } catch (e) {
      console.log("error");
    }
  });

  it("mint zero_tokens (by not minter)", async () => {
    try {
      tezos = await Utils.setProvider(tezos, peter.sk);
      await fa2.mintZero(500);
      await fa2.updateStorage();
    } catch (e) {
      console.log("error not minter");
    }
  });

  it("mint zero_tokens (by minter)", async () => {
    console.log("Total balance [0]: ", await fa2.storage.token_info.get(0));
    tezos = await Utils.setProvider(tezos, carol.sk);
    await fa2.mintZero(1000);
    await fa2.updateStorage();

    let getStorage = await fa2.storage.account_info.get(carol.pkh);
    console.log(
      "Carol balance: ",
      await getStorage.balances.get("0").toString()
    );
    getStorage = await fa2.storage.account_info.get(bob.pkh);
    console.log("Bob balance: ", getStorage.balances.get("0").toString());

    tezos = await Utils.setProvider(tezos, bob.sk);
    await fa2.mintZero(1000);
    await fa2.updateStorage();

    getStorage = await fa2.storage.account_info.get(carol.pkh);
    console.log(
      "Carol balance 1: ",
      await getStorage.balances.get("0").toString()
    );
    getStorage = await fa2.storage.account_info.get(bob.pkh);
    console.log("Bob balance 1: ", getStorage.balances.get("0").toString());

    console.log("Total balance [0]: ", await fa2.storage.token_info.get(0));
  });

  // it("mint max zero_tokens (by minter)", async () => {
  //   tezos = await Utils.setProvider(tezos, carol.sk);
  //   await fa2.mintZero(9999980000000);
  //   await fa2.updateStorage();

  //   let getStorage = await fa2.storage.account_info.get(carol.pkh);
  //   console.log("Carol balance: ", await getStorage.balances.get("0").toString());

  //   tezos = await Utils.setProvider(tezos, bob.sk);
  //   await fa2.mintZero(10000000);
  //   await fa2.updateStorage();

  //   getStorage = await fa2.storage.account_info.get(bob.pkh);
  //   console.log("Bob balance: ", await getStorage.balances.get("0").toString());

  //   console.log("Total balance [0]: ", await fa2.storage.token_info.get(0));
  // });

  // it("mint more then max zero_tokens (by minter)", async () => {
  //   try {
  //     tezos = await Utils.setProvider(tezos, carol.sk);
  //     await fa2.mintZero(1);
  //     await fa2.updateStorage();

  //     let getStorage = await fa2.storage.account_info.get(carol.pkh);
  //     console.log(getStorage);
  //     console.log("Carol balance: ", await getStorage.balances.get("0").toString());

  //     console.log("Total balance [0]: ", await fa2.storage.token_info.get(0).toString());
  //   } catch (e) {
  //     console.log("error max limit");
  //   }
  // });

  // // Permit part

  // // TODO: FAILWITH returns Michelson. Use taquito machinery to parse it.
  function getBytesToSignFromErrors(errors) {
    const errors_with = errors
      .filter((x) => x.with !== undefined)
      .map((x) => x.with);
    if (errors_with.length != 1)
      throw [
        'errors_to_missigned_bytes: expected one error to fail "with" michelson, but found:',
        errors_with,
      ];

    const error_with = errors_with[0];
    if (error_with.prim !== "Pair")
      throw [
        'errors_to_missigned_bytes: expected a "Pair", but found:',
        error_with.prim,
      ];
    const error_with_args = error_with.args;
    if (error_with_args.length !== 2)
      throw [
        'errors_to_missigned_bytes: expected two arguments to "Pair", but found:',
        error_with_args,
      ];

    if (error_with_args[0].string.toLowerCase() !== "missigned")
      throw [
        'errors_to_missigned_bytes: expected a "missigned" annotation, but found:',
        error_with_args[0],
      ];

    if (typeof error_with_args[1].bytes !== "string")
      throw [
        "errors_to_missigned_bytes: expected bytes, but found:",
        error_with_args[1],
      ];

    return error_with_args[1].bytes;
  }

  async function permitParamHash(tz, contract, entrypoint, parameter) {
    const raw_packed = await tz.rpc.packData({
      data: contract.parameterSchema.Encode(entrypoint, parameter),
      type: contract.parameterSchema.root.typeWithoutAnnotations(),
    });
    console.log(`PACKED PARAM: ${raw_packed.packed}`);
    return blake.blake2bHex(hex2buf(raw_packed.packed), null, 32);
  }

  async function createPermitPayload(tz, contract, entrypoint, params) {
    const signer_key = await tz.signer.publicKey();
    const dummy_sig = await tz.signer.sign("abcd").then((s) => s.prefixSig);
    const param_hash = await permitParamHash(tz, contract, entrypoint, params);
    const transfer_params = contract.methods
      .permit(signer_key, dummy_sig, param_hash)
      .toTransferParams();
    const bytesToSign = await tz.estimate
      .transfer(transfer_params)
      .catch((e) => getBytesToSignFromErrors(e.errors));
    console.log(`param hash ${param_hash}`);
    console.log(`bytes to sign ${bytesToSign}`);
    const sig = await tz.signer.sign(bytesToSign).then((s) => s.prefixSig);
    return [signer_key, sig, param_hash];
  }
  it("bob generates permit payload, alice submits it to contract", async () => {
    let transferParams = [
      {
        from_: bob.pkh,
        txs: [{ to_: alice.pkh, token_id: 0, amount: 10 }],
      },
    ];

    let permitContractAlice = await tzAlice.contract.at(contractAddress);
    let [bobsKey, bobsSig, permitHash] = await createPermitPayload(
      tzBob,
      fa2.contract,
      "transfer",
      transferParams
    );
    let op = await permitContractAlice.methods
      .permit(bobsKey, bobsSig, permitHash)
      .send();
    await op.confirmation();

    let storage = await permitContractAlice.storage();
    let permitValue = await storage.permits
      .get(bob.pkh)
      .then((bobs_permits) => bobs_permits.permits);
    console.log(permitValue.has(permitHash));
  });

  it("carol calls contract entrypoint on bob's behalf", async () => {
    let transferParams2 = [
      {
        from_: bob.pkh,
        txs: [{ to_: alice.pkh, token_id: 0, amount: 10 }],
      },
    ];

    let permitContractCarol = await tzCarol.contract.at(contractAddress);
    let op = await permitContractCarol.methods.transfer(transferParams2).send();
    await op.confirmation();
  });

  it("carol can't use bob's transfer anymore", async () => {
    let permitContractCarol = await tzCarol.contract.at(contractAddress);
    try {
      let transferParams2 = [
        {
          from_: bob.pkh,
          txs: [{ to_: alice.pkh, token_id: 0, amount: 10 }],
        },
      ];

      let op = await permitContractCarol.methods
        .transfer(transferParams2)
        .send();
      await op.confirmation();
    } catch (e) {
      console.log("Error message");
    }
  });
});
