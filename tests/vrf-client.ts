import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { VrfClient } from "../target/types/vrf_client";
import { SwitchboardTestContext } from "@switchboard-xyz/sbv2-utils";
import * as sbv2 from "@switchboard-xyz/switchboard-v2";
import { PublicKey } from "@solana/web3.js";

describe("vrf-client", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.VrfClient as Program<VrfClient>;
  const provider = program.provider as anchor.AnchorProvider;
  const payer = (provider.wallet as sbv2.AnchorWallet).payer;

  let switchboard: SwitchboardTestContext;

  let vrfClientKey: PublicKey;
  let vrfClientBump: number;

  before(async () => {
    switchboard = await SwitchboardTestContext.loadFromEnv(
      program.provider as anchor.AnchorProvider,
      undefined,
      5_000_000 // .005 wSOL
    );
    await switchboard.oracleHeartbeat();
    const queueData = await switchboard.queue.loadData();
    console.log(`oracleQueue: ${switchboard.queue.publicKey}`);
    console.log(
      `unpermissionedVrfEnabled: ${queueData.unpermissionedVrfEnabled}`
    );
    console.log(`# of oracles heartbeating: ${queueData.queue.length}`);
    console.log(
      "\x1b[32m%s\x1b[0m",
      `\u2714 Switchboard localnet environment loaded successfully\n`
    );
  });

  it("init_client", async () => {
    const { unpermissionedVrfEnabled, authority, dataBuffer } =
      await switchboard.queue.loadData();

    const vrfKeypair = anchor.web3.Keypair.generate();

    // find PDA used for our client state pubkey
    [vrfClientKey, vrfClientBump] =
      anchor.utils.publicKey.findProgramAddressSync(
        [Buffer.from("CLIENTSEED"), vrfKeypair.publicKey.toBytes()],
        program.programId
      );

    const vrfAccount = await sbv2.VrfAccount.create(switchboard.program, {
      keypair: vrfKeypair,
      authority: vrfClientKey,
      queue: switchboard.queue,
      // Useless, will update when consume_randomness instruction is created
      callback: {
        programId: program.programId,
        accounts: [],
        ixData: Buffer.from(""),
      },
    });
    console.log(`Created VRF Account: ${vrfAccount.publicKey}`);
    const permissionAccount = await sbv2.PermissionAccount.create(
      switchboard.program,
      {
        authority,
        granter: switchboard.queue.publicKey,
        grantee: vrfAccount.publicKey,
      }
    );
    console.log(`Created Permission Account: ${permissionAccount.publicKey}`);

    // If queue requires permissions to use VRF, check the correct authority was provided
    if (!unpermissionedVrfEnabled) {
      if (!payer.publicKey.equals(authority)) {
        throw new Error(
          `queue requires PERMIT_VRF_REQUESTS and wrong queue authority provided`
        );
      }

      await permissionAccount.set({
        authority: payer,
        permission: sbv2.SwitchboardPermission.PERMIT_VRF_REQUESTS,
        enable: true,
      });
      console.log(`Set VRF Permissions`);
    }

    const tx = await program.methods
      .initClient({
        maxResult: new anchor.BN(1337),
      })
      .accounts({
        state: vrfClientKey,
        vrf: vrfAccount.publicKey,
        payer: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("init_client transaction signature", tx);
  });
});
