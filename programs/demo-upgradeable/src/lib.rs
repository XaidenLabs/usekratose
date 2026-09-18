use solana_program::{
    account_info::AccountInfo,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    _accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    #[cfg(not(feature = "v2"))]
    {
        if !instruction_data.is_empty() {
            return Err(ProgramError::InvalidInstructionData);
        }
        msg!("UseKratose deterministic upgrade demo v1");
    }

    #[cfg(feature = "v2")]
    {
        match instruction_data {
            [] => msg!("UseKratose deterministic upgrade demo v2"),
            [1] => msg!("UseKratose v2 security configuration instruction"),
            _ => return Err(ProgramError::InvalidInstructionData),
        }
    }

    Ok(())
}
