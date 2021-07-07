(* Set new admin *)
function update_admin(
  var s                 : quipu_storage;
  const new_admin       : address)
                        : quipu_storage is
  block {
    if Tezos.sender =/= s.admin
    then failwith("NOT_ADMIN")
    else skip;

    s.admin := new_admin;
  } with s

(* Update minter permissions *)
function set_minters(
  var s                 : quipu_storage;
  const params          : set_minter_params)
                        : quipu_storage is
  block {
    if Tezos.sender =/= s.admin
    then failwith("NOT_ADMIN")
    else skip;
    const minters : set(address) = Set.empty;
    s.totalMinterShares := 0n;
    s.minters := minters;

    function set_minter(
      var s                 : quipu_storage;
      const param           : set_minter_param)
                            : quipu_storage is
      block {
          s.minters := Set.add(param.minter, s.minters);
          var mt : minter_type := record [
            minter  = param.minter;
            share = param.share;
          ];
          s.minters_info := Set.add(mt, s.minters_info);
          s.totalMinterShares := s.totalMinterShares + param.share;
      } with s

  } with (List.fold(set_minter, params, s))


(* Update minter permissions *)
function update_minter(
  var s                 : quipu_storage;
  const param           : update_minter_param)
                        : quipu_storage is
  block {
    if Tezos.sender =/= s.admin
    then failwith("NOT_ADMIN")
    else skip;

    if param.share =/= 0n then {
      s.minters := Set.add(param.minter, s.minters);
      var mt : minter_type := record [
        minter  = param.minter;
        share = param.share;
      ];
      s.minters_info := Set.add(mt, s.minters_info);
      s.totalMinterShares := s.totalMinterShares + param.share;
    }
    else {
      var mt : minter_type := record [
          minter  = param.minter;
          share = param.share;
      ];
      s.minters_info := Set.remove(mt, s.minters_info);
      s.minters := Set.remove(param.minter, s.minters);
      s.totalMinterShares := abs(s.totalMinterShares - param.share);
    }
  } with s
