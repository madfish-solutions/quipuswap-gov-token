require("dotenv").config();

const { alice } = require("./scripts/sandbox/accounts2");

module.exports = {
  outputFile: "output.txt",
  confirmationPollingTimeoutSecond: 2000000,
  syncInterval: 0, // 0 for tests, 5000 for deploying
  confirmTimeout: 90000, // 90000 for tests, 180000 for deploying
  buildDir: "build",
  migrationsDir: "migrations",
  contractsDir: "contracts/main",
  ligoVersion: "0.17.0",
  network: "development",
  networks: {
    development: {
      host: "http://136.244.96.28",
      port: 8732,
      network_id: "*",
      secretKey: alice.pkh,
    },
    florencenet: {
      host: "https://testnet-tezos.giganode.io",
      port: 443,
      network_id: "*",
      secretKey: alice.pkh,
    },
    mainnet: {
      host: "https://mainnet.smartpy.io",
      port: 443,
      network_id: "*",
      secretKey: alice.pkh,
    },
  },
};
