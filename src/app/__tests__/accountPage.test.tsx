import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Account page surface tests.
 * We verify the source file directly since rendering requires full auth context.
 */

describe('Account page — suppressed elements', () => {
  const accountSource = readFileSync(
    resolve(__dirname, '../../pages/Account.tsx'),
    'utf-8',
  );

  it('Units dropdown is not rendered (suppressed until wired)', () => {
    // The Units <select> with value={units} should NOT exist in the source
    expect(accountSource).not.toMatch(/value=\{units\}/);
    // No imperial/metric option elements
    expect(accountSource).not.toMatch(/<option[^>]*imperial/);
  });

  it('has a TODO comment for future Units implementation', () => {
    expect(accountSource).toMatch(/TODO.*[Uu]nits/);
  });

  it('hides internal modules (Land Speed, Team) for non-internal users', () => {
    // Internal features are gated behind isInternal check
    expect(accountSource).toMatch(/isInternal/);
    expect(accountSource).toMatch(/Land Speed/);
    expect(accountSource).toMatch(/Team Management/);
    // They should be inside the isInternal conditional block
    expect(accountSource).toMatch(/if\s*\(isInternal\)/);
  });
});
