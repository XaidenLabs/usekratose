use solana_program::{account_info::AccountInfo, entrypoint, entrypoint::ProgramResult, msg, program_error::ProgramError, pubkey::Pubkey};

entrypoint!(process_instruction);

fn valid(data: &[u8]) -> bool {
    #[cfg(not(feature = "v2"))]
    return matches!(data, [1]);
    #[cfg(feature = "v2")]
    return matches!(data, [1] | [2]);
}

pub fn process_instruction(_: &Pubkey, _: &[AccountInfo], data: &[u8]) -> ProgramResult {
    if !valid(data) { return Err(ProgramError::InvalidInstructionData); }
    msg!("UseKratose counter operation accepted");
    Ok(())
}

#[cfg(test)]
mod tests { use super::*; #[test] fn validates_increment() { assert!(valid(&[1])); assert!(!valid(&[0])); } }

