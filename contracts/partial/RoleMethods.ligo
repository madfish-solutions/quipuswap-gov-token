[@inline] function check_minter (const minter : address; const s : quipu_storage) : nat is
  case s.minters_info[minter] of
    | Some(v) -> v
    | None -> (failwith("NOT_MINTER") : nat)
  end;

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
    const minters : map(address, nat) = map [];
    s.totalMinterShares := 0n;
    s.minters_info := minters;

    function set_minter(
      var s                 : quipu_storage;
      const param           : set_minter_param)
                            : quipu_storage is
      block {
          s.minters_info[param.minter] := param.share;
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
      s.minters_info[param.minter] := param.share;
      s.totalMinterShares := s.totalMinterShares + param.share;
    }
    else {
      const share : nat = check_minter(param.minter, s);

      remove param.minter from map s.minters_info;
      s.totalMinterShares := abs(s.totalMinterShares - share);
    }
  } with s
