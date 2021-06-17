#include "../partial/FA2Types.ligo"

type account is [@layout:comb] record [
  balances            : map(token_id, nat);
  permits             : set(address);
]

type token_info is [@layout:comb] record [
  total_supply        : nat;
]

type minter_type is record [
  minter : address;
  percent: nat;
]

type quipu_storage is [@layout:comb] record [
  account_info        : big_map(address, account);
  token_info          : big_map(token_id, token_info);
  metadata            : big_map(string, bytes);
  token_metadata      : big_map(token_id, token_metadata_info);
  minters             : set(address);
  minters_info        : set(minter_type);
  tokens_ids          : set(token_id);
  last_token_id       : nat;
  admin               : address;
]

type update_minter_param is [@layout:comb] record [
  minter              : address;
  allowed             : bool;
  percent             : nat;
]

type mint_param is [@layout:comb] record [
  token_id            : token_id;
  receiver            : address;
  amount              : nat;
]

type mint_params is list(mint_param)

type create_token_params is map(string, bytes)

type return is list (operation) * quipu_storage

type quipu_action is
| Create_token            of create_token_params
| Mint                    of mint_params
| Mint_qs_token           of nat
| Update_minter           of update_minter_param
| Update_admin            of address
| Transfer                of transfer_params
| Balance_of              of balance_params
| Update_operators        of update_operator_params

[@inline] const no_operations : list(operation) = nil;

[@inline] const accuracy : nat = 1000000n;

[@inline] const max_total_supply : nat = 10000000n * accuracy;

[@inline] const zero_address : address = ("tz1ZZZZZZZZZZZZZZZZZZZZZZZZZZZZNkiRg" : address);
