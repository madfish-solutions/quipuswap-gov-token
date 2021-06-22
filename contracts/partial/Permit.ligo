(*
 * Check whether a permit has expired
 *)
function has_expired(
  const default_expiry  : seconds;
  const user_expiry_opt : option(seconds);
  const permit_info     : permit_info)
                        : bool is
  block {
    const expiry : seconds = case permit_info.expiry of
        Some(permit_expiry) -> permit_expiry
      | None ->
          case user_expiry_opt of
            Some(user_expiry) -> user_expiry
          | None -> default_expiry
          end
      end
  } with permit_info.created_at + int(expiry) < Tezos.now

function sender_check (
  const expected_user   : address;
  const store           : quipu_storage;
  const full_param      : quipu_action;
  const err_message     : string)
                        : quipu_storage is
  if Tezos.sender = expected_user
  then store
  else block {
    const full_param_hash : blake2b_hash =
      Crypto.blake2b(Bytes.pack(full_param));
    const user_permits : user_permits =
      case Big_map.find_opt(expected_user, store.permits) of
        Some(user_permits) -> user_permits
      | None -> (failwith(err_message) : user_permits)
      end
  } with case Map.find_opt(full_param_hash, user_permits.permits) of
          None -> (failwith(err_message) : quipu_storage)
        | Some(permit_info) ->
            if has_expired(
                store.default_expiry,
                user_permits.expiry,
                permit_info)
            then (failwith("EXPIRED_PERMIT") : quipu_storage)
            else store with record [
                permits = Big_map.update(
                  expected_user,
                  Some(user_permits with record [
                      permits = Map.remove(
                        full_param_hash,
                        user_permits.permits)
                    ]
                  ),
                  store.permits
                )
              ]
        end

(*Deletes all expired permits issued by the given user *)
function delete_expired_permits(
  const default_expiry  : seconds;
  const user            : address;
  const permits         : permits)
                        : permits is
  case Big_map.find_opt(user, permits) of
    None -> permits
  | Some(user_permits) -> block {
      const updated_map : map(blake2b_hash, permit_info) =
        Map.fold(
          function(
            const acc   : map(blake2b_hash, permit_info);
            const keyValue : (blake2b_hash * permit_info))
                        : map(blake2b_hash, permit_info) is
                if has_expired(default_expiry, user_permits.expiry, keyValue.1)
                then Map.remove(keyValue.0, acc)
                else acc,
          user_permits.permits,
          user_permits.permits
        );
      const updated_user_permits: user_permits =
        user_permits with record [permits = updated_map]
    } with Big_map.update(user, Some(updated_user_permits), permits)
  end

(*
* Fails with `"DUP_PERMIT"` if the given permit hash already exists and
* hasn't expired
*)
function check_duplicates(
  const default_expiry  : seconds;
  const user_expiry_opt : option(seconds);
  const user_permits    : user_permits;
  const permit          : blake2b_hash)
                        : unit is
  case Map.find_opt(permit, user_permits.permits) of
    None -> unit
  | Some(permit_info) ->
      if has_expired(default_expiry, user_expiry_opt, permit_info)
      then unit
      else failwith("DUP_PERMIT")
  end

(* Inserts an already validated permit in the permits storage *)
function insert_permit(
  const default_expiry  : seconds;
  const user            : address;
  const permit          : blake2b_hash;
  const permits         : permits)
                        : permits is
  block {
    const user_permits : user_permits =
      case Big_map.find_opt(user, permits) of
        Some(user_permits) -> user_permits
      | None -> new_user_permits
      end;

    check_duplicates(default_expiry, user_permits.expiry, user_permits, permit);

    const updated_user_permits : user_permits =
      user_permits with record [
        permits = Map.add(
          permit,
          record [
            created_at = Tezos.now;
            expiry = (None : option(seconds))
          ],
          user_permits.permits
        )
      ]
  } with Big_map.update(user, Some(updated_user_permits), permits)

