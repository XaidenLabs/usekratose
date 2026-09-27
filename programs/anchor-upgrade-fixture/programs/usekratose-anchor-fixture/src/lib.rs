use anchor_lang::prelude::*;

declare_id!("EfJhXeDqu4YS6fZRj9Z1vCpzJwhJsjZ7qRdyFdSMmJHT");

#[program]
pub mod usekratose_anchor_fixture {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        ctx.accounts.vault.authority = ctx.accounts.authority.key();
        ctx.accounts.vault.total_deposited = 0;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, FixtureError::InvalidAmount);
        ctx.accounts.vault.total_deposited = ctx
            .accounts
            .vault
            .total_deposited
            .checked_add(amount)
            .ok_or(FixtureError::ArithmeticOverflow)?;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, FixtureError::InvalidAmount);
        require!(
            ctx.accounts.vault.total_deposited >= amount,
            FixtureError::InsufficientBalance
        );
        ctx.accounts.vault.total_deposited -= amount;
        Ok(())
    }

    #[cfg(all(feature = "v2", not(feature = "v3")))]
    pub fn emergency_withdraw(ctx: Context<EmergencyWithdrawV2>, amount: u64) -> Result<()> {
        require!(amount > 0, FixtureError::InvalidAmount);
        require!(
            ctx.accounts.vault.total_deposited >= amount,
            FixtureError::InsufficientBalance
        );
        ctx.accounts.vault.total_deposited -= amount;
        msg!("UseKratose v2 emergency withdrawal: {}", amount);
        Ok(())
    }

    #[cfg(feature = "v3")]
    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, FixtureError::InvalidAmount);
        require!(
            ctx.accounts.vault.total_deposited >= amount,
            FixtureError::InsufficientBalance
        );
        ctx.accounts.vault.total_deposited -= amount;
        msg!("UseKratose v3 authorized emergency withdrawal: {}", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Vault::INIT_SPACE,
        seeds = [VAULT_SEED],
        bump
    )]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    pub depositor: Signer<'info>,
    #[account(mut, seeds = [VAULT_SEED], bump)]
    pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub authority: Signer<'info>,
    #[account(mut, seeds = [VAULT_SEED], bump, has_one = authority)]
    pub vault: Account<'info, Vault>,
}

#[cfg(all(feature = "v2", not(feature = "v3")))]
#[derive(Accounts)]
pub struct EmergencyWithdrawV2<'info> {
    #[account(mut, seeds = [VAULT_SEED], bump)]
    pub vault: Account<'info, Vault>,
}

#[cfg(feature = "v3")]
#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    pub authority: Signer<'info>,
    #[account(mut, seeds = [VAULT_SEED], bump, has_one = authority)]
    pub vault: Account<'info, Vault>,
}

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub authority: Pubkey,
    pub total_deposited: u64,
}

#[error_code]
pub enum FixtureError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Vault balance is insufficient")]
    InsufficientBalance,
    #[msg("Vault arithmetic overflow")]
    ArithmeticOverflow,
}

#[constant]
pub const VAULT_SEED: &[u8] = b"vault";
