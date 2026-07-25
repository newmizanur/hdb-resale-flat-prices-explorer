export function parseRemainingLeaseToMonths(raw: string): number {
  const yearsMatch = raw.match(/(\d+)\s*years?/i);
  const monthsMatch = raw.match(/(\d+)\s*months?/i);
  const years = yearsMatch ? parseInt(yearsMatch[1], 10) : 0;
  const months = monthsMatch ? parseInt(monthsMatch[1], 10) : 0;
  return years * 12 + months;
}

export function parseMonthToDate(month: string): string {
  const [year, mon] = month.split('-');
  return `${year}-${mon.padStart(2, '0')}-01`;
}
