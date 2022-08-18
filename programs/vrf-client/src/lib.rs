use anchor_lang::prelude::*;

declare_id!("D79gSNtjonBFmDfc4zznoYaJHPwGTb35zHQ1EPUPsxxp");

#[program]
pub mod vrf_client {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
