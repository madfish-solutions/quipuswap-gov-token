const { MichelsonMap } = require("@taquito/michelson-encoder");
const { InMemorySigner } = require("@taquito/signer");
const { TezosToolkit } = require("@taquito/taquito");

const { alice, bob, carol, peter } = require("../scripts/sandbox/accounts2");

const { rejects, strictEqual } = require("assert");

const { FA2 } = require("../test/utills/FA2");
const { Utils } = require("../test/utills/Utils");

const { confirmOperation } = require("../scripts/confirmation");

const { hex2buf } = require("@taquito/utils");
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
  let tezos;
  let fa2;
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
  });

  it("set new admin (by not admin)", async () => {
    try {
      tezos = await Utils.setProvider(tezos, carol.sk);
      await fa2.updateAdmin(alice.pkh);
      await fa2.updateStorage();

      strictEqual(fa2.storage.admin, alice.pkh);
    } catch (e) {
      console.log("error. Not Admin");
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
      console.log("error. Not Admin");
    }
  });

  it("create new token (by admin)", async () => {
    tezos = await Utils.setProvider(tezos, alice.sk);
    await fa2.createToken(tokenMetadata);
    await fa2.updateStorage();

    console.log(
      "Metadata [token_id: 1]: ",
      await fa2.storage.token_metadata.get(1)
    );
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
      console.log("error. Not Admin");
    }
  });

  it("set minters (by admin)", async () => {
    tezos = await Utils.setProvider(tezos, alice.sk);
    await fa2.setMinters([
      { minter: carol.pkh, share: 50 },
      { minter: bob.pkh, share: 20 },
    ]);
    await fa2.updateStorage();

    strictEqual(await fa2.storage.minters_info.get(bob.pkh).toString(), "20");
    strictEqual(await fa2.storage.minters_info.get(carol.pkh).toString(), "50");
  });

  it("add minter (by admin)", async () => {
    tezos = await Utils.setProvider(tezos, alice.sk);

    await fa2.updateMinter(bob.pkh, 50);
    await fa2.updateStorage();

    await fa2.updateMinter(peter.pkh, 10);
    await fa2.updateStorage();

    strictEqual(await fa2.storage.minters_info.get(bob.pkh).toString(), "50");
    strictEqual(await fa2.storage.minters_info.get(carol.pkh).toString(), "50");
    strictEqual(await fa2.storage.minters_info.get(peter.pkh).toString(), "10");
  });

  it("delete minter (by admin)", async () => {
    tezos = await Utils.setProvider(tezos, alice.sk);

    await fa2.updateMinter(peter.pkh, 0);
    await fa2.updateStorage();

    strictEqual(await fa2.storage.minters_info.get(bob.pkh).toString(), "50");
    strictEqual(await fa2.storage.minters_info.get(carol.pkh).toString(), "50");
    strictEqual(await fa2.storage.minters_info.get(peter.pkh), undefined);
  });

  it("default mint token [0] (by adm)", async () => {
    try {
      tezos = await Utils.setProvider(tezos, alice.sk);

      await fa2.mint([{ token_id: 0, receiver: alice.pkh, amount: 10 }]);
      await fa2.updateStorage();

      console.log(
        "Token info [0]: ",
        await fa2.storage.token_info.get(0).toString()
      );
    } catch (e) {
      console.log("error. Not Minter");
    }
  });

  it("default mint token [1] (by adm)", async () => {
    tezos = await Utils.setProvider(tezos, alice.sk);

    await fa2.mint([{ token_id: 1, receiver: alice.pkh, amount: 15 }]);
    await fa2.updateStorage();

    let getStorage = await fa2.storage.account_info.get(alice.pkh);

    // Check Alice balance
    strictEqual(await getStorage.balances.get("1").toString(), "15");
    // Check Storage token balance
    const big_num_info = await fa2.storage.token_info.get(1);
    strictEqual(await big_num_info.toString(), "15");
  });

  it("default mint token [2] (by adm)", async () => {
    try {
      tezos = await Utils.setProvider(tezos, alice.sk);

      await fa2.mint([{ token_id: 2, receiver: alice.pkh, amount: 25 }]);
      await fa2.updateStorage();

      // Check Storage token balance
      const big_num_info = await fa2.storage.token_info.get(2);
      strictEqual(await big_num_info.toString(), "25");
    } catch (e) {
      console.log("error. Token not defined");
    }
  });

  it("mint zero_tokens (by not minter)", async () => {
    try {
      tezos = await Utils.setProvider(tezos, peter.sk);
      await fa2.mintZero([{ receiver: peter.pkh, amount: 500 }]);
      await fa2.updateStorage();

      let getStorage = await fa2.storage.account_info.get(peter.pkh);
      strictEqual(await getStorage.balances.get("0").toString(), "0");
    } catch (e) {
      console.log("error. Not Minter");
    }
  });

  it("mint zero_tokens (by minter)", async () => {
    // Check Storage token balance
    strictEqual(await fa2.storage.token_info.get(0), undefined);

    tezos = await Utils.setProvider(tezos, carol.sk);
    await fa2.mintZero([
      { receiver: carol.pkh, amount: 900 },
      { receiver: carol.pkh, amount: 100 },
    ]);
    await fa2.updateStorage();

    let getStorage = await fa2.storage.account_info.get(carol.pkh);
    strictEqual(await getStorage.balances.get("0").toString(), "1000");

    getStorage = await fa2.storage.account_info.get(bob.pkh);
    strictEqual(await getStorage.balances.get("0").toString(), "1000");

    tezos = await Utils.setProvider(tezos, bob.sk);
    await fa2.mintZero([
      { receiver: bob.pkh, amount: 1000 },
      { receiver: carol.pkh, amount: 1000 },
    ]);
    await fa2.updateStorage();

    // // Total balance [0] after one more Carol mint
    getStorage = await fa2.storage.account_info.get(carol.pkh);
    strictEqual(await getStorage.balances.get("0").toString(), "4000");

    // // Total balance [0] after one more Bob mint
    getStorage = await fa2.storage.account_info.get(bob.pkh);
    strictEqual(await getStorage.balances.get("0").toString(), "2000");
    // Total balance [0] after mint Bob and Carol
    const big_num_info = await fa2.storage.token_info.get(0);
    strictEqual(await big_num_info.toString(), "6000");
  });

  it("update minters shares (by admin)", async () => {
    tezos = await Utils.setProvider(tezos, alice.sk);

    await fa2.updateMinter(bob.pkh, 20);
    await fa2.updateStorage();

    strictEqual(await fa2.storage.minters_info.get(bob.pkh).toString(), "20");
    strictEqual(await fa2.storage.minters_info.get(carol.pkh).toString(), "50");
  });

  it("mint after update zero_tokens (by minter)", async () => {
    // Check Storage token balance
    let big_num_info = await fa2.storage.token_info.get(0);
    strictEqual(await big_num_info.toString(), "6000");

    tezos = await Utils.setProvider(tezos, carol.sk);
    await fa2.mintZero([
      { receiver: carol.pkh, amount: 900 },
      { receiver: carol.pkh, amount: 100 },
    ]);
    await fa2.updateStorage();

    let getStorage = await fa2.storage.account_info.get(carol.pkh);
    strictEqual(await getStorage.balances.get("0").toString(), "5000");

    getStorage = await fa2.storage.account_info.get(bob.pkh);
    strictEqual(await getStorage.balances.get("0").toString(), "2400");

    tezos = await Utils.setProvider(tezos, bob.sk);
    await fa2.mintZero([
      { receiver: bob.pkh, amount: 1000 },
      { receiver: carol.pkh, amount: 1000 },
    ]);
    await fa2.updateStorage();

    // // Total balance [0] after one more Carol mint
    getStorage = await fa2.storage.account_info.get(carol.pkh);
    strictEqual(await getStorage.balances.get("0").toString(), "11000");

    // // Total balance [0] after one more Bob mint
    getStorage = await fa2.storage.account_info.get(bob.pkh);
    strictEqual(await getStorage.balances.get("0").toString(), "3400");
    // Total balance [0] after mint Bob and Carol
    big_num_info = await fa2.storage.token_info.get(0);
    strictEqual(await big_num_info.toString(), "14400");
  });

  it("mint max zero_tokens (by minter)", async () => {
    tezos = await Utils.setProvider(tezos, carol.sk);
    await fa2.mintZero([{ receiver: carol.pkh, amount: 7142857142256 }]);
    await fa2.updateStorage();

    // Check Carol balance
    getStorage = await fa2.storage.account_info.get(carol.pkh);
    strictEqual(await getStorage.balances.get("0").toString(), "7142857139698");

    // Check Bob balance
    getStorage = await fa2.storage.account_info.get(bob.pkh);
    strictEqual(await getStorage.balances.get("0").toString(), "2857142860302");

    // Total balance [0] after mint Carol
    let big_num_info = await fa2.storage.token_info.get(0);
    strictEqual(await big_num_info.toString(), "10000000000000");
  });

  it("mint more then max zero_tokens (by minter)", async () => {
    try {
      tezos = await Utils.setProvider(tezos, carol.sk);
      await fa2.mintZero([{ receiver: carol.pkh, amount: 20000 }]);
      await fa2.updateStorage();

      // Carol balance has not changed
      getStorage = await fa2.storage.account_info.get(carol.pkh);
      strictEqual(
        await getStorage.balances.get("0").toString(),
        "7142857139698"
      );

      // Total balance [0] after mint Carol
      const big_num_info = await fa2.storage.token_info.get(0);
      strictEqual(await big_num_info.toString(), "10000000000000");
    } catch (e) {
      console.log("error. Max limit");
    }
  });

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

  it("bob generates permit, alice submits it, bob sets expiry", async () => {
    let transferParams = [
      {
        from_: bob.pkh,
        txs: [{ to_: alice.pkh, token_id: 0, amount: 11 }],
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

    const permitContractBob = await tzBob.contract.at(contractAddress);
    op = await permitContractBob.methods
      .set_expiry(bob.pkh, 60, permitHash)
      .send();
    await op.confirmation();

    let storage = await permitContractAlice.storage();
    let permitValue = await storage.permits
      .get(bob.pkh)
      .then((bobs_permits) => bobs_permits.permits);
    console.log(permitValue.has(permitHash));

    console.log("permit value", permitValue);

    let permitExpiry = await storage.permits
      .get(bob.pkh)
      .then((bobs_permits) => bobs_permits.expiry);

    let permit = await permitValue.get(permitHash);
    strictEqual(permit.expiry.toNumber(), 60);
  });

  it("carol calls entrypoint on bob's behalf, but its too late", async () => {
    let transferParams2 = [
      {
        from_: bob.pkh,
        txs: [{ to_: alice.pkh, token_id: 0, amount: 11 }],
      },
    ];

    let permitContractCarol = await tzCarol.contract.at(contractAddress);

    rejects(await permitContractCarol.methods.transfer(transferParams2).send());
  });
});
