[@inline] function check_minter (
  const minter          : address;
  const s               : quipu_storage)
                        : nat is
  case s.minters_info[minter] of
    | Some(v) -> v
    | None -> (failwith("NOT_MINTER") : nat)
  end;

(* Perform minting new tokens *)
function mint (
  const s               : quipu_storage;
  const params          : mint_params)
                        : quipu_storage is
  block {
    if s.admin = Tezos.sender
    then skip
    else failwith("NOT_ADMIN");

    function make_mint(
      var s             : quipu_storage;
      const param       : mint_param)
                        : quipu_storage is
      block {
        if param.token_id < s.last_token_id
        then skip
        else failwith("FA2_TOKEN_UNDEFINED");

        if param.token_id = 0n
        then failwith("MINT_FORBIDDEN");
        else skip;

        (* Get receiver account *)
        var dst_account : account := get_account(param.receiver, s);

        (* Get receiver initial balance *)
        const dst_balance : nat =
          get_balance_by_token(dst_account, param.token_id);

        (* Mint new tokens *)
        dst_account.balances[param.token_id] := dst_balance + param.amount;

        (* Get token info *)
        var token : token_info := get_token_info(param.token_id, s);

        (* Update token total supply *)
        token.total_supply := token.total_supply + param.amount;

        (* Update storage *)
        s.account_info[param.receiver] := dst_account;
        s.token_info[param.token_id] := token;
      } with s
  } with (List.fold(make_mint, params, s))


[@inline] function zero_mint (
  var s                 : quipu_storage;
  const shares          : nat;
  const mint_amount     : nat;
  const receiver        : address)
                        : quipu_storage is
  block {
    var result : nat := shares * mint_amount / s.total_minter_shares;
    var token : token_info := get_token_info(0n, s);

    if token.total_supply + result > max_supply
    then result := abs(max_supply - token.total_supply);
    else skip;

    var dst_account : account := get_account(receiver, s);
    const dst_balance : nat = get_balance_by_token(dst_account, 0n);
    dst_account.balances[0n] := dst_balance + result;

    token.total_supply := token.total_supply + result;
    s.account_info[receiver] := dst_account;
    s.token_info[0n] := token;
  } with s


function mint_gov_token(
  var s                 : quipu_storage;
  const mint_param      : zero_param)
                        : quipu_storage is
  block {
    const shares : nat = check_minter(Tezos.sender, s);
    const mint_amount : nat = s.total_minter_shares * mint_param.amount / shares;

    function make_mint_zero_token (
      var s             : quipu_storage;
      const mt          : address * nat)
                        : quipu_storage is
      block {
        if Tezos.sender =/= mt.0
        then s := zero_mint(s, mt.1, mint_amount, mt.0);
        else skip
      } with s;
    s := Map.fold (make_mint_zero_token, s.minters_info, s);
    s := zero_mint(s, shares, mint_amount, mint_param.receiver);
  } with s

function create_token(
  var s                 : quipu_storage;
  const create_params   : new_token_params)
                        : quipu_storage is
  block {
    if s.admin = Tezos.sender
    then skip
    else failwith("NOT_ADMIN");

    s.token_metadata[s.last_token_id] := record [
      token_id = s.last_token_id;
      token_info = create_params;
    ];
    s.last_token_id := s.last_token_id + 1n;
  } with s
