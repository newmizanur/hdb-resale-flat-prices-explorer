import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import TransactionFilters from '../TransactionFilters.vue';

function mountFilters() {
  return mount(TransactionFilters, {
    props: { metadata: null },
    global: { plugins: [PrimeVue] },
  });
}

describe('TransactionFilters', () => {
  it('emits "apply" with all-undefined filters when Apply is clicked with no input', async () => {
    const wrapper = mountFilters();
    await wrapper.find('[data-testid="apply-filters-btn"]').trigger('click');

    expect(wrapper.emitted('apply')).toBeTruthy();
    expect(wrapper.emitted('apply')![0][0]).toEqual({
      town: undefined,
      flatType: undefined,
      storeyRange: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minLeaseMonths: undefined,
      search: undefined,
    });
  });

  it('includes free-text search in the emitted filters', async () => {
    const wrapper = mountFilters();
    await wrapper.find('[data-testid="filter-search"]').setValue('Bedok');
    await wrapper.find('[data-testid="apply-filters-btn"]').trigger('click');

    const emitted = wrapper.emitted('apply')![0][0] as any;
    expect(emitted.search).toBe('Bedok');
  });

  it('emits all-undefined filters on Reset, even after typing a search term', async () => {
    const wrapper = mountFilters();
    await wrapper.find('[data-testid="filter-search"]').setValue('Bedok');
    await wrapper.find('[data-testid="reset-filters-btn"]').trigger('click');

    const emitted = wrapper.emitted('apply')![0][0] as any;
    expect(emitted.search).toBeUndefined();
  });
});
