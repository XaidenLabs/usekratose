use solana_program::{account_info::AccountInfo, entrypoint, entrypoint::ProgramResult, msg, program_error::ProgramError, pubkey::Pubkey};

entrypoint!(process_instruction);

fn valid(data: &[u8], signer: bool) -> bool {
    #[cfg(not(feature = "v2"))]
    return data == [1] && signer;
    #[cfg(feature = "v2")]
    return matches!(data, [1] | [2]) && signer;
}

pub fn process_instruction(_: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let authority = accounts.first().ok_or(ProgramError::NotEnoughAccountKeys)?;
    if !valid(data, authority.is_signer) { return Err(ProgramError::MissingRequiredSignature); }
    msg!("UseKratose vault authorization accepted");
    Ok(())
}

#[cfg(test)]
mod tests { use super::*; #[test] fn requires_signer() { assert!(valid(&[1], true)); assert!(!valid(&[1], false)); } }

