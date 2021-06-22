type owner              is address
type operator           is address
type blake2b_hash       is bytes
type seconds            is nat
type counter            is nat

type permit_info        is record [
    created_at            : timestamp;
    expiry                : option(seconds);
  ]
type user_permits       is record [
    permits               : map (blake2b_hash, permit_info);
    expiry                : option(seconds);
  ]

type permits            is big_map(address, user_permits)
type permit_signature   is michelson_pair(
    signature,
    "",
    blake2b_hash,
    "permit_hash"
  )

type permit_param       is (key * permit_signature)
type revoke_param       is blake2b_hash * address
type revoke_params      is list(revoke_param)

type set_expiry_param   is michelson_pair_right_comb(
    record [
      issuer              : address;
      expiry              : seconds;
      permit_hash         : option(blake2b_hash);
    ]
  )

(* Initial `user_permits` state for a user attempting to
create a permit for the first time *)
const new_user_permits : user_permits =
  record [
    permits             = (Map.empty : map (blake2b_hash, permit_info));
    expiry              = (None : option(seconds))
  ]
const permit_expiry_limit : nat = 31557600000n;
