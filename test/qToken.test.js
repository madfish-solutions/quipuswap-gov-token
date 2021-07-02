const { MichelsonMap } = require("@taquito/michelson-encoder");
const { InMemorySigner } = require("@taquito/signer");
const { TezosToolkit } = require("@taquito/taquito");

const { accounts } = require("../scripts/sandbox/accounts");
const { accountsMap } = require("../scripts/sandbox/accounts");
const { alice, bob, carol } = require('../scripts/sandbox/accounts2');

const { rejects, ok, strictEqual } = require("assert");

const { FA2 } = require("../test/utills/FA2");
const { Utils } = require("../test/utills/Utils");

const { confirmOperation } = require("../scripts/confirmation");
const { minters } = require("../storage/FA2");
const BigNumber = require("bignumber.js")

const { buf2hex, hex2buf } = require("@taquito/utils");
const blake = require("blakejs");

const tokenMetadata = MichelsonMap.fromLiteral({
      symbol: Buffer.from("QST").toString("hex"),
      name: Buffer.from("QSTT").toString("hex"),
      decimals: Buffer.from("6").toString("hex"),
      icon: Buffer.from("").toString("hex"),
    });

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

    // let operation = await tezos.contract.transfer({
    //   to: carol.pkh,
    //   amount: 50000000,
    //   mutez: true,
    // });
    // await confirmOperation(tezos, operation.hash)

    console.log("acc2", await tezos.tz.getBalance(carol.pkh));
  });

  it("set new admin", async () => {
    tezos = await Utils.setProvider(tezos, alice.sk);
    await fa2.updateAdmin(bob.pkh);
    await fa2.updateStorage();

    strictEqual(fa2.storage.admin, bob.pkh);
  });

  it("create new token", async () => {
    tezos = await Utils.setProvider(tezos, bob.sk);
    await fa2.createToken(tokenMetadata);
    await fa2.updateStorage();

    // console.log(await fa2.storage.token_metadata.get(0))
    // console.log(await fa2.storage.token_metadata.get(1))
    // console.log(fa2.storage.tokens_ids)
  });

  it("set minters", async () => {
    tezos = await Utils.setProvider(tezos, bob.sk);

    await fa2.updateMinters(carol.pkh, 1, 80);
    await fa2.updateStorage();

    await fa2.updateMinters(alice.pkh, 1, 50);
    await fa2.updateStorage();

    await fa2.updateMinters(bob.pkh, 1, 20);
    await fa2.updateStorage();

    // strictEqual(fa2.storage.minters[1], alice.pkh);
    // strictEqual(fa2.storage.minters[0], carol.pkh);
  });

  it("mint token [1] by adm", async () => {
    tezos = await Utils.setProvider(tezos, bob.sk);

    await fa2.mint([{token_id:1, receiver:bob.pkh, amount:10}]);
    await fa2.updateStorage();

    console.log(await fa2.storage.token_info.get(1));
  });

  it("mint zero_tokens by non-minter", async () => {

    try {
          tezos = await Utils.setProvider(tezos, bob.sk);
          await fa2.mintZero(500);
          await fa2.updateStorage();
        } catch(e) {
          console.log(
            "error"
          )
        }
  });

  it("mint zero_tokens by minter", async () => {
    tezos = await Utils.setProvider(tezos, alice.sk);
    await fa2.mintZero(5000000);
    await fa2.updateStorage();

    tezos = await Utils.setProvider(tezos, carol.sk);
    await fa2.mintZero(5000000);
    await fa2.updateStorage();

    tezos = await Utils.setProvider(tezos, bob.sk);
    await fa2.mintZero(5000000);
    await fa2.updateStorage();

    // console.log(await fa2.storage.token_info.get(0));
  });

async function getTezosFor(secretKey) {
  let tz = new TezosToolkit("http://136.244.96.28:8732");
  tz.setProvider({ signer: new InMemorySigner(secretKey) });
  return tz
}

