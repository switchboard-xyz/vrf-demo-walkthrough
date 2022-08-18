import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface RequestRandomnessArgs {
  params: types.RequestRandomnessParamsFields
}

export interface RequestRandomnessAccounts {
  state: PublicKey
  vrf: PublicKey
  oracleQueue: PublicKey
  queueAuthority: PublicKey
  /** CHECK */
  dataBuffer: PublicKey
  permission: PublicKey
  escrow: PublicKey
  programState: PublicKey
  switchboardProgram: PublicKey
  payerWallet: PublicKey
  payerAuthority: PublicKey
  recentBlockhashes: PublicKey
  tokenProgram: PublicKey
}

export const layout = borsh.struct([
  types.RequestRandomnessParams.layout("params"),
])

export function requestRandomness(
  args: RequestRandomnessArgs,
  accounts: RequestRandomnessAccounts
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.state, isSigner: false, isWritable: true },
    { pubkey: accounts.vrf, isSigner: false, isWritable: true },
    { pubkey: accounts.oracleQueue, isSigner: false, isWritable: true },
    { pubkey: accounts.queueAuthority, isSigner: false, isWritable: true },
    { pubkey: accounts.dataBuffer, isSigner: false, isWritable: true },
    { pubkey: accounts.permission, isSigner: false, isWritable: true },
    { pubkey: accounts.escrow, isSigner: false, isWritable: true },
    { pubkey: accounts.programState, isSigner: false, isWritable: true },
    { pubkey: accounts.switchboardProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.payerWallet, isSigner: false, isWritable: true },
    { pubkey: accounts.payerAuthority, isSigner: true, isWritable: false },
    { pubkey: accounts.recentBlockhashes, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([213, 5, 173, 166, 37, 236, 31, 18])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      params: types.RequestRandomnessParams.toEncodable(args.params),
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
