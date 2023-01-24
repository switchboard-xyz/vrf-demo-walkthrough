# Add Request Randomness Instruction

```bash
$ git checkout tags/5
```

We will now request randomness for our VRF Account that is controlled by our
client program. We will make a cross program invocation (CPI) into the
Switchboard program. The Switchboard program will validate the request then
assign an oracle to fulfill the randomness request. The oracle is constantly
watching the chain for oracle assignment, and when assigned, will calculate the
VRF result using the VRF Account's public key and the recent blockhash.

In `programs/vrf-client/src/lib.rs`, add the mapping for our request_randomness
action.

```diff
#[program]
pub mod vrf_client {
    use super::*;

    #[access_control(ctx.accounts.validate(&ctx, &params))]
    pub fn init_client(ctx: Context<InitClient>, params: InitClientParams) -> Result<()> {
        InitClient::actuate(&ctx, &params)
    }

+    #[access_control(ctx.accounts.validate(&ctx, &params))]
+    pub fn request_randomness(
+        ctx: Context<RequestRandomness>,
+        params: RequestRandomnessParams,
+    ) -> Result<()> {
+        RequestRandomness::actuate(&ctx, &params)
+    }
}
```

add some errors we'll use to validate the instruction

```diff
#[error_code]
#[derive(Eq, PartialEq)]
pub enum VrfClientErrorCode {
    #[msg("Switchboard VRF Account's authority should be set to the client's state pubkey")]
    InvalidVrfAuthorityError,
    #[msg("The max result must not exceed u64")]
    MaxResultExceedsMaximum,
+    #[msg("Invalid VRF account provided.")]
+    InvalidVrfAccount,
+    #[msg("Not a valid Switchboard account")]
+    InvalidSwitchboardAccount,
}

```

add an event we'll trigger when a VRF Client successfully requests randomness
from a Switchboard queue

```rust
#[event]
pub struct RandomnessRequested {
    pub vrf_client: Pubkey,
    pub max_result: u64,
    pub timestamp: i64,
}
```

In `programs/vrf-client/src/actions/mod.rs`, add the exports

```rust
pub mod request_randomness;
pub use request_randomness::*;
```

Add the request_randomness instruction in
`programs/vrf-client/src/actions/request_randomness.rs`

