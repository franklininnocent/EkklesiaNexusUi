import {
  isReconciliationSacramentCode,
  sacramentSupportsCertificate,
} from './sacrament-certificate.util';

describe('sacrament-certificate.util', () => {
  it('treats reconciliation aliases as non-certificatable', () => {
    expect(isReconciliationSacramentCode('RECONCILIATION')).toBe(true);
    expect(isReconciliationSacramentCode('confession')).toBe(true);
    expect(isReconciliationSacramentCode('PENANCE')).toBe(true);
    expect(isReconciliationSacramentCode('BAPTISM')).toBe(false);
    expect(sacramentSupportsCertificate('MATRIMONY')).toBe(true);
    expect(sacramentSupportsCertificate('RECONCILIATION')).toBe(false);
  });
});
