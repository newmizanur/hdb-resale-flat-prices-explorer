import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import TransactionsTable from '../TransactionsTable.vue';

const sampleTransactions = [
  {
    id: '1',
    month: '2023-01-01',
    town: 'BEDOK',
    flatType: '4 ROOM',
    block: '511',
    streetName: 'BEDOK NORTH AVE 3',
    storeyRange: '07 TO 09',
    floorAreaSqm: 92,
    flatModel: 'Model A',
    leaseCommenceDate: 1985,
    remainingLeaseRaw: '60 years 09 months',
    remainingLeaseMonths: 729,
    resalePrice: 458000,
  },
];

function mountTable(overrides: Record<string, unknown> = {}) {
  return mount(TransactionsTable, {
    props: { transactions: sampleTransactions, totalRecords: 1, loading: false, page: 1, limit: 20, ...overrides },
    global: { plugins: [PrimeVue] },
  });
}

describe('TransactionsTable', () => {
  it('renders a row per transaction', () => {
    const wrapper = mountTable();
    expect(wrapper.text()).toContain('BEDOK');
    expect(wrapper.text()).toContain('4 ROOM');
  });

  it('emits page-change with a 1-indexed page number', async () => {
    const wrapper = mountTable();
    await wrapper.findComponent({ name: 'DataTable' }).vm.$emit('page', { page: 2, rows: 20 });
    expect(wrapper.emitted('page-change')![0][0]).toEqual({ page: 3, limit: 20 });
  });

  it('emits sort-change with the sorted field and direction', async () => {
    const wrapper = mountTable();
    await wrapper.findComponent({ name: 'DataTable' }).vm.$emit('sort', { sortField: 'resalePrice', sortOrder: -1 });
    expect(wrapper.emitted('sort-change')![0][0]).toEqual({ sortField: 'resalePrice', sortOrder: -1 });
  });
});
