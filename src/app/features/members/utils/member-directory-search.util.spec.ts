import {
  memberDirectorySearchKey,
  memberDirectorySearchParam,
} from './member-directory-search.util';

describe('memberDirectorySearchParam', () => {
  it('returns undefined until at least two non-space characters', () => {
    expect(memberDirectorySearchParam('')).toBeUndefined();
    expect(memberDirectorySearchParam(' ')).toBeUndefined();
    expect(memberDirectorySearchParam('a')).toBeUndefined();
    expect(memberDirectorySearchParam(' a ')).toBeUndefined();
    expect(memberDirectorySearchParam('an')).toBe('an');
    expect(memberDirectorySearchParam('  AN  ')).toBe('AN');
  });
});

describe('memberDirectorySearchKey', () => {
  it('normalizes case for comparison', () => {
    expect(memberDirectorySearchKey('Antony')).toBe('antony');
    expect(memberDirectorySearchKey('ANTONY')).toBe('antony');
    expect(memberDirectorySearchKey('a')).toBe('');
  });
});
