# Quipu Governance Token

# Description

Tool for managing the Quipuswap protocol. Is a **Governance** token that allows minting tokens with proportional distribution logic. Token has a capped but dynamic supply.

## Supply Mechanics

There are 5 funds with different proportions to the total supply. If the tokens are minted for one of them the other funds also proportionally increase.

**For example:**
If 10 tokens are minted for **future partnership** then the other 5 tokens are minted for **grant/dev program**, 71 tokens are minted for **community incentives**, 13.5 tokens are minted for the **team funds** and 0.5 tokens are minted for **testing**.

To sum up, the tokens can't be minted only to one funds. If one of the funds increases the others grow proportionally.

**Total fixed supply:** 10 000 000 </br>
**Decimal:** 6

# Project structure

```
.
.
├──  contracts/ # contracts
├──────────  main/ # the contracts to be compiled
├───────────────────  FA2 # main file
├──────────  partial/ # the code parts imported by main contracts
├───────────────────  FA2Methods # standart FA2 methods
├───────────────────  FA2Types # types for FA2
├───────────────────  IPermit # types for Permits
├───────────────────  IqToken # main types and storage for Gov Token
├───────────────────  Permit # permits functions
├───────────────────  RoleMethods # role function logic
├───────────────────  SupplyMethods # supply function logic
├──  scripts/ # cli for account actions
├──  storage/ # initial storage for contract originations
├──  test/ # test cases
├──  README.md # current file
└──  .gitignore
```

# Prerequisites

- Installed NodeJS (tested with NodeJS v12+)

- Installed Ligo:

```
curl https://gitlab.com/ligolang/ligo/raw/dev/scripts/installer.sh | bash -s "next"
```

- Installed node modules:

```
cd quipuswap-gov-token && yarn
```

# Quick Start

## Compilation

To compile the contracts run:

```
yarn compile
```

Artifacts are stored in the `build/contracts` directory.

## Deployment

For deployment step the following command should be used:

```
yarn migrate
```

# Entrypoints

The Ligo interfaces of the contracts can be found in `contracts/partials/I__CONTRACT_NAME__.ligo`

## Create_token

Entrypoint created to add a new token. Expects a metadata for a new token.

## Mint

Entrypoint mint for minting tokens created by the admin. This function can only be called by admin.
(You cannot mint a zero *(Quipu Governance Token)* token using this entrippoint).

## Mint_gov_token

Created for minting a zero *(Quipu Governance Token)* token.
This function takes the number of tokens that need to be minted and distributes this amount across the shares of all minters.

**Let's assume:**

Alice has 70 shares.
Bob is 30.

Bob calls the given entrippoint for minting 2000 tokens.
Using the formula bob mint 600 tokens, and Alice 1400.

**Supply formula:**
```
bob_shares * mint_amount / total_minter_shares;
```

## Set_minters

Entrypoint can set **Minters** who are allowed to mint a zero *(Quipu Governance Token)* token.
Can only be called by the admin. Expects a list of records with fields *minter* and *share*.

```
type minter_type        is [@layout:comb] record [
    minter                : address;
    share                 : nat;
  ]

type set_minter_params is list(minter_type)

| Set_minters           of set_minter_params
```

## Update_minter

Using this entrippoint, admin can update the data about the minter,
add a new minter or delete from the existing ones.

```
if param.share =/= 0 then add new minter
else delete old minter
```

## Update_admin

Entrypoint is created to set new admin. Can only be called by the current admin.

## Permit

[Permit(TZIP-17)](https://gitlab.com/tezos/tzip/-/blob/master/proposals/tzip-17/tzip-17.md) enables account abstraction: emulating multiple account types using standardized contract calls. This is done through pre-signing: a method to sign and submit Tezos transactions separately.</br>


For instance, a “relayer” can submit a user’s pre-signed (meta) transaction and pay the tez fees on their behalf; a process called gas abstraction. This is especially convenient for subsidizing user onboarding, collecting multiple signatures when voting in a DAO, signing in a multisig, or batching transactions.

## Set_expiry

Entrypoint allows to set the time of the **Permit**.

Users may only set their own (default and Permits') expiries.
If the difference between the stored timestamp and NOW is at least the
effective expiry, the Permit is revoked.
A revoked Permit can't be used with the Permit or SetExpiry entrypoints.
See Cleaning up Permits for more detail.
Individual permits may be revoked by setting the expiry for that Permit to 0 seconds.

# Testing

If you'd like to run tests on the local environment, you might want to run `ganache-cli` for Tezos using the following command:

```
docker run --rm --name my-sandbox -e flextesa_node_cors_origin="*" --detach -p 20000:20000 tqtezos/flextesa:20210602 granabox start
```

Run:

```
yarn test
```
