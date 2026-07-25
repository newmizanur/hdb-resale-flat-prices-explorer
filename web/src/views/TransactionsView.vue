<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import TransactionFilters from '@/components/TransactionFilters.vue';
import TransactionsTable from '@/components/TransactionsTable.vue';
import { api } from '@/services/api';

const toast = useToast();
const metadata = ref(null);
const transactions = ref([]);
const totalRecords = ref(0);
const loading = ref(false);

const query = reactive({ page: 1, limit: 20, sort: 'month:desc' });

async function loadTransactions() {
    loading.value = true;
    try {
        const result = await api.getTransactions(query);
        transactions.value = result.data;
        totalRecords.value = result.meta.total;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Failed to load transactions', detail: error.message, life: 5000 });
    } finally {
        loading.value = false;
    }
}

function onApplyFilters(filters) {
    Object.assign(query, filters, { page: 1 });
    loadTransactions();
}

function onPageChange(payload) {
    query.page = payload.page;
    query.limit = payload.limit;
    loadTransactions();
}

function onSortChange(payload) {
    query.sort = `${payload.sortField}:${payload.sortOrder === 1 ? 'asc' : 'desc'}`;
    query.page = 1;
    loadTransactions();
}

onMounted(async () => {
    try {
        metadata.value = await api.getMetadata();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Failed to load filter options', detail: error.message, life: 5000 });
    }
    await loadTransactions();
});
</script>

<template>
    <div class="flex flex-col gap-4">
        <TransactionFilters :metadata="metadata" @apply="onApplyFilters" />
        <TransactionsTable
            :transactions="transactions"
            :total-records="totalRecords"
            :loading="loading"
            :page="query.page"
            :limit="query.limit"
            @page-change="onPageChange"
            @sort-change="onSortChange"
        />
    </div>
</template>
