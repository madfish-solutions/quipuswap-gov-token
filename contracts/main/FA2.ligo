#include "../partial/IqToken.ligo"
#include "../partial/Permit.ligo"
#include "../partial/FA2Methods.ligo"
#include "../partial/RoleMethods.ligo"
#include "../partial/SupplyMethods.ligo"

function main(
  const action          : quipu_action;
  const s               : quipu_storage)
                        : return is
  case action of
    Create_token(params)      -> (no_operations, create_token(s, params))
  | Mint(params)              -> (no_operations, mint(s, params))
  | Mint_gov_token(params)    -> (no_operations, mint_gov_token(s, params))
  | Set_minters(params)       -> (no_operations, set_minters(s, params))
  | Update_minter(params)     -> (no_operations, update_minter(s, params))
  | Update_admin(params)      -> (no_operations, update_admin(s, params))
  | Transfer(params)          -> (no_operations, transfer(s, params, action))
  | Update_operators(params)  -> (no_operations, update_operators(s, params, action))
  | Balance_of(params)        -> (get_balance_of(params, s), s)
  | Get_total_supply(params)  -> get_total_supply(params.0, params.1, s)
  | Permit(params)            -> add_permit(params, s)
  | Set_expiry(params)        -> set_expiry(params, s, action)
  end
