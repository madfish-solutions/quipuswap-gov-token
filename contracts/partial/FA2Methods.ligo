(* Helper function to get account *)
function get_account(const user : address; const s : quipu_storage) : account is
  case s.account_info[user] of
  | None -> record [
    balances        = (Map.empty : map(token_id, nat));
    permits         = (set [] : set(address));
  ]
  | Some(v) -> v
  end

(* Helper function to get token info *)
function get_token_info(const token_id : token_id; const s : quipu_storage) : token_info is
  case s.token_info[token_id] of
  | None -> record [
    total_supply    = 0n;
    used_supply     = 0n;
  ]
  | Some(v) -> v
  end

(* Helper function to get acount balance by token *)
function get_balance_by_token(const user : account; const token_id : token_id) : nat is
  case user.balances[token_id] of
  | None -> 0n
  | Some(v) -> v
  end

(* Perform transfers *)
function iterate_transfer(const s : quipu_storage; const params : transfer_param) : quipu_storage is
  block {
    (* Perform single transfer *)
    function make_transfer(var s : quipu_storage; const transfer_dst : transfer_destination) : quipu_storage is
      block {
        (* Create or get source account *)
        var src_account : account := get_account(params.from_, s);

        (* Check permissions *)
        if params.from_ = Tezos.sender or src_account.permits contains Tezos.sender then
          skip
        else
          failwith("FA2_NOT_OPERATOR");

        (* Token id check *)
        if s.tokens_ids contains transfer_dst.token_id then
          skip
        else
          failwith("FA2_TOKEN_UNDEFINED");

        (* Get source balance *)
        const src_balance : nat = get_balance_by_token(src_account, transfer_dst.token_id);

        (* Balance check *)
        if src_balance < transfer_dst.amount then
          failwith("FA2_INSUFFICIENT_BALANCE")
        else
          skip;

        (* Update source balance *)
        src_account.balances[transfer_dst.token_id] := abs(src_balance - transfer_dst.amount);

        (* Update storage *)
        s.account_info[params.from_] := src_account;

        (* Create or get destination account *)
        var dst_account : account := get_account(transfer_dst.to_, s);

        (* Get receiver balance *)
        const dst_balance : nat = get_balance_by_token(dst_account, transfer_dst.token_id);

        (* Update destination balance *)
        dst_account.balances[transfer_dst.token_id] := dst_balance + transfer_dst.amount;

        (* Update storage *)
        s.account_info[transfer_dst.to_] := dst_account;
    } with s
} with List.fold(make_transfer, params.txs, s)

(* Perform single operator update *)
function iterate_update_operators(var s : quipu_storage; const params : update_operator_param) : quipu_storage is
  block {
    case params of
    | Add_operator(param) -> block {
      (* Check an owner *)
      if Tezos.sender =/= param.owner then
        failwith("FA2_NOT_OWNER")
      else
        skip;

      (* Create or get source account *)
      var src_account : account := get_account(param.owner, s);

      (* Add operator *)
      src_account.permits := Set.add(param.operator, src_account.permits);

      (* Update storage *)
      s.account_info[param.owner] := src_account;
    }
    | Remove_operator(param) -> block {
      (* Check an owner *)
      if Tezos.sender =/= param.owner then
        failwith("FA2_NOT_OWNER")
      else
        skip;

      (* Create or get source account *)
      var src_account : account := get_account(param.owner, s);

      (* Remove operator *)
      src_account.permits := Set.remove(param.operator, src_account.permits);

      (* Update storage *)
      s.account_info[param.owner] := src_account;
    }
    end
  } with s

(* Perform balance lookup *)
function get_balance_of(const balance_params : balance_params; const s : quipu_storage) : list(operation) is
  block {
    (* Perform single balance lookup *)
    function look_up_balance(const l: list(balance_of_response); const request : balance_of_request) : list(balance_of_response) is
      block {
        (* Retrieve the asked account from the storage *)
        const user : account = get_account(request.owner, s);

        (* Form the response *)
        var response : balance_of_response := record [
          request = request;
          balance = get_balance_by_token(user, request.token_id);
        ];

        (* Check for Temple token (with ID equal to 0) *)
        if request.token_id = 0n then
          response.balance := response.balance
        else
          skip;
      } with response # l;

    (* Collect balances info *)
    const accumulated_response : list(balance_of_response) = List.fold(look_up_balance, balance_params.requests, (nil: list(balance_of_response)));
  } with list [Tezos.transaction(
    accumulated_response,
    0tz,
    balance_params.callback
  )]

function update_operators(const s : quipu_storage; const params : update_operator_params) : quipu_storage is
  List.fold(iterate_update_operators, params, s)

function transfer(const s : quipu_storage; const params : transfer_params) : quipu_storage is
  List.fold(iterate_transfer, params, s)
