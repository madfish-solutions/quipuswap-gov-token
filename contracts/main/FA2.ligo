#include "../partial/IqToken.ligo"
#include "../partial/FA2Methods.ligo"
#include "../partial/RoleMethods.ligo"
#include "../partial/SupplyMethods.ligo"

function main(const action : quipu_action; const s : quipu_storage) : return is
  case action of
  | Mint(params)                      -> (no_operations, mint(s, params))
  | Mint_qs_token(params)             -> (no_operations, mint_qs_token(s, params))
  | Update_minter(params)            -> (no_operations, update_minter(s, params))
  | Update_admin(params)              -> (no_operations, update_admin(s, params))
  | Transfer(params)                  -> (no_operations, transfer(s, params))
  | Update_operators(params)          -> (no_operations, update_operators(s, params))
  | Balance_of(params)                -> (get_balance_of(params, s), s)
  end
