import { describe, expect, it } from 'vitest';

import { redactSensitiveText, redactSensitiveValue } from '../../src/index';

describe('secret redaction', () => {
  it('redacts token-like values', () => {
    expect(redactSensitiveValue('lc_secret_token_123')).toBe('[REDACTED]');
    expect(redactSensitiveValue('Bearer lc_secret_token_123')).toBe('Bearer [REDACTED]');
    expect(redactSensitiveValue('plain-value')).toBe('plain-value');
  });

  it('redacts bearer tokens and known secret keys from text', () => {
    const text = [
      'Authorization: Bearer lc_secret_token_123',
      'apiToken=lc_secret_token_456',
      'password: super-secret',
      'safe=value',
    ].join('\n');

    const redacted = redactSensitiveText(text);

    expect(redacted).not.toContain('lc_secret_token_123');
    expect(redacted).not.toContain('lc_secret_token_456');
    expect(redacted).not.toContain('super-secret');
    expect(redacted).toContain('Authorization: Bearer [REDACTED]');
    expect(redacted).toContain('apiToken=[REDACTED]');
    expect(redacted).toContain('password: [REDACTED]');
    expect(redacted).toContain('safe=value');
  });

  it('redacts nested JSON diagnostics without mutating response bodies', () => {
    const text = JSON.stringify({
      message: 'failed',
      token: 'lc_secret_token_123',
      nested: { client_secret: 'client-secret-value' },
    });

    const redacted = redactSensitiveText(text);

    expect(redacted).not.toContain('lc_secret_token_123');
    expect(redacted).not.toContain('client-secret-value');
    expect(redacted).toContain('"token":"[REDACTED]"');
    expect(redacted).toContain('"client_secret":"[REDACTED]"');
  });
});