// TODO: FAILWITH returns Michelson. Use taquito machinery to parse it.
function getBytesToSignFromErrors(errors) {
  const errors_with = errors.filter(x => x.with !== undefined).map(x => x.with);
  if (errors_with.length != 1)
    throw ['errors_to_missigned_bytes: expected one error to fail "with" michelson, but found:', errors_with]

  const error_with = errors_with[0];
  if (error_with.prim !== 'Pair')
    throw ['errors_to_missigned_bytes: expected a "Pair", but found:', error_with.prim]
  const error_with_args = error_with.args;
  if (error_with_args.length !== 2)
    throw ['errors_to_missigned_bytes: expected two arguments to "Pair", but found:', error_with_args]

  if (error_with_args[0].string.toLowerCase() !== 'missigned')
    throw ['errors_to_missigned_bytes: expected a "missigned" annotation, but found:', error_with_args[0]]

  if (typeof error_with_args[1].bytes !== 'string')
    throw ['errors_to_missigned_bytes: expected bytes, but found:', error_with_args[1]]

  return error_with_args[1].bytes
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
  const dummy_sig = await tz.signer.sign('abcd').then(s => s.prefixSig);
  const param_hash = await permitParamHash(tz, contract, entrypoint, params);
  const transfer_params = contract.methods.permit(signer_key, dummy_sig, param_hash).toTransferParams();
  const bytesToSign = await tz.estimate.transfer(transfer_params).catch((e) => getBytesToSignFromErrors(e.errors));
  console.log(`param hash ${param_hash}`);
  console.log(`bytes to sign ${bytesToSign}`);
  const sig = await tz.signer.sign(bytesToSign).then(s => s.prefixSig);
  return [signer_key, sig, param_hash];
}
  it("bob generates permit payload, alice submits it to contract", async () => {
    let transferParams = [{
      from_: bob.pkh,
      txs: [
        { to_: alice.pkh, token_id: 0, amount: 10 },
      ],
    }];

    let permitContractAlice = await tzAlice.contract.at(contractAddress);
    let [bobsKey, bobsSig, permitHash] = await createPermitPayload(tzBob, fa2.contract, 'transfer', transferParams);
    let op = await permitContractAlice.methods.permit(bobsKey, bobsSig, permitHash).send();
    await op.confirmation();

    let storage = await permitContractAlice.storage();
    let permitValue = await storage.permits.get(bob.pkh).then(bobs_permits => bobs_permits.permits);
    console.log(permitValue.has(permitHash));

    // let permitContractBob = await tzBob.contract.at(contractAddress);

    // op = await permitContractBob.methods.set_expiry(bob.pkh, 10000, permitHash).send();
    // await op.confirmation();

    // var r = await fa2.storage.permits.get(bob.pkh)
    // console.log(await r.permits.get(permitHash))
  });

  it("carol calls contract entrypoint on bob's behalf", async () => {
    let transferParams2 = [{
      from_: bob.pkh,
      txs: [
        { to_: alice.pkh, token_id: 0, amount: 10 },
      ],
    }];

    let permitContractCarol = await tzCarol.contract.at(contractAddress);
    let op = await permitContractCarol.methods.transfer(transferParams2).send();
    await op.confirmation();

    let storage = await permitContractCarol.storage();
    let permitValue = await storage.permits.get(bob.pkh).then(bobs_permits => bobs_permits.permits)
    console.log(permitValue)
  });

  // it("carol can't use bob's accumulator anymore", async () => {
  //   let permitContractCarol = await tzCarol.contract.at(contractAddress);
  //   try {
  //     let op = await permitContractCarol.methods.accumulate(6).send();
  //     await op.confirmation();
  //   } catch(e) {
  //     console.log(
  //       // TODO: add "bytes_to_sign" to the error message of permitted entrypoint
  //       `Error message ${e.errors[1].with.args[0].args[0].string}
  //       Packed parameter ${e.errors[1].with.args[0].args[1].bytes}
  //       Parameter hash ${e.errors[1].with.args[1].bytes}`
  //     )
  //   }
  // });
});
