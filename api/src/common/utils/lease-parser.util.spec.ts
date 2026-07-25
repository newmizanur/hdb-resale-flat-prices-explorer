import { parseMonthToDate, parseRemainingLeaseToMonths } from './lease-parser.util';

describe('parseRemainingLeaseToMonths', () => {
  it('parses "years and months" text', () => {
    expect(parseRemainingLeaseToMonths('61 years 04 months')).toBe(736);
  });

  it('parses "years only" text', () => {
    expect(parseRemainingLeaseToMonths('61 years')).toBe(732);
  });

  it('parses single-digit months without leading zero', () => {
    expect(parseRemainingLeaseToMonths('70 years 1 month')).toBe(841);
  });

  it('parses zero years', () => {
    expect(parseRemainingLeaseToMonths('0 years 11 months')).toBe(11);
  });
});

describe('parseMonthToDate', () => {
  it('converts YYYY-MM to the first of that month as an ISO date string', () => {
    expect(parseMonthToDate('2017-01')).toBe('2017-01-01');
  });

  it('handles December correctly', () => {
    expect(parseMonthToDate('2023-12')).toBe('2023-12-01');
  });
});
