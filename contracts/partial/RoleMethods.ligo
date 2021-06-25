(* Set new pending admin *)
function update_admin(
  var s                 : quipu_storage;
  const new_admin       : address)
                        : quipu_storage is
  block {
    (* Ensure sender has the admin permissions *)
    if Tezos.sender =/= s.admin
    then failwith("NOT_ADMIN")
    else skip;

    (* Update storage *)
    s.admin := new_admin;
  } with s

(* Update minter permissions *)
function update_minter(
  var s                 : quipu_storage;
  const param           : update_minter_param)
                        : quipu_storage is
  block {
    if Tezos.sender =/= s.admin
    then failwith("NOT_ADMIN")
    else skip;

    // if param.percent < 1n or param.percent > 100n
    // then failwith("WRONG_PERCENT")
    // else skip;

    (* Update storage *)
    if param.allowed then {
      s.minters := Set.add(param.minter, s.minters);
      var mt : minter_type := record [
        minter  = param.minter;
        percent = param.percent;
      ];
      s.minters_info := Set.add(mt, s.minters_info);
      s.total_mint_percent := s.total_mint_percent + param.percent;
    }
    else {
      var mt : minter_type := record [
          minter  = param.minter;
          percent = param.percent;
      ];
      s.minters_info := Set.remove(mt, s.minters_info);
      s.minters := Set.remove(param.minter, s.minters);
      s.total_mint_percent := abs(s.total_mint_percent - param.percent);
    }
  } with s
