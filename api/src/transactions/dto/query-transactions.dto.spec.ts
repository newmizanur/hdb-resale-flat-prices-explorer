import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { QueryTransactionsDto } from './query-transactions.dto';

async function validateQuery(input: Record<string, unknown>): Promise<ValidationError[]> {
  const dto = plainToInstance(QueryTransactionsDto, input);
  return validate(dto);
}

function messagesFor(errors: ValidationError[], property: string): string[] {
  const error = errors.find((e) => e.property === property);
  return error ? Object.values(error.constraints ?? {}) : [];
}

describe('QueryTransactionsDto validation', () => {
  it('accepts a fully valid query with no errors', async () => {
    const errors = await validateQuery({
      town: 'BEDOK',
      flatType: '4 ROOM',
      storeyRange: '04 TO 06',
      minPrice: '300000',
      maxPrice: '500000',
      minLeaseMonths: '300',
      search: 'Ang Mo',
      sort: 'resalePrice:desc',
      page: '2',
      limit: '50',
    });

    expect(errors).toHaveLength(0);
  });

  it('applies defaults when sort/page/limit are omitted', async () => {
    const dto = plainToInstance(QueryTransactionsDto, {});
    expect(dto.sort).toBe('month:desc');
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a non-string town with a clear message', async () => {
    const errors = await validateQuery({ town: { nested: true } });
    expect(messagesFor(errors, 'town')).toContain('town must be a string');
  });

  it('rejects a non-string flatType with a clear message', async () => {
    const errors = await validateQuery({ flatType: { nested: true } });
    expect(messagesFor(errors, 'flatType')).toContain('flatType must be a string');
  });

  it('rejects a non-string storeyRange with a clear message', async () => {
    const errors = await validateQuery({ storeyRange: { nested: true } });
    expect(messagesFor(errors, 'storeyRange')).toContain('storeyRange must be a string');
  });

  it('rejects a non-numeric minPrice', async () => {
    const errors = await validateQuery({ minPrice: 'not-a-number' });
    expect(messagesFor(errors, 'minPrice')).toContain('minPrice must be a number');
  });

  it('rejects a negative minPrice', async () => {
    const errors = await validateQuery({ minPrice: '-5' });
    expect(messagesFor(errors, 'minPrice')).toContain('minPrice must not be negative');
  });

  it('rejects a non-numeric maxPrice', async () => {
    const errors = await validateQuery({ maxPrice: 'not-a-number' });
    expect(messagesFor(errors, 'maxPrice')).toContain('maxPrice must be a number');
  });

  it('rejects a negative maxPrice', async () => {
    const errors = await validateQuery({ maxPrice: '-1' });
    expect(messagesFor(errors, 'maxPrice')).toContain('maxPrice must not be negative');
  });

  it('rejects a non-integer minLeaseMonths', async () => {
    const errors = await validateQuery({ minLeaseMonths: '12.5' });
    expect(messagesFor(errors, 'minLeaseMonths')).toContain('minLeaseMonths must be an integer');
  });

  it('rejects a negative minLeaseMonths', async () => {
    const errors = await validateQuery({ minLeaseMonths: '-1' });
    expect(messagesFor(errors, 'minLeaseMonths')).toContain('minLeaseMonths must not be negative');
  });

  it('rejects a non-string search', async () => {
    const errors = await validateQuery({ search: { nested: true } });
    expect(messagesFor(errors, 'search')).toContain('search must be a string');
  });

  it('rejects an unknown sort value with the full list of valid options', async () => {
    const errors = await validateQuery({ sort: 'badfield:asc' });
    const messages = messagesFor(errors, 'sort');
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('sort must be one of:');
    expect(messages[0]).toContain('month:asc');
    expect(messages[0]).toContain('resalePrice:desc');
  });

  it('rejects a sort value with an invalid direction', async () => {
    const errors = await validateQuery({ sort: 'month:sideways' });
    expect(messagesFor(errors, 'sort')[0]).toContain('sort must be one of:');
  });

  it('rejects page below 1', async () => {
    const errors = await validateQuery({ page: '0' });
    expect(messagesFor(errors, 'page')).toContain('page must be at least 1');
  });

  it('rejects a non-integer page', async () => {
    const errors = await validateQuery({ page: '1.5' });
    expect(messagesFor(errors, 'page')).toContain('page must be an integer');
  });

  it('rejects limit below 1', async () => {
    const errors = await validateQuery({ limit: '0' });
    expect(messagesFor(errors, 'limit')).toContain('limit must be at least 1');
  });

  it('rejects limit above 100', async () => {
    const errors = await validateQuery({ limit: '101' });
    expect(messagesFor(errors, 'limit')).toContain('limit must not exceed 100');
  });

  it('rejects a non-integer limit', async () => {
    const errors = await validateQuery({ limit: '20.5' });
    expect(messagesFor(errors, 'limit')).toContain('limit must be an integer');
  });
});
