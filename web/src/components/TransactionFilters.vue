<script setup>
import { reactive } from 'vue';

defineProps({
    metadata: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['apply']);

const filters = reactive({
    town: undefined,
    flatType: undefined,
    storeyRange: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minLeaseMonths: undefined,
    search: undefined
});

function applyFilters() {
    emit('apply', { ...filters });
}

function resetFilters() {
    filters.town = undefined;
    filters.flatType = undefined;
    filters.storeyRange = undefined;
    filters.minPrice = undefined;
    filters.maxPrice = undefined;
    filters.minLeaseMonths = undefined;
    filters.search = undefined;
    emit('apply', { ...filters });
}
</script>

<template>
    <div class="card" data-testid="transaction-filters">
        <div class="flex flex-wrap gap-4 items-end">
            <div class="flex flex-col gap-2">
                <label class="font-bold">Town</label>
                <Select v-model="filters.town" :options="metadata?.towns ?? []" placeholder="All towns" showClear data-testid="filter-town" />
            </div>
            <div class="flex flex-col gap-2">
                <label class="font-bold">Flat Type</label>
                <Select v-model="filters.flatType" :options="metadata?.flatTypes ?? []" placeholder="All types" showClear data-testid="filter-flat-type" />
            </div>
            <div class="flex flex-col gap-2">
                <label class="font-bold">Storey Range</label>
                <Select v-model="filters.storeyRange" :options="metadata?.storeyRanges ?? []" placeholder="All storeys" showClear data-testid="filter-storey-range" />
            </div>
            <div class="flex flex-col gap-2">
                <label class="font-bold">Min Price</label>
                <InputNumber v-model="filters.minPrice" mode="currency" currency="SGD" locale="en-SG" placeholder="Min price" data-testid="filter-min-price" />
            </div>
            <div class="flex flex-col gap-2">
                <label class="font-bold">Max Price</label>
                <InputNumber v-model="filters.maxPrice" mode="currency" currency="SGD" locale="en-SG" placeholder="Max price" data-testid="filter-max-price" />
            </div>
            <div class="flex flex-col gap-2">
                <label class="font-bold">Min Remaining Lease (months)</label>
                <InputNumber v-model="filters.minLeaseMonths" placeholder="Min lease (months)" data-testid="filter-min-lease" />
            </div>
            <div class="flex flex-col gap-2">
                <label class="font-bold">Search</label>
                <InputText v-model="filters.search" placeholder="Street / block / town" data-testid="filter-search" />
            </div>
            <div class="flex gap-2">
                <Button label="Apply" icon="pi pi-search" @click="applyFilters" data-testid="apply-filters-btn" />
                <Button label="Reset" icon="pi pi-refresh" severity="secondary" @click="resetFilters" data-testid="reset-filters-btn" />
            </div>
        </div>
    </div>
</template>