```rust
use crate::*;

#[derive(Accounts)]
#[instruction(params: RequestRandomnessParams)] // rpc parameters hint
pub struct RequestRandomness<'info> {
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

    // SWITCHBOARD ACCOUNTS
    #[account(mut,
        has_one = escrow
    )]
    pub vrf: AccountLoader<'info, VrfAccountData>,
    #[account(mut,
        has_one = data_buffer
    )]
    pub oracle_queue: AccountLoader<'info, OracleQueueAccountData>,
    /// CHECK:
    #[account(mut,
        constraint =
            oracle_queue.load()?.authority == queue_authority.key()
    )]
    pub queue_authority: UncheckedAccount<'info>,
    /// CHECK
    #[account(mut)]
    pub data_buffer: AccountInfo<'info>,
    #[account(mut)]
    pub permission: AccountLoader<'info, PermissionAccountData>,
    #[account(mut,
        constraint =
            escrow.owner == program_state.key()
            && escrow.mint == program_state.load()?.token_mint
    )]
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut)]
    pub program_state: AccountLoader<'info, SbState>,
    /// CHECK:
    #[account(
        address = *vrf.to_account_info().owner,
        constraint = switchboard_program.executable == true
    )]
    pub switchboard_program: AccountInfo<'info>,

    // PAYER ACCOUNTS
    #[account(mut,
        constraint =
            payer_wallet.owner == payer_authority.key()
            && escrow.mint == program_state.load()?.token_mint
    )]
    pub payer_wallet: Account<'info, TokenAccount>,
    /// CHECK:
    #[account(signer)]
    pub payer_authority: AccountInfo<'info>,

    // SYSTEM ACCOUNTS
    /// CHECK:
    #[account(address = solana_program::sysvar::recent_blockhashes::ID)]
    pub recent_blockhashes: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct RequestRandomnessParams {
    pub permission_bump: u8,
    pub switchboard_state_bump: u8,
}

impl RequestRandomness<'_> {
    pub fn validate(&self, _ctx: &Context<Self>, _params: &RequestRandomnessParams) -> Result<()> {
        Ok(())
    }

    pub fn actuate(ctx: &Context<Self>, params: &RequestRandomnessParams) -> Result<()> {
        let client_state = ctx.accounts.state.load()?;
        let bump = client_state.bump.clone();
        let max_result = client_state.max_result;
        drop(client_state);

        let switchboard_program = ctx.accounts.switchboard_program.to_account_info();

        let vrf_request_randomness = VrfRequestRandomness {
            authority: ctx.accounts.state.to_account_info(),
            vrf: ctx.accounts.vrf.to_account_info(),
            oracle_queue: ctx.accounts.oracle_queue.to_account_info(),
            queue_authority: ctx.accounts.queue_authority.to_account_info(),
            data_buffer: ctx.accounts.data_buffer.to_account_info(),
            permission: ctx.accounts.permission.to_account_info(),
            escrow: ctx.accounts.escrow.clone(),
            payer_wallet: ctx.accounts.payer_wallet.clone(),
            payer_authority: ctx.accounts.payer_authority.to_account_info(),
            recent_blockhashes: ctx.accounts.recent_blockhashes.to_account_info(),
            program_state: ctx.accounts.program_state.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };

        let vrf_key = ctx.accounts.vrf.key();
        let state_seeds: &[&[&[u8]]] = &[&[
            &STATE_SEED,
            vrf_key.as_ref(),
            &[bump],
        ]];

        msg!("requesting randomness");
        vrf_request_randomness.invoke_signed(
            switchboard_program,
            params.switchboard_state_bump,
            params.permission_bump,
            state_seeds,
        )?;

        let mut client_state = ctx.accounts.state.load_mut()?;
        client_state.result = 0;

        emit!(RandomnessRequested{
            vrf_client: ctx.accounts.state.key(),
            max_result: max_result,
            timestamp: clock::Clock::get().unwrap().unix_timestamp
        });

        msg!("randomness requested successfully");
        Ok(())
    }
}
```

Now let's add some client tests in `tests/vrf-client.ts`

```typescript
it("request_randomness", async () => {
  const queue = await switchboard.queue.loadData();
  const vrf = await vrfAccount.loadData();

  // derive the existing VRF permission account using the seeds
  const [permissionAccount, permissionBump] = sbv2.PermissionAccount.fromSeed(
    switchboard.program,
    queue.authority,
    switchboard.queue.publicKey,
    vrfAccount.publicKey
  );

  const [payerTokenWallet] =
    await switchboard.program.mint.getOrCreateWrappedUser(
      switchboard.program.walletPubkey,
      { fundUpTo: 0.002 }
    );

  // Request randomness
  await program.methods
    .requestRandomness({
      switchboardStateBump: switchboard.program.programState.bump,
      permissionBump,
    })
    .accounts({
      state: vrfClientKey,
      vrf: vrfAccount.publicKey,
      oracleQueue: switchboard.queue.publicKey,
      queueAuthority: queue.authority,
      dataBuffer: queue.dataBuffer,
      permission: permissionAccount.publicKey,
      escrow: vrf.escrow,
      programState: switchboard.program.programState.publicKey,
      switchboardProgram: switchboard.program.programId,
      payerWallet: payerTokenWallet,
      payerAuthority: payer.publicKey,
      recentBlockhashes: anchor.web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    })
    .rpc();
});
```

Then run the test

```bash
anchor test
```

## Next: [#6 Add consume_randomness Instruction](/00_walkthrough/6_add_consume_randomness_instruction.md)
