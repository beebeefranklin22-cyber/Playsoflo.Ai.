// No deposit-detection infrastructure exists yet (no bank/crypto webhook
// wired to credit a wallet automatically) — this always reports nothing
// pending rather than fabricating a result. Once a real deposit webhook
// exists, this should query whatever table it writes pending deposits to.
export async function checkPendingDeposits() {
  return { data: { processed: 0, message: 'No pending deposits' } };
}
