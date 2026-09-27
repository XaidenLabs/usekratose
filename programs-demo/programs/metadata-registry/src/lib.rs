use solana_program::{account_info::AccountInfo, entrypoint, entrypoint::ProgramResult, msg, program_error::ProgramError, pubkey::Pubkey};

entrypoint!(process_instruction);

fn valid(data: &[u8]) -> bool {
    let maximum = if cfg!(feature = "v2") { 64 } else { 32 };
    !data.is_empty() && data.len() <= maximum && core::str::from_utf8(data).is_ok()
}

pub fn process_instruction(_: &Pubkey, _: &[AccountInfo], data: &[u8]) -> ProgramResult {
    if !valid(data) { return Err(ProgramError::InvalidInstructionData); }
    msg!("UseKratose metadata accepted");
    Ok(())
}

#[cfg(test)]
mod tests { use super::*; #[test] fn validates_metadata() { assert!(valid(b"usekratose")); assert!(!valid(&[])); assert!(!valid(&[0xff])); } }

