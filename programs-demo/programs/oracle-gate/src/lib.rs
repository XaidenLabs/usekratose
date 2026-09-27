use solana_program::{account_info::AccountInfo, entrypoint, entrypoint::ProgramResult, msg, program_error::ProgramError, pubkey::Pubkey};

entrypoint!(process_instruction);

fn valid(data: &[u8]) -> bool {
    #[cfg(not(feature = "v2"))]
    return data.len() == 8;
    #[cfg(feature = "v2")]
    return matches!(data.len(), 8 | 16);
}

pub fn process_instruction(_: &Pubkey, _: &[AccountInfo], data: &[u8]) -> ProgramResult {
    if !valid(data) { return Err(ProgramError::InvalidInstructionData); }
    msg!("UseKratose oracle payload accepted");
    Ok(())
}

#[cfg(test)]
mod tests { use super::*; #[test] fn requires_price_width() { assert!(valid(&[0; 8])); assert!(!valid(&[0; 7])); } }

