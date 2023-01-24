# Add init_client Instruction

```bash
$ git checkout tags/4
```

In `programs/vrf-client/src/lib.rs`, add the seed we'll use to derive our client
PDA pubkey, the VrfClientState struct, and some errors we'll be using.

```rust
const STATE_SEED: &[u8] = b"CLIENTSEED";

#[repr(packed)]
#[account(zero_copy)]
#[derive(Default)]
pub struct VrfClientState {
    pub bump: u8,
    pub max_result: u64,
    pub result_buffer: [u8; 32],
    pub result: u128,
    pub timestamp: i64,
    pub vrf: Pubkey,
}
```

add some errors we'll use

```rust
#[error_code]
#[derive(Eq, PartialEq)]
pub enum VrfClientErrorCode {
    #[msg("Switchboard VRF Account's authority should be set to the client's state pubkey")]
    InvalidVrfAuthorityError,
    #[msg("The max result must not exceed u64")]
    MaxResultExceedsMaximum,
}
```

then add an AnchorEvent we'll trigger when a new VRF Client is created

```rust
#[event]
pub struct VrfClientCreated {
    pub vrf_client: Pubkey,
    pub max_result: u64,
    pub timestamp: i64,
}
```

In `programs/vrf-client/src/actions/init_client.rs`, add the following code for
the init_client instruction.

```rust
use crate::*;

#[derive(Accounts)]
#[instruction(params: InitClientParams)]
pub struct InitClient<'info> {
    #[account(
        init,
        seeds = [
            STATE_SEED,
            vrf.key().as_ref()
        ],
        payer = payer,
        space = 8 + std::mem::size_of::<VrfClientState>(),
        bump,
    )]
    pub state: AccountLoader<'info, VrfClientState>,
    #[account(
        constraint = vrf.load()?.authority == state.key() @ VrfClientErrorCode::InvalidVrfAuthorityError
    )]
    pub vrf: AccountLoader<'info, VrfAccountData>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct InitClientParams {
    pub max_result: u64,
}

impl InitClient<'_>  {
    pub fn validate(&self, _ctx: &Context<Self>, params: &InitClientParams) -> Result<()> {
        msg!("init_client validate");
        if params.max_result > 1337 {
            return Err(error!(VrfClientErrorCode::MaxResultExceedsMaximum));
        }

        Ok(())
    }

    pub fn actuate(ctx: &Context<Self>, params: &InitClientParams) -> Result<()> {
        msg!("init_client actuate");

        let mut state = ctx.accounts.state.load_init()?;
        *state = VrfClientState::default();
        state.bump = ctx.bumps.get("state").unwrap().clone();
        state.vrf = ctx.accounts.vrf.key();

        if params.max_result == 0 {
            state.max_result = 1337;
        } else {
            state.max_result = params.max_result;
        }

        emit!(VrfClientCreated{
            vrf_client: ctx.accounts.state.key(),
            max_result: params.max_result,
            timestamp: clock::Clock::get().unwrap().unix_timestamp
        });

        Ok(())
    }
}
```

Then update the init_client test.

```typescript
it("init_client", async () => {
  const queue = await switchboard.queue.loadData();

  // Create Switchboard VRF and Permission account
  [vrfAccount] = await switchboard.queue.createVrf({
    callback: vrfClientCallback,
    authority: vrfClientKey, // vrf authority
    vrfKeypair: vrfSecret,
    enable: !queue.unpermissionedVrfEnabled, // only set permissions if required
  });

  console.log(`Created VRF Account: ${vrfAccount.publicKey}`);

  // Create VRF Client account
  await program.methods
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
  console.log(`Created VrfClient Account: ${vrfClientKey}`);
});
```

Now run the test

```bash
anchor test
```

_Optionally, add `-s` to suppress the Switchboard oracle logs_

## Next: [#5 Add request_randomness Instruction](/00_walkthrough/5_add_request_randomness_instruction.md)
