import { PublicKey, Connection } from "@solana/web3.js"
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface VrfClientStateFields {
  bump: number
  maxResult: BN
  resultBuffer: Array<number>
  result: BN
  timestamp: BN
  vrf: PublicKey
}

export interface VrfClientStateJSON {
  bump: number
  maxResult: string
  resultBuffer: Array<number>
  result: string
  timestamp: string
  vrf: string
}

export class VrfClientState {
  readonly bump: number
  readonly maxResult: BN
  readonly resultBuffer: Array<number>
  readonly result: BN
  readonly timestamp: BN
  readonly vrf: PublicKey

  static readonly discriminator = Buffer.from([
    173, 240, 159, 11, 226, 117, 124, 97,
  ])

  static readonly layout = borsh.struct([
    borsh.u8("bump"),
    borsh.u64("maxResult"),
    borsh.array(borsh.u8(), 32, "resultBuffer"),
    borsh.u128("result"),
    borsh.i64("timestamp"),
    borsh.publicKey("vrf"),
  ])

  constructor(fields: VrfClientStateFields) {
    this.bump = fields.bump
    this.maxResult = fields.maxResult
    this.resultBuffer = fields.resultBuffer
    this.result = fields.result
    this.timestamp = fields.timestamp
    this.vrf = fields.vrf
  }

  static async fetch(
    c: Connection,
    address: PublicKey
  ): Promise<VrfClientState | null> {
    const info = await c.getAccountInfo(address)

    if (info === null) {
      return null
    }
    if (!info.owner.equals(PROGRAM_ID)) {
      throw new Error("account doesn't belong to this program")
    }

    return this.decode(info.data)
  }

  static async fetchMultiple(
    c: Connection,
    addresses: PublicKey[]
  ): Promise<Array<VrfClientState | null>> {
    const infos = await c.getMultipleAccountsInfo(addresses)

    return infos.map((info) => {
      if (info === null) {
        return null
      }
      if (!info.owner.equals(PROGRAM_ID)) {
        throw new Error("account doesn't belong to this program")
      }

      return this.decode(info.data)
    })
  }

  static decode(data: Buffer): VrfClientState {
    if (!data.slice(0, 8).equals(VrfClientState.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = VrfClientState.layout.decode(data.slice(8))

    return new VrfClientState({
      bump: dec.bump,
      maxResult: dec.maxResult,
      resultBuffer: dec.resultBuffer,
      result: dec.result,
      timestamp: dec.timestamp,
      vrf: dec.vrf,
    })
  }

  toJSON(): VrfClientStateJSON {
    return {
      bump: this.bump,
      maxResult: this.maxResult.toString(),
      resultBuffer: this.resultBuffer,
      result: this.result.toString(),
      timestamp: this.timestamp.toString(),
      vrf: this.vrf.toString(),
    }
  }

  static fromJSON(obj: VrfClientStateJSON): VrfClientState {
    return new VrfClientState({
      bump: obj.bump,
      maxResult: new BN(obj.maxResult),
      resultBuffer: obj.resultBuffer,
      result: new BN(obj.result),
      timestamp: new BN(obj.timestamp),
      vrf: new PublicKey(obj.vrf),
    })
  }
}
