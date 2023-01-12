# Initial Program Scaffolding

```bash
$ git checkout tags/2
```

This program will be fairly simple and contain only 3 instructions:

- **init_client** will initialize an on-chain program derived account to hold
  our state and VRF result
- **request_randomness** will make a cross program invocation to Switchboard to
  request an oracle to fulfill a VRF update request
- **consume_randomness** will be a cross program invocation from Switchboard
  into our VRF client program to let us know a new randomness value was produced
  and verified successfully

Each instruction will be contained in its own module in
`programs/vrf-client/actions` to breakup any program logic. Each action will
contain a validate function to do any validation before calling actuate which
contains the core instruction logic. In `programs/vrf-client/src/lib.rs`, we'll
map each action to our program struct so anchor knows each instructions entry
point.

First start by creating the folder structure

```bash
mkdir -p programs/vrf-client/src/actions
touch programs/vrf-client/src/actions/mod.rs programs/vrf-client/src/actions/init_client.rs
```

In `programs/vrf-client/src/actions/mod.rs`, import the init_client module which
will house our first instruction.

```rust
pub mod init_client;
pub use init_client::*;
```

In `programs/vrf-client/src/actions/init_client.rs`, add the initial instruction
structs which we will populate later.

```rust
use crate::*;

#[derive(Accounts)]
#[instruction(params: InitClientParams)]
pub struct InitClient {}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct InitClientParams {}

impl InitClient {
    pub fn validate(&self, _ctx: &Context<Self>, params: &InitClientParams) -> Result<()> {
        msg!("init_client validate");
        Ok(())
    }

    pub fn actuate(ctx: &Context<Self>, params: &InitClientParams) -> Result<()> {
        msg!("init_client actuate");

        Ok(())
    }
}
```

Then we'll map this instruction in `programs/vrf-client/src/lib.rs`

```rust
use anchor_lang::prelude::*;

pub mod actions;
pub use actions::*;

pub use anchor_lang::solana_program::clock;
pub use anchor_spl::token::{Token, TokenAccount};
pub use switchboard_v2::{
    OracleQueueAccountData, PermissionAccountData, SbState, VrfAccountData, VrfRequestRandomness,
};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod vrf_client {
    use super::*;

    #[access_control(ctx.accounts.validate(&ctx, &params))]
    pub fn init_client(ctx: Context<InitClient>, params: InitClientParams) -> Result<()> {
        InitClient::actuate(&ctx, &params)
    }
}
```

And finally we'll fix up and run the test. Update `tests/vrf-client.ts`

```typescript
import * as anchor from "@project-serum/anchor";
import * as sbv2 from "@switchboard-xyz/solana.js";
import { assert } from "chai";
import { VrfClient } from "../target/types/vrf_client";
describe("vrf-client", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.VrfClient as anchor.Program<VrfClient>;
  const provider = program.provider as anchor.AnchorProvider;
  const payer = (provider.wallet as sbv2.AnchorWallet).payer;

  it("init_client", async () => {
    // Add your test here.
    const tx = await program.methods.initClient({}).rpc();
    console.log("init_client transaction signature", tx);
  });
});
```

Build the program and run the test

```bash
$ anchor test

  vrf-client
init_client transaction signature Db5TfiWLT269ehpEXgT4dQntjGxj4PytYWPg1XCANcDGqseedGmqq4S5xkQ3RWkHx1FsdmpxSP1p5HKUYomiqAJ
    ✔ init_client (499ms)


  1 passing (501ms)
```

## Next: [#3 Setup Switchboard Environment](./3_setup_switchboard_environment.md)
