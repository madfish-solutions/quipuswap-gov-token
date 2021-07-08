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
        if param.token_id <= abs(s.last_token_id - 1n)
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

function mint_gov_token(
  const s               : quipu_storage;
  const mint_amount     : nat)
                        : quipu_storage is
  block {
    const _shares : nat = check_minter(Tezos.sender, s);

    function make_mint_zero_token (
      var s             : quipu_storage;
      const mt          : address * nat)
                        : quipu_storage is
      block {
        var result : nat := mt.1 * mint_amount / s.totalMinterShares;
        var token : token_info := get_token_info(0n, s);

        if token.total_supply + result > max_supply
        then result := abs(max_supply - token.total_supply);
        else skip;

        var dst_account : account := get_account(mt.0, s);
        const dst_balance : nat = get_balance_by_token(dst_account, 0n);
        dst_account.balances[0n] := dst_balance + result;

        token.total_supply := token.total_supply + result;
        s.account_info[mt.0] := dst_account;
        s.token_info[0n] := token;
      } with s
  } with Map.fold (make_mint_zero_token, s.minters_info, s)

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
