use solana_program::{account_info::AccountInfo, entrypoint, entrypoint::ProgramResult, msg, program_error::ProgramError, pubkey::Pubkey};

entrypoint!(process_instruction);

fn valid(data: &[u8], signer: bool) -> bool {
    #[cfg(not(feature = "v2"))]
    return data == [7] && signer;
    #[cfg(feature = "v2")]
    return matches!(data, [7] | [8]) && signer;
}

pub fn process_instruction(_: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let admin = accounts.first().ok_or(ProgramError::NotEnoughAccountKeys)?;
    if !valid(data, admin.is_signer) { return Err(ProgramError::MissingRequiredSignature); }
    msg!("UseKratose admin action accepted");
    Ok(())
}

#[cfg(test)]
mod tests { use super::*; #[test] fn requires_admin_signature() { assert!(valid(&[7], true)); assert!(!valid(&[7], false)); } }

