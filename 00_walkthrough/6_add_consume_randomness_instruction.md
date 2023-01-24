# Add Consume Randomness Instruction

```bash
$ git checkout tags/6
```

Right now our program can request randomness but we never configured the
callback into our program so we have no way to know when the randomness value
was produced. So we will need to add a new instruction that the Switchboard
oracle will call in order to update our client's state.

In `programs/vrf-client/src/lib.rs`, add the mapping for our consume_randomness
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

add an event we'll trigger when a VRF Client successfully consumes randomness
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
const [vrfAccount] = await switchboard.queue.createVrf({
    vrfKeypair,
    callback: {
        programId: program.programId,
-       accounts: [],
+       accounts: [
+           { pubkey: vrfClientKey, isSigner: false, isWritable: true },
+           { pubkey: vrfKeypair.publicKey, isSigner: false, isWritable: false },
+       ],
-       ixData: Buffer.from(""),
+       ixData: new anchor.BorshInstructionCoder(program.idl).encode(
+           "consumeRandomness",
+           ""
+       ),
    },
    enable: true,
});
```

Now let's add some logic to await the randomness result from the oracle. This
function will invoke our programs request randomness instruction then open a
websocket and await the result. If the result is not populated in 45s then it
will throw an error.

```typescript
it("request_randomness", async () => {
  // ... request randomness

  const result = await vrfAccount.nextResult(
    new anchor.BN(vrf.counter.toNumber() + 1),
    45_000
  );
  if (!result.success) {
    throw new Error(`Failed to get VRF Result: ${result.status}`);
  }

  const vrfClientState = await program.account.vrfClientState.fetch(
    vrfClientKey
  );
  console.log(`VrfClient Result: ${vrfClientState.result.toString(10)}`);

  const callbackTxnMeta = await vrfAccount.getCallbackTransactions();
  console.log(
    JSON.stringify(
      callbackTxnMeta.map((tx) => tx.meta.logMessages),
      undefined,
      2
    )
  );

  assert(!vrfClientState.result.eq(new BN(0)), "Vrf Client holds no result");
});
```

And finally run the test!

```bash
$ anchor test

VRF Account: BJe3Y8WQUnT4wx9owBSxwRTuXFHk3deJAMFVPzFTWAxd
VRF Client: 8tNNmjT8QxRabWeQKSqTXtR296h8fg8p8rDvAnYKsssW


  vrf-client
Starting Switchboard oracle ...
Created VRF Account: BJe3Y8WQUnT4wx9owBSxwRTuXFHk3deJAMFVPzFTWAxd
Created VrfClient Account: 8tNNmjT8QxRabWeQKSqTXtR296h8fg8p8rDvAnYKsssW
    ✔ init_client (868ms)

VrfClient Result: 423
[
  [
    "Program ComputeBudget111111111111111111111111111111 invoke [1]",
    "Program ComputeBudget111111111111111111111111111111 success",
    "Program ComputeBudget111111111111111111111111111111 invoke [1]",
    "Program ComputeBudget111111111111111111111111111111 success",
    "Program 2TfB33aLaneQb5TNVwyDz3jSZXS6jdW2ARw1Dgf84XCG invoke [1]",
    "Program log: Instruction: VrfProveAndVerify",
    "Program log: Invoking callback",
    "Program EmPZGD34KDCtdwtqJU5VGoqidDQLyW1eyBXvj4yb2W9i invoke [2]",
    "Program log: Instruction: ConsumeRandomness",
    "Program log: Result buffer is [154, 219, 184, 150, 38, 3, 191, 10, 24, 94, 122, 191, 243, 220, 46, 3, 127, 16, 168, 132, 253, 154, 220, 201, 165, 215, 50, 80, 44, 155, 227, 59]",
    "Program log: u128 buffer [4231011084663214195166609165078027162, 79606250422545424453288202565814063231]",
    "Program log: Current VRF Value [1 - 1337) = 423!",
    "Program data: V8IkGhLydDZ1KplU2NCJUISD3i6LBt01IwAMyruAYBhFe04y+lhyiTkFAAAAAAAAmtu4liYDvwoYXnq/89wuA38QqIT9mtzJpdcyUCyb4zunAQAAAAAAAAAAAAAAAAAAsmbQYwAAAAA=",
    "Program EmPZGD34KDCtdwtqJU5VGoqidDQLyW1eyBXvj4yb2W9i consumed 24439 of 1386272 compute units",
    "Program EmPZGD34KDCtdwtqJU5VGoqidDQLyW1eyBXvj4yb2W9i success",
    "Program data: KT1kCMGFQ4WZGaDlpbqimoe3KXzhbQ4vGtkw9W7vNVyMmAaYkEE3BlCuBj8iwJHMZ46bwLeQsva1G43tyWLKwk8Gi9F77RPrAAAAAAAAAAA=",
    "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
    "Program log: Instruction: Transfer",
    "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4785 of 1358285 compute units",
    "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
    "Program 2TfB33aLaneQb5TNVwyDz3jSZXS6jdW2ARw1Dgf84XCG consumed 47533 of 1400000 compute units",
    "Program 2TfB33aLaneQb5TNVwyDz3jSZXS6jdW2ARw1Dgf84XCG success"
  ]
]
    ✔ request_randomness (4340ms)


  2 passing (27s)

✨  Done in 28.30s.
```

And just like that you have integrated Switchboard's VRF into your very own
Anchor program!

## Next: [#7 anchor-client-gen](/00_walkthrough/7_anchor_client_gen.md)
