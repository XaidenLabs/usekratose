use solana_program::{account_info::AccountInfo, entrypoint, entrypoint::ProgramResult, msg, program_error::ProgramError, pubkey::Pubkey};

entrypoint!(process_instruction);

fn valid(data: &[u8]) -> bool {
    #[cfg(not(feature = "v2"))]
    return data.len() == 33 && matches!(data[32], 0 | 1);
    #[cfg(feature = "v2")]
    return data.len() == 33 && matches!(data[32], 0 | 1 | 2);
}

pub fn process_instruction(_: &Pubkey, _: &[AccountInfo], data: &[u8]) -> ProgramResult {
    if !valid(data) { return Err(ProgramError::InvalidInstructionData); }
    msg!("UseKratose governance vote accepted");
    Ok(())
}

#[cfg(test)]
mod tests { use super::*; #[test] fn validates_vote() { let mut vote = [0; 33]; vote[32] = 1; assert!(valid(&vote)); assert!(!valid(&[0; 32])); } }

