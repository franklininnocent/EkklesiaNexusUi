/** Sacrament type codes that map to Reconciliation (no parish certificate). */
export function isReconciliationSacramentCode(code: string | null | undefined): boolean {
  const normalized = (code ?? '').trim().toUpperCase();
  return normalized === 'RECONCILIATION' || normalized === 'CONFESSION' || normalized === 'PENANCE';
}

export function sacramentSupportsCertificate(typeCode: string | null | undefined): boolean {
  return !isReconciliationSacramentCode(typeCode);
}
