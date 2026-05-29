const redacted = '[REDACTED]';

const tokenPatterns = [
  /\blc_(?:secret|live|test)_[A-Za-z0-9._-]+\b/g,
  /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9._-]+\b/g,
];

const bearerTokenPattern = /\b(Bearer\s+)([A-Za-z0-9._~+/-]+=*)\b/gi;

const secretAssignmentPattern = new RegExp(
  String.raw`\b(api[_-]?token|bearer[_-]?token|access[_-]?token|access[_-]?key[_-]?secret|refresh[_-]?token|token|password|secret|client[_-]?secret|api[_-]?key)(\s*[=:]\s*)("?)([^"\s,}]+)("?)`,
  'gi',
);

const jsonSecretPattern = new RegExp(
  String.raw`("(?:api[_-]?token|authorization|bearer[_-]?token|access[_-]?token|access[_-]?key[_-]?secret|refresh[_-]?token|token|password|secret|client[_-]?secret|api[_-]?key)"\s*:\s*")([^"]+)(")`,
  'gi',
);

export function redactSensitiveValue(value: string): string {
  let sanitized = value.replace(bearerTokenPattern, `$1${redacted}`);

  for (const pattern of tokenPatterns) {
    sanitized = sanitized.replace(pattern, redacted);
  }

  return sanitized;
}

export function redactSensitiveText(text: string): string {
  let sanitized = redactSensitiveValue(text);

  sanitized = sanitized.replace(jsonSecretPattern, `$1${redacted}$3`);
  sanitized = sanitized.replace(secretAssignmentPattern, `$1$2$3${redacted}$5`);

  return sanitized;
}
