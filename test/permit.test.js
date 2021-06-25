
const BigNumber = require("bignumber.js")
const { TezosToolkit } = require("@taquito/taquito");
const { InMemorySigner } = require("@taquito/signer");
const { MichelsonMap } = require("@taquito/michelson-encoder");

// const Permit = artifacts.require("FA2");
const { FA2 } = require("../test/utills/FA2");
const { Utils } = require("../test/utills/Utils");
const { confirmOperation } = require("../scripts/confirmation");

const { alice, bob, carol } = require('../scripts/sandbox/accounts2');
const { buf2hex, hex2buf } = require("@taquito/utils");
const blake = require("blakejs");

var fa2;
var tezos;

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
describe('Permit', async function () {
  let contractAddress;
  let tzAlice, tzBob, tzCarol;

  before(async() => {
    tzAlice = await getTezosFor(alice.sk);
    tzBob = await getTezosFor(bob.sk);
    tzCarol = await getTezosFor(carol.sk);
    tezos = await Utils.initTezos();
    fa2 = await FA2.originate(tezos);
    contractAddress = fa2.contract.address;
  });

  it("bob generates permit payload, alice submits it to contract", async () => {
    let permitContractAlice = await tzAlice.contract.at(contractAddress);
    let [bobsKey, bobsSig, permitHash] = await createPermitPayload(tzBob, fa2.contract, 'accumulate', 5);
    let op = await permitContractAlice.methods.permit(bobsKey, bobsSig, permitHash).send();
    await op.confirmation();

    let storage = await permitContractAlice.storage();
    let permitValue = await storage.permits.get(bob.pkh).then(bobs_permits => bobs_permits.permits);
    console.log(permitValue.has(permitHash));
  });

    it("carol calls contract entrypoint on bob's behalf", async () => {
      let permitContractCarol = await tzBob.contract.at(contractAddress);
      let op = await permitContractCarol.methods.accumulate(5).send();
      await op.confirmation();

      let storage = await permitContractCarol.storage();
      let permitValue = await storage.permits.get(bob.pkh).then(bobs_permits => bobs_permits.permits)
      console.log(storage.bobs_accumulator == 5);
      console.log(permitValue.size == 0);
    });

  it("carol can't use bob's accumulator anymore", async () => {
    let permitContractCarol = await tzBob.contract.at(contractAddress);
    try {
      let op = await permitContractCarol.methods.accumulate(6).send();
      await op.confirmation();
    } catch(e) {
      console.log(
// TODO: add "bytes_to_sign" to the error message of permitted entrypoint
`Error message ${e.errors[1].with.args[0].args[0].string}
Packed parameter ${e.errors[1].with.args[0].args[1].bytes}
Parameter hash ${e.errors[1].with.args[1].bytes}`)
    }
  });

});
