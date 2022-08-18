export type CustomError =
  | InvalidVrfAuthorityError
  | MaxResultExceedsMaximum
  | InvalidVrfAccount
  | InvalidSwitchboardAccount

export class InvalidVrfAuthorityError extends Error {
  static readonly code = 6000
  readonly code = 6000
  readonly name = "InvalidVrfAuthorityError"
  readonly msg =
    "Switchboard VRF Account's authority should be set to the client's state pubkey"

  constructor(readonly logs?: string[]) {
    super(
      "6000: Switchboard VRF Account's authority should be set to the client's state pubkey"
    )
  }
}

export class MaxResultExceedsMaximum extends Error {
  static readonly code = 6001
  readonly code = 6001
  readonly name = "MaxResultExceedsMaximum"
  readonly msg = "The max result must not exceed u64"

  constructor(readonly logs?: string[]) {
    super("6001: The max result must not exceed u64")
  }
}

export class InvalidVrfAccount extends Error {
  static readonly code = 6002
  readonly code = 6002
  readonly name = "InvalidVrfAccount"
  readonly msg = "Invalid VRF account provided."

  constructor(readonly logs?: string[]) {
    super("6002: Invalid VRF account provided.")
  }
}

export class InvalidSwitchboardAccount extends Error {
  static readonly code = 6003
  readonly code = 6003
  readonly name = "InvalidSwitchboardAccount"
  readonly msg = "Not a valid Switchboard account"

  constructor(readonly logs?: string[]) {
    super("6003: Not a valid Switchboard account")
  }
}

export function fromCode(code: number, logs?: string[]): CustomError | null {
  switch (code) {
    case 6000:
      return new InvalidVrfAuthorityError(logs)
    case 6001:
      return new MaxResultExceedsMaximum(logs)
    case 6002:
      return new InvalidVrfAccount(logs)
    case 6003:
      return new InvalidSwitchboardAccount(logs)
  }

  return null
}
