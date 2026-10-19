// Existing four-digit codes use their last two digits, including leading zeros.
export function getScannerCode(value) {
  const code = String(value ?? "");
  return /^(?:[0-9]{2}|[0-9]{4})$/.test(code) ? code.slice(-2) : null;
}

export function matchesScannerCode(storedCode, input) {
  return /^[0-9]{2}$/.test(input) && getScannerCode(storedCode) === input;
}
