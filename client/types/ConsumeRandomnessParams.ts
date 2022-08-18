import { PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh"

export interface ConsumeRandomnessParamsFields {}

export interface ConsumeRandomnessParamsJSON {}

export class ConsumeRandomnessParams {
  constructor(fields: ConsumeRandomnessParamsFields) {}

  static layout(property?: string) {
    return borsh.struct([], property)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new ConsumeRandomnessParams({})
  }

  static toEncodable(fields: ConsumeRandomnessParamsFields) {
    return {}
  }

  toJSON(): ConsumeRandomnessParamsJSON {
    return {}
  }

  static fromJSON(obj: ConsumeRandomnessParamsJSON): ConsumeRandomnessParams {
    return new ConsumeRandomnessParams({})
  }

  toEncodable() {
    return ConsumeRandomnessParams.toEncodable(this)
  }
}
