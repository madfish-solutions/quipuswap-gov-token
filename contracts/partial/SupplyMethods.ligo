(* Perform minting new tokens *)
function mint (
  const s               : quipu_storage;
  const params          : mint_params)
                        : quipu_storage is
  block {
    (* Ensure sender has the minter permissions *)
    if s.admin = Tezos.sender
    then skip
    else failwith("NOT_ADMIN");

    function make_mint(
      var s             : quipu_storage;
      const param       : mint_param)
                        : quipu_storage is
      block {
        (* Token id check *)
        if s.tokens_ids contains param.token_id
        then skip
        else failwith("FA2_TOKEN_UNDEFINED");

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
    if s.minters contains Tezos.sender
    then skip
    else failwith("NOT_MINTER");

    function make_mint_zero_token (
      var s             : quipu_storage;
      const i           : minter_type)
                        : quipu_storage is
      block {
        var result : nat := abs(mint_amount * i.percent / 100);
        var token : token_info := get_token_info(0n, s);

        if token.total_supply + result > max_total_supply
        then result := abs((max_total_supply) - token.total_supply);
        else skip;

        var dst_account : account := get_account(i.minter, s);
        const dst_balance : nat = get_balance_by_token(dst_account, 0n);
        dst_account.balances[0n] := dst_balance + result;

        token.total_supply := token.total_supply + result;
        s.account_info[i.minter] := dst_account;
        s.token_info[0n] := token;
      } with s
  } with Set.fold (make_mint_zero_token, s.minters_info, s)

function create_token(
  var s                 : quipu_storage;
  const create_params   : new_token_params)
                        : quipu_storage is
  block {
    s.token_metadata[s.last_token_id] := record [
      token_id = s.last_token_id;
      token_info = create_params;
    ];
    s.tokens_ids := Set.add(s.last_token_id, s.tokens_ids);
    s.last_token_id := s.last_token_id + 1n;
  } with s
