/** Digits only from a CNPJ string. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Format as 00.000.000/0000-00 while typing or for display. */
export function formatCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  const parts = [
    d.slice(0, 2),
    d.slice(2, 5),
    d.slice(5, 8),
    d.slice(8, 12),
    d.slice(12, 14),
  ];
  if (d.length <= 2) return parts[0];
  if (d.length <= 5) return `${parts[0]}.${parts[1]}`;
  if (d.length <= 8) return `${parts[0]}.${parts[1]}.${parts[2]}`;
  if (d.length <= 12)
    return `${parts[0]}.${parts[1]}.${parts[2]}/${parts[3]}`;
  return `${parts[0]}.${parts[1]}.${parts[2]}/${parts[3]}-${parts[4]}`;
}

function calcCheckDigit(base: string, weights: number[]): number {
  const sum = base
    .split("")
    .reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0);
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

/** Validates length + check digits (módulo 11). */
export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcCheckDigit(cnpj.slice(0, 12), w1);
  const d2 = calcCheckDigit(cnpj.slice(0, 12) + String(d1), w2);
  return cnpj.endsWith(`${d1}${d2}`);
}
