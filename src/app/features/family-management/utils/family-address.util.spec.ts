import {
  formatAddressPart,
  joinAddressParts,
  sanitizeStoredAddressDisplay
} from './family-address.util';

describe('family-address.util', () => {
  it('resolves country relation objects to name', () => {
    expect(formatAddressPart({ id: 1, name: 'India' })).toBe('India');
  });

  it('joins tenant address parts without object Object', () => {
    const composed = joinAddressParts(
      'Kadayal',
      'Kanyakumari',
      'Tamil Nadu',
      { id: 1, name: 'India' },
      '629101'
    );
    expect(composed).toBe('Kadayal, Kanyakumari, Tamil Nadu, India, 629101');
    expect(composed).not.toContain('[object Object]');
  });

  it('sanitizes legacy stored addresses', () => {
    expect(
      sanitizeStoredAddressDisplay('Kadayal, Kanyakumari, Tamil Nadu, [object Object], 629101')
    ).toBe('Kadayal, Kanyakumari, Tamil Nadu, 629101');
  });
});
