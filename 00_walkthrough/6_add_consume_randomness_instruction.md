# Add Consume Randomness Instruction

```bash
$ git checkout tags/6
```

Right now our program can request randomness but we never configured the
callback into our program so we have no way to know when the randomness value
was produced. So we will need to add a new instruction that the Switchboard
oracle will call in order to update our client's state.

In `programs/vrf-client/src/lib.rs`, add the mapping for our request_randomness
action.

```diff
#[program]
pub mod vrf_client {
    use super::*;

    #[access_control(ctx.accounts.validate(&ctx, &params))]
    pub fn init_client(ctx: Context<initClient>, params: initClientParams) -> Result<()> {
        initClient::actuate(&ctx, &params)
    }

    #[access_control(ctx.accounts.validate(&ctx, &params))]
    pub fn request_randomness(
        ctx: Context<RequestRandomness>,
        params: RequestRandomnessParams,
    ) -> Result<()> {
        RequestRandomness::actuate(&ctx, &params)
    }

+    #[access_control(ctx.accounts.validate(&ctx, &params))]
+    pub fn consume_randomness(
+        ctx: Context<ConsumeRandomness>,
+        params: ConsumeRandomnessParams,
+    ) -> Result<()> {
+        ConsumeRandomness::actuate(&ctx, &params)
+    }
}
```

add an event we'll trigger when a VRF Client successfully requests randomness
from a Switchboard queue

```rust
#[event]
pub struct VrfClientUpdated {
    pub vrf_client: Pubkey,
    pub max_result: u64,
    pub result_buffer: [u8; 32],
    pub result: u128,
    pub timestamp: i64,
}
```

In `programs/vrf-client/src/actions/mod.rs`, add the exports

```rust
pub mod consume_randomness;
pub use consume_randomness::*;
```

Add the consume_randomness instruction in
`programs/vrf-client/src/actions/consume_randomness.rs`

```rust
use crate::*;

#[derive(Accounts)]
#[instruction(params: ConsumeRandomnessParams)] // rpc parameters hint
pub struct ConsumeRandomness<'info> {
    #[account(
        mut,
        seeds = [
            STATE_SEED,
            vrf.key().as_ref(),
        ],
        bump = state.load()?.bump,
        has_one = vrf @ VrfClientErrorCode::InvalidVrfAccount
    )]
    pub state: AccountLoader<'info, VrfClientState>,
    pub vrf: AccountLoader<'info, VrfAccountData>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct ConsumeRandomnessParams {}

impl ConsumeRandomness<'_> {
    pub fn validate(&self, _ctx: &Context<Self>, _params: &ConsumeRandomnessParams) -> Result<()> {
        Ok(())
    }

    pub fn actuate(ctx: &Context<Self>, _params: &ConsumeRandomnessParams) -> Result<()> {
        let vrf = ctx.accounts.vrf.load()?;
        let result_buffer = vrf.get_result()?;
        if result_buffer == [0u8; 32] {
            msg!("vrf buffer empty");
            return Ok(());
        }

        let state = &mut ctx.accounts.state.load_mut()?;
        let max_result = state.max_result;
        if result_buffer == state.result_buffer {
            msg!("result_buffer unchanged");
            return Ok(());
        }

        msg!("Result buffer is {:?}", result_buffer);
        let value: &[u128] = bytemuck::cast_slice(&result_buffer[..]);
        msg!("u128 buffer {:?}", value);
        let result = value[0] % max_result as u128 + 1;
        msg!("Current VRF Value [1 - {}) = {}!", max_result, result);

        if state.result != result {
            state.result_buffer = result_buffer;
            state.result = result;
            state.timestamp = clock::Clock::get().unwrap().unix_timestamp;

            emit!(VrfClientUpdated {
                vrf_client: ctx.accounts.state.key(),
                max_result: state.max_result,
                result: state.result,
                result_buffer: result_buffer,
                timestamp: state.timestamp,
            });
        }

        Ok(())
    }
}
```

Ok, now we need to update our tests. Let's look at `tests/vrf-client.ts`. When
we created our VrfAccount we didn't define a callback so our oracle will never
let our program know when a new value is available. You could watch the chain
and call the consume_randomness instruction yourself but that is extra overhead
and complexity.

