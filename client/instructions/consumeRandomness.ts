import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface ConsumeRandomnessArgs {
  params: types.ConsumeRandomnessParamsFields
}

export interface ConsumeRandomnessAccounts {
  state: PublicKey
  vrf: PublicKey
}

export const layout = borsh.struct([
  types.ConsumeRandomnessParams.layout("params"),
])

export function consumeRandomness(
  args: ConsumeRandomnessArgs,
  accounts: ConsumeRandomnessAccounts
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.state, isSigner: false, isWritable: true },
    { pubkey: accounts.vrf, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([190, 217, 49, 162, 99, 26, 73, 234])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      params: types.ConsumeRandomnessParams.toEncodable(args.params),
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
