import { PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh"

export interface InitClientParamsFields {
  maxResult: BN
}

export interface InitClientParamsJSON {
  maxResult: string
}

export class InitClientParams {
  readonly maxResult: BN

  constructor(fields: InitClientParamsFields) {
    this.maxResult = fields.maxResult
  }

  static layout(property?: string) {
    return borsh.struct([borsh.u64("maxResult")], property)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new InitClientParams({
      maxResult: obj.maxResult,
    })
  }

  static toEncodable(fields: InitClientParamsFields) {
    return {
      maxResult: fields.maxResult,
    }
  }

  toJSON(): InitClientParamsJSON {
    return {
      maxResult: this.maxResult.toString(),
    }
  }

  static fromJSON(obj: InitClientParamsJSON): InitClientParams {
    return new InitClientParams({
      maxResult: new BN(obj.maxResult),
    })
  }

  toEncodable() {
    return InitClientParams.toEncodable(this)
  }
}