Instead we will define a callback so the oracle will call our program each time
a new value is accepted. The consume_randomness instruction includes two
accounts, our client and the VRF Account, and has no parameters. You may be
thinking the ixData will be empty but Anchor adds a unique 8 byte discriminator
to all instructions (and accounts) which is a hash of the instruction name. This
helps map the instruction to your programs interface.

```diff
const vrfAccount = await VrfAccount.create(switchboard.program, {
  keypair: vrfKeypair,
  authority: vrfClientKey,
  queue: switchboard.queue,
-  // Useless, will update when consume_randomness instruction is created
  callback: {
    programId: program.programId,
-    accounts: [],
+    accounts: [
+      { pubkey: vrfClientKey, isSigner: false, isWritable: true },
+      { pubkey: vrfKeypair.publicKey, isSigner: false, isWritable: false },
+    ],
-    ixData: Buffer.from(""),
+    ixData: new anchor.BorshInstructionCoder(program.idl).encode(
+      "consumeRandomness",
+      ""
+    ),
  },
});
```

Now let's add some logic to await the randomness result from the oracle.

```diff

    console.log(
      `request_randomness transaction signature: ${request_signature}`
    );

+    const result = await awaitCallback(program, vrfClientKey, 20_000);
+
+    console.log(`VrfClient Result: ${result}`);

+    return;
  });
});

+ async function awaitCallback(
+   program: Program<VrfClient>,
+   vrfClientKey: anchor.web3.PublicKey,
+   timeoutInterval: number,
+   errorMsg = "Timed out waiting for VRF Client callback"
+ ) {
+   let ws: number | undefined = undefined;
+   const result: anchor.BN = await promiseWithTimeout(
+     timeoutInterval,
+     new Promise(
+       (
+         resolve: (result: anchor.BN) => void
+       ) => {
+         ws = program.provider.connection.onAccountChange(
+           vrfClientKey,
+           async (
+             accountInfo: anchor.web3.AccountInfo<Buffer>,
+             context: anchor.web3.Context
+           ) => {
+             const clientState =
+               program.account.vrfClientState.coder.accounts.decode(
+                 "VrfClientState",
+                 accountInfo.data
+               );
+             if (clientState.result.gt(new anchor.BN(0))) {
+               resolve(clientState.result);
+             }
+           }
+         );
+       }
+     ).finally(async () => {
+       if (ws) {
+         await program.provider.connection.removeAccountChangeListener(ws);
+       }
+       ws = undefined;
+     }),
+     new Error(errorMsg)
+   ).finally(async () => {
+     if (ws) {
+       await program.provider.connection.removeAccountChangeListener(ws);
+     }
+     ws = undefined;
+   });
+
+   return result;
+ }
```

And finally run the test!

```bash
$ sbv2 solana anchor test --keypair ~/.config/solana/id.json
  vrf-client
oracleQueue: F9aV4MjaifGSpR8x84rLjHiAQQT13oohxZmv9XeoazXr
unpermissionedVrfEnabled: true
# of oracles heartbeating: 1
✔ Switchboard localnet environment loaded successfully

Created VRF Account: B7X8yHTJsUHC9KheJJ4nP5wSFf8smz7Gm2RcTAPSeyRm
Created Permission Account: 49GrWEcYms3pT2Nh9r8ety1J14zWQc2iFtHhVifoQ67F
init_client transaction signature 3A2ABSKRPUz6mDQxxwrVAanKsEdHZY4JUUKRVMpk5TiZSoNBVt5oW1pMe9v4A52PyTtY3aCRYHvTC1S6tm6V6mCu
    ✔ init_client (1342ms)
request_randomness transaction signature: 4zBuPsG5MsPP7y5ExSF6VPE9WhrwBy9e3JfoWqwumTsBMkmuCvhr5W3UVyFD4hNSUNGzJP2f4Hk9sDndmGQWHTc7
VrfClient Result: 230
    ✔ request_randomness (3290ms)


  2 passing (11s)

✨  Done in 28.80s.
```

And just like that you have integrated Switchboard's VRF into your very own
Anchor program!

## Next: [#7 anchor-client-gen](/00_walkthrough/7_anchor_client_gen.md)
