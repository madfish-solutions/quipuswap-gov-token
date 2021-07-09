require("ts-node").register({
  files: true,
});

const { alice } = require('./scripts/sandbox/accounts2');
module.exports = {
  contracts_directory: "./contracts/main",
  networks: {
    development: {
      host: "http://localhost",
      port: 8732,
      network_id: "*",
      secretKey: alice.sk,
      type: "tezos",
    },
    development_server: {
      host: "http://136.244.96.28",
      port: 8732,
      network_id: "*",
      secretKey: alice.sk,
      type: "tezos"
    },
    florencenet: {
      host: "https://florencenet.smartpy.io",
      port: 443,
      network_id: "*",
      secretKey: alice.sk,
      type: "tezos",
    },
    edonet: {
      host: "https://edonet.smartpy.io",
      port: 443,
      network_id: "*",
      secretKey: alice.sk,
      type: "tezos",
    },
    delphinet: {
      host: "https://delphinet.smartpy.io",
      port: 443,
      network_id: "*",
      secretKey: alice.sk,
      type: "tezos",
    },
    mainnet: {
      host: "https://mainnet.smartpy.io",
      port: 443,
      network_id: "*",
      type: "tezos",
    },
  }
};
