require("dotenv").config();

const { alice, dev, devF } = require("./scripts/sandbox/accounts");

module.exports = {
  outputFile: "output.txt",
  confirmationPollingTimeoutSecond: 2000000,
  syncInterval: 0, // 0 for tests, 5000 for deploying
  confirmTimeout: 90000, // 90000 for tests, 180000 for deploying
  buildDir: "build",
  migrationsDir: "migrations",
  contractsDir: "contracts/main",
  ligoVersion: "0.17.0",
  network: "florencenet",
  networks: {
    development: {
      host: "http://136.244.96.28",
      port: 8732,
      network_id: "*",
      secretKey: alice.sk,
    },
    granadanet: {
      rpc: "https://granadanet.smartpy.io",
      port: 443,
      network_id: "*",
      secretKey: dev.sk,
    },
    granadanet2: {
      rpc: "https://granadanet.smartpy.io",
      port: 443,
      network_id: "*",
      secretKey: dev.sk,
    },
    florencenet: {
      host: "https://florencenet.smartpy.io",
      port: 443,
      network_id: "*",
      secretKey: devF.sk,
      type: "tezos",
    },
    mainnet: {
      host: "https://mainnet.smartpy.io",
      port: 443,
      network_id: "*",
      secretKey: alice.sk,
    },
  },
};
