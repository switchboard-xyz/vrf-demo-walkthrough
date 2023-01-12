import * as anchor from "@project-serum/anchor";
import * as sbv2 from "@switchboard-xyz/solana.js";
import { assert } from "chai";
import { VrfClient } from "../target/types/vrf_client";

const logSuccess = (logMessage: string) =>
  console.log("\x1b[32m%s\x1b[0m", `\u2714 ${logMessage}\n`);

describe("vrf-client", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.VrfClient as anchor.Program<VrfClient>;
  const provider = program.provider as anchor.AnchorProvider;
  const payer = (provider.wallet as sbv2.AnchorWallet).payer;

  let switchboard: sbv2.SwitchboardTestContext;
  let payerTokenAddress: anchor.web3.PublicKey;

  const vrfKeypair = anchor.web3.Keypair.generate();

  let vrfClientKey: anchor.web3.PublicKey;
  let vrfClientBump: number;
  [vrfClientKey, vrfClientBump] = anchor.utils.publicKey.findProgramAddressSync(
    [Buffer.from("CLIENTSEED"), vrfKeypair.publicKey.toBytes()],
    program.programId
  );

  before(async () => {
    switchboard = await sbv2.SwitchboardTestContext.loadFromEnv(
      program.provider as anchor.AnchorProvider
    );
    const queueData = await switchboard.queue.loadData();
    const queueOracles = await switchboard.queue.loadOracles();
    [payerTokenAddress] = await switchboard.program.mint.getOrCreateWrappedUser(
      switchboard.program.walletPubkey,
      { fundUpTo: 0.75 }
    );
    assert(queueOracles.length > 0, `No oracles actively heartbeating`);
    console.log(`oracleQueue: ${switchboard.queue.publicKey}`);
    console.log(
      `unpermissionedVrfEnabled: ${queueData.unpermissionedVrfEnabled}`
    );
    console.log(`# of oracles heartbeating: ${queueOracles.length}`);
    logSuccess("Switchboard localnet environment loaded successfully");
  });

  it("init_client", async () => {
    const [vrfAccount] = await switchboard.queue.createVrf({
      vrfKeypair,
      authority: vrfClientKey,
      callback: {
        programId: program.programId,
        accounts: [
          { pubkey: vrfClientKey, isSigner: false, isWritable: true },
          { pubkey: vrfKeypair.publicKey, isSigner: false, isWritable: false },
        ],
        ixData: new anchor.BorshInstructionCoder(program.idl).encode(
          "consumeRandomness",
          ""
        ),
      },
      enable: true,
    });
    const vrf = await vrfAccount.loadData();
    logSuccess(`Created VRF Account: ${vrfAccount.publicKey.toBase58()}`);
    console.log(
      "callback",
      JSON.stringify(
        {
          programId: vrf.callback.programId.toBase58(),
          accounts: vrf.callback.accounts.slice(0, vrf.callback.accountsLen),
          ixData: vrf.callback.ixData.slice(0, vrf.callback.ixDataLen),
        },
        undefined,
        2
      )
    );

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

  it("request_randomness", async () => {
    const state = await program.account.vrfClientState.fetch(vrfClientKey);
    const vrfAccount = new sbv2.VrfAccount(switchboard.program, state.vrf);
    const vrfState = await vrfAccount.loadData();
    const queueState = await switchboard.queue.loadData();

    const [permissionAccount, permissionBump] = sbv2.PermissionAccount.fromSeed(
      switchboard.program,
      queueState.authority,
      switchboard.queue.publicKey,
      vrfAccount.publicKey
    );

    const [newVrfState, request_signature] =
      await vrfAccount.requestAndAwaitResult(
        {
          vrf: vrfState,
          requestFunction: async () => {
            const request_signature = await program.methods
              .requestRandomness({
                switchboardStateBump: switchboard.program.programState.bump,
                permissionBump,
              })
              .accounts({
                state: vrfClientKey,
                vrf: vrfAccount.publicKey,
                oracleQueue: switchboard.queue.publicKey,
                queueAuthority: queueState.authority,
                dataBuffer: queueState.dataBuffer,
                permission: permissionAccount.publicKey,
                escrow: vrfState.escrow,
                programState: switchboard.program.programState.publicKey,
                switchboardProgram: switchboard.program.programId,
                payerWallet: payerTokenAddress,
                payerAuthority: payer.publicKey,
                recentBlockhashes: anchor.web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
                tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              })
              .rpc();
            console.log(
              `request_randomness transaction signature: ${request_signature}`
            );
            return request_signature;
          },
        },
        45_000
      );

    const callbackTxn = await vrfAccount.getCallbackTransactions(
      newVrfState.currentRound.requestSlot,
      20
    );
    callbackTxn.map((tx) => console.log(tx.meta.logMessages.join("\n") + "\n"));

    const vrfClientState = await program.account.vrfClientState.fetch(
      vrfClientKey
    );

    console.log(`VrfClient Result: ${vrfClientState.result.toString(10)}`);

    assert(
      newVrfState.status.kind ===
        sbv2.types.VrfStatus.StatusCallbackSuccess.kind,
      `VRF status mismatch, expected 'StatusCallbackSuccess', received ${newVrfState.status.kind}`
    );
  });
});
