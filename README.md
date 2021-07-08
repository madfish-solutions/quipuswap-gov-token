# Quipu Governance Token

# Description

Token


# Project structure

```
.
.
├──  contracts/ # contracts
├──────────  main/ # the contracts to be compiled
├───────────────────  FA2 # main file
├──────────  partials/ # the code parts imported by main contracts
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


