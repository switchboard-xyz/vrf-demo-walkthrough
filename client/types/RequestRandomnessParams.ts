import { PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh"

export interface RequestRandomnessParamsFields {
  permissionBump: number
  switchboardStateBump: number
}

export interface RequestRandomnessParamsJSON {
  permissionBump: number
  switchboardStateBump: number
}

export class RequestRandomnessParams {
  readonly permissionBump: number
  readonly switchboardStateBump: number

  constructor(fields: RequestRandomnessParamsFields) {
    this.permissionBump = fields.permissionBump
    this.switchboardStateBump = fields.switchboardStateBump
  }

  static layout(property?: string) {
    return borsh.struct(
      [borsh.u8("permissionBump"), borsh.u8("switchboardStateBump")],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new RequestRandomnessParams({
      permissionBump: obj.permissionBump,
      switchboardStateBump: obj.switchboardStateBump,
    })
  }

  static toEncodable(fields: RequestRandomnessParamsFields) {
    return {
      permissionBump: fields.permissionBump,
      switchboardStateBump: fields.switchboardStateBump,
    }
  }

  toJSON(): RequestRandomnessParamsJSON {
    return {
      permissionBump: this.permissionBump,
      switchboardStateBump: this.switchboardStateBump,
    }
  }

  static fromJSON(obj: RequestRandomnessParamsJSON): RequestRandomnessParams {
    return new RequestRandomnessParams({
      permissionBump: obj.permissionBump,
      switchboardStateBump: obj.switchboardStateBump,
    })
  }

  toEncodable() {
    return RequestRandomnessParams.toEncodable(this)
  }
}
