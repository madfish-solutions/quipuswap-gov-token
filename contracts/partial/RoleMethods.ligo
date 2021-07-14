[@inline] function minter_shares (
  const minter          : address;
  const s               : quipu_storage)
                        : nat is
  case s.minters_info[minter] of
    | Some(v) -> v
    | None -> 0n
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
    s.total_minter_shares := 0n;
    s.minters_info := minters;

    function set_minter(
      var s                 : quipu_storage;
      const param           : minter_type)
                            : quipu_storage is
      block {
          s.minters_info[param.minter] := param.share;
          s.total_minter_shares := s.total_minter_shares + param.share;
      } with s
  } with (List.fold(set_minter, params, s))


(* Update minter permissions *)
function update_minter(
  var s                 : quipu_storage;
  const param           : minter_type)
                        : quipu_storage is
  block {
    if Tezos.sender =/= s.admin
    then failwith("NOT_ADMIN")
    else skip;

    const share : nat = minter_shares(param.minter, s);

    if param.share =/= 0n then {
      if share > 0n
      then block {
        s.total_minter_shares := abs(s.total_minter_shares - share);
        remove param.minter from map s.minters_info;
      }
      else skip;

      s.minters_info[param.minter] := param.share;
      s.total_minter_shares := s.total_minter_shares + param.share;
    }
    else {
      remove param.minter from map s.minters_info;
      s.total_minter_shares := abs(s.total_minter_shares - share);
    }
  } with s
