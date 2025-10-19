export function truncate(str: string, max = 80) {
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1)}…`;
}

export function numberFormat(n: number) {
  return new Intl.NumberFormat().format(n);
}
