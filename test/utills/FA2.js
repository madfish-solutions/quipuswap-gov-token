require("ts-node").register({
  files: true,
});

const fs = require("fs");

const env = require("../../env");

const { confirmOperation } = require("../../scripts/confirmation");

const storage = require("../../storage/FA2");

class FA2 {
  contract;
  storage;
  tezos;

  constructor(contract, tezos) {
    this.contract = contract;
    this.tezos = tezos;
  }

  static async init(qsAddress, tezos) {
    return new FA2(await tezos.contract.at(qsAddress), tezos);
  }

  static async originate(tezos) {
    const artifacts = JSON.parse(fs.readFileSync(`${env.buildDir}/FA2.json`));
    const operation = await tezos.contract
      .originate({
        code: artifacts.michelson,
        storage: storage,
      })
      .catch((e) => {
        console.error(JSON.stringify(e));

        return { contractAddress: null };
      });

    await confirmOperation(tezos, operation.hash);

    return new FA2(await tezos.contract.at(operation.contractAddress), tezos);
  }

  async updateStorage(maps = {}) {
    let storage = await this.contract.storage();
    this.storage = {
      account_info: storage.account_info,
      token_info: storage.token_info,
      metadata: storage.metadata,
      token_metadata: storage.token_metadata,
      minters: storage.minters,
      minters_info: storage.minters_info,
      last_token_id: storage.last_token_id,
      admin: storage.admin,
      permit_counter: storage.permit_counter,
      permits: storage.permits,
      default_expiry: storage.default_expiry,
      totalMinterShares: storage.totalMinterShares,
    };

    for (const key in maps) {
      this.storage[key] = await maps[key].reduce(async (prev, current) => {
        try {
          return {
            ...(await prev),
            [current]: await storage[key].get(current),
          };
        } catch (ex) {
          return {
            ...(await prev),
            [current]: 0,
          };
        }
      }, Promise.resolve({}));
    }
  }

  async transfer(from, txs) {
    const operation = await this.contract.methods
      .transfer([
        {
          from_: from,
          txs,
        },
      ])
      .send();

    await confirmOperation(this.tezos, operation.hash);

    return operation;
  }

  async createToken(token_metadata) {
    const operation = await this.contract.methods
      .create_token(token_metadata)
      .send();

    await confirmOperation(this.tezos, operation.hash);

    return operation;
  }

  async mint(txs) {
    const operation = await this.contract.methods.mint(txs).send();

    await confirmOperation(this.tezos, operation.hash);

    return operation;
  }

  async mintZero(amount) {
    const operation = await this.contract.methods.mint_gov_token(amount).send();

    await confirmOperation(this.tezos, operation.hash);

    return operation;
  }

  async updateAdmin(newAdmin) {
    const operation = await this.contract.methods.update_admin(newAdmin).send();

    await confirmOperation(this.tezos, operation.hash);

    return operation;
  }

  async setMinters(minters) {
    const operation = await this.contract.methods
      .set_minters(minters)
      .send();

    await confirmOperation(this.tezos, operation.hash);

    return operation;
  }

  async updateMinter(minter, share) {
    const operation = await this.contract.methods
      .update_minter(minter, share)
      .send();

    await confirmOperation(this.tezos, operation.hash);

    return operation;
  }

  async balanceOf(requests, contract) {
    const operation = await this.contract.methods
      .balance_of({ requests, contract })
      .send();

    await confirmOperation(this.tezos, operation.hash);

    return operation;
  }

  async updateOperators(params) {
    const operation = await this.contract.methods
      .update_operators(
        params.map((param) => {
          return {
            [param.option]: param.param,
          };
        })
      )
      .send();

    await confirmOperation(this.tezos, operation.hash);

    return operation;
  }
}

module.exports.FA2 = FA2;