function add_permit(
  const parameter       : permit_param;
  const store           : quipu_storage)
                        : return is
  block {
    const key : key = parameter.0;
    const signature : signature = parameter.1.0;
    const permit : blake2b_hash = parameter.1.1;
    const issuer: address = Tezos.address(
      Tezos.implicit_account(Crypto.hash_key(key)));
    const to_sign : bytes =
      Bytes.pack((
        (Tezos.self_address, Tezos.chain_id),
        (store.permit_counter, permit)
      ));
    const store : quipu_storage =
    if (Crypto.check (key, signature, to_sign))
    then store with record[
        permit_counter = store.permit_counter + 1n;
        permits = delete_expired_permits(
          store.default_expiry,
          issuer,
          insert_permit(store.default_expiry, issuer, permit, store.permits))
      ]
    else block {
      const failwith_ : (string * bytes -> quipu_storage) =
        [%Michelson ({| { FAILWITH } |} : string * bytes -> quipu_storage)];
    } with failwith_(("MISSIGNED", to_sign))
  } with ((nil : list(operation)), store)

(*
 * Sets the default expiry for a user.
 * If the user already had an expiry set, the old expiry is overriden by the new one.
 *)
function set_user_default_expiry(
  const user            : address;
  const new_expiry      : seconds;
  const permits         : permits)
                        : permits is
  block {
    const user_permits : user_permits =
      case Big_map.find_opt(user, permits) of
        Some(user_permits) -> user_permits
      | None -> new_user_permits
      end;
    const updated_user_permits : user_permits =
      user_permits with record [
        expiry = Some(new_expiry)
      ]
  } with Big_map.update(user, Some(updated_user_permits), permits)

(*
 * Checks if the permit has expired, sets a new expiry otherwise
 *)
function set_permit_expiry_with_check(
  const permit_info     : permit_info;
  const new_expiry      : seconds)
                        : option(permit_info) is
  block {
    const permit_age: int = Tezos.now - permit_info.created_at;
  } with if permit_age >= int(new_expiry)
    then (None : option(permit_info))
    else Some(permit_info with record [expiry = Some(new_expiry)])

(*
 * Sets the expiry for a permit.
 *
 * If the permit already had an expiry set, the old expiry is overriden 
 * by the new one.
 * If the permit does not exist, nothing happens
 *)
function set_permit_expiry(
  const user            : address;
  const permit          : blake2b_hash;
  const new_expiry      : seconds;
  const permits         : permits;
  const default_expiry  : seconds)
                        : permits is
  if new_expiry < permit_expiry_limit
  then case Big_map.find_opt(user, permits) of
      None -> permits
    | Some(user_permits) ->
      case Map.find_opt(permit, user_permits.permits) of
        None -> permits
      | Some(permit_info) -> block {
        const updated_user_permits : user_permits =
          if has_expired(default_expiry,
            user_permits.expiry,
            permit_info)
          then user_permits
          else user_permits with record [
            permits = Map.update(
              permit,
              set_permit_expiry_with_check(permit_info, new_expiry),
              user_permits.permits
            )
          ]
      } with Big_map.update(user, Some(updated_user_permits), permits)
      end
    end
  else (failwith("EXPIRY_TOO_BIG") : permits)


(*
 * Sets the default expiry for the sender (if the param contains a `None`)
 * or for a specific permit (if the param contains a `Some`).
 *
 * When the permit whose expiry should be set does not exist,
 * nothing happens.
 *)
function set_expiry(
  const param           : set_expiry_param;
  const store           : quipu_storage;
  const full_param      : quipu_action)
                        : return is
  block {
    const owner : address = param.0;
    const new_expiry : seconds = param.1.0;
    const specific_permit_or_default : option(blake2b_hash) = param.1.1;
    const updated_store : quipu_storage =
      sender_check(owner, store, full_param, "NOT_PERMIT_ISSUER");

    const updated_permits : permits =
      case specific_permit_or_default of
        None -> set_user_default_expiry(
          owner,
          new_expiry,
          updated_store.permits
        )
      | Some(permit_hash) -> set_permit_expiry(
          owner,
          permit_hash,
          new_expiry,
          updated_store.permits,
          store.default_expiry
        )
      end
  } with (
    (nil : list(operation)),
    updated_store with record [permits = updated_permits]
  )
