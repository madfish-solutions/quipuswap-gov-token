const { alice } = require('../../scripts/sandbox/accounts2');


require("dotenv").config();
require("ts-node").register({
  files: true,
});

const { TezosToolkit } = require("@taquito/taquito");
const { InMemorySigner } = require("@taquito/signer");

const env = require("../../env");

const defaultNetwork = "development";
const network = env.network || defaultNetwork;

class Utils {
  static async initTezos() {
    const tezos = new TezosToolkit("http://136.244.96.28:8732");

    tezos.setProvider({
      config: {
        confirmationPollingTimeoutSecond: env.confirmationPollingTimeoutSecond,
      },
      signer: await InMemorySigner.fromSecretKey(alice.sk),
    });

    return tezos;
  }

  static async setProvider(tezos, newProviderSK) {
    tezos.setProvider({
      signer: await InMemorySigner.fromSecretKey(newProviderSK),
    });

    return tezos;
  }
}

module.exports.Utils = Utils;
