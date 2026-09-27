use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{instruction::Instruction, system_program},
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

fn send_instruction(svm: &mut LiteSVM, payer: &Keypair, instruction: Instruction) {
    let message = Message::new_with_blockhash(
        &[instruction],
        Some(&payer.pubkey()),
        &svm.latest_blockhash(),
    );
    let transaction =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[payer]).unwrap();
    svm.send_transaction(transaction).unwrap();
}

#[test]
fn initializes_and_updates_the_vault() {
    let program_id = usekratose_anchor_fixture::id();
    let authority = Keypair::new();
    let vault =
        Pubkey::find_program_address(&[usekratose_anchor_fixture::VAULT_SEED], &program_id).0;
    let mut svm = LiteSVM::new();
    let program = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/usekratose_anchor_fixture.so"
    ));
    svm.add_program(program_id, program).unwrap();
    svm.airdrop(&authority.pubkey(), 1_000_000_000).unwrap();

    send_instruction(
        &mut svm,
        &authority,
        Instruction::new_with_bytes(
            program_id,
            &usekratose_anchor_fixture::instruction::InitializeVault {}.data(),
            usekratose_anchor_fixture::accounts::InitializeVault {
                authority: authority.pubkey(),
                vault,
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        ),
    );
    send_instruction(
        &mut svm,
        &authority,
        Instruction::new_with_bytes(
            program_id,
            &usekratose_anchor_fixture::instruction::Deposit { amount: 50 }.data(),
            usekratose_anchor_fixture::accounts::Deposit {
                depositor: authority.pubkey(),
                vault,
            }
            .to_account_metas(None),
        ),
    );
    send_instruction(
        &mut svm,
        &authority,
        Instruction::new_with_bytes(
            program_id,
            &usekratose_anchor_fixture::instruction::Withdraw { amount: 20 }.data(),
            usekratose_anchor_fixture::accounts::Withdraw {
                authority: authority.pubkey(),
                vault,
            }
            .to_account_metas(None),
        ),
    );

    let vault_account = svm.get_account(&vault).unwrap();
    let mut data: &[u8] = &vault_account.data;
    let state = usekratose_anchor_fixture::Vault::try_deserialize(&mut data).unwrap();
    assert_eq!(state.authority, authority.pubkey());
    assert_eq!(state.total_deposited, 30);
}

#[cfg(feature = "v2")]
#[test]
fn demonstrates_missing_authority_check_in_emergency_withdraw() {
    let program_id = usekratose_anchor_fixture::id();
    let authority = Keypair::new();
    let attacker = Keypair::new();
    let vault =
        Pubkey::find_program_address(&[usekratose_anchor_fixture::VAULT_SEED], &program_id).0;
    let mut svm = LiteSVM::new();
    let program = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/usekratose_anchor_fixture.so"
    ));
    svm.add_program(program_id, program).unwrap();
    svm.airdrop(&authority.pubkey(), 1_000_000_000).unwrap();
    svm.airdrop(&attacker.pubkey(), 1_000_000_000).unwrap();

    send_instruction(
        &mut svm,
        &authority,
        Instruction::new_with_bytes(
            program_id,
            &usekratose_anchor_fixture::instruction::InitializeVault {}.data(),
            usekratose_anchor_fixture::accounts::InitializeVault {
                authority: authority.pubkey(),
                vault,
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        ),
    );
    send_instruction(
        &mut svm,
        &authority,
        Instruction::new_with_bytes(
            program_id,
            &usekratose_anchor_fixture::instruction::Deposit { amount: 50 }.data(),
            usekratose_anchor_fixture::accounts::Deposit {
                depositor: authority.pubkey(),
                vault,
            }
            .to_account_metas(None),
        ),
    );
    send_instruction(
        &mut svm,
        &attacker,
        Instruction::new_with_bytes(
            program_id,
            &usekratose_anchor_fixture::instruction::EmergencyWithdraw { amount: 40 }.data(),
            usekratose_anchor_fixture::accounts::EmergencyWithdrawV2 { vault }
                .to_account_metas(None),
        ),
    );

    let vault_account = svm.get_account(&vault).unwrap();
    let mut data: &[u8] = &vault_account.data;
    let state = usekratose_anchor_fixture::Vault::try_deserialize(&mut data).unwrap();
    assert_eq!(state.authority, authority.pubkey());
    assert_eq!(state.total_deposited, 10);
}

#[cfg(feature = "v3")]
#[test]
fn rejects_unauthorized_emergency_withdraw_and_allows_the_vault_authority() {
    let program_id = usekratose_anchor_fixture::id();
    let authority = Keypair::new();
    let attacker = Keypair::new();
    let vault =
        Pubkey::find_program_address(&[usekratose_anchor_fixture::VAULT_SEED], &program_id).0;
    let mut svm = LiteSVM::new();
    let program = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/usekratose_anchor_fixture.so"
    ));
    svm.add_program(program_id, program).unwrap();
    svm.airdrop(&authority.pubkey(), 1_000_000_000).unwrap();
    svm.airdrop(&attacker.pubkey(), 1_000_000_000).unwrap();

    send_instruction(
        &mut svm,
        &authority,
        Instruction::new_with_bytes(
            program_id,
            &usekratose_anchor_fixture::instruction::InitializeVault {}.data(),
            usekratose_anchor_fixture::accounts::InitializeVault {
                authority: authority.pubkey(),
                vault,
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        ),
    );
    send_instruction(
        &mut svm,
        &authority,
        Instruction::new_with_bytes(
            program_id,
            &usekratose_anchor_fixture::instruction::Deposit { amount: 50 }.data(),
            usekratose_anchor_fixture::accounts::Deposit {
                depositor: authority.pubkey(),
                vault,
            }
            .to_account_metas(None),
        ),
    );

    let unauthorized_instruction = Instruction::new_with_bytes(
        program_id,
        &usekratose_anchor_fixture::instruction::EmergencyWithdraw { amount: 40 }.data(),
        usekratose_anchor_fixture::accounts::EmergencyWithdraw {
            authority: attacker.pubkey(),
            vault,
        }
        .to_account_metas(None),
    );
    let unauthorized_message = Message::new_with_blockhash(
        &[unauthorized_instruction],
        Some(&attacker.pubkey()),
        &svm.latest_blockhash(),
    );
    let unauthorized_transaction = VersionedTransaction::try_new(
        VersionedMessage::Legacy(unauthorized_message),
        &[&attacker],
    )
    .unwrap();
    assert!(svm.send_transaction(unauthorized_transaction).is_err());

    send_instruction(
        &mut svm,
        &authority,
        Instruction::new_with_bytes(
            program_id,
            &usekratose_anchor_fixture::instruction::EmergencyWithdraw { amount: 40 }.data(),
            usekratose_anchor_fixture::accounts::EmergencyWithdraw {
                authority: authority.pubkey(),
                vault,
            }
            .to_account_metas(None),
        ),
    );

    let vault_account = svm.get_account(&vault).unwrap();
    let mut data: &[u8] = &vault_account.data;
    let state = usekratose_anchor_fixture::Vault::try_deserialize(&mut data).unwrap();
    assert_eq!(state.authority, authority.pubkey());
    assert_eq!(state.total_deposited, 10);
}
