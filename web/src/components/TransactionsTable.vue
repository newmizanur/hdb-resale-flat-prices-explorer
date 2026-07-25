<script setup>
defineProps({
    transactions: {
        type: Array,
        default: () => []
    },
    totalRecords: {
        type: Number,
        default: 0
    },
    loading: {
        type: Boolean,
        default: false
    },
    page: {
        type: Number,
        default: 1
    },
    limit: {
        type: Number,
        default: 20
    }
});

const emit = defineEmits(['page-change', 'sort-change']);

function onPage(event) {
    emit('page-change', { page: event.page + 1, limit: event.rows });
}

function onSort(event) {
    emit('sort-change', { sortField: event.sortField, sortOrder: event.sortOrder });
}

function formatCurrency(value) {
    return Number(value).toLocaleString('en-SG', { style: 'currency', currency: 'SGD' });
}
</script>

<template>
    <div class="card">
        <DataTable
            :value="transactions"
            :lazy="true"
            :paginator="true"
            :rows="limit"
            :totalRecords="totalRecords"
            :loading="loading"
            :first="(page - 1) * limit"
            :rowsPerPageOptions="[10, 20, 50]"
            dataKey="id"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} transactions"
            @page="onPage"
            @sort="onSort"
            data-testid="transactions-table"
        >
            <template #header>
                <h4 class="m-0">Resale Transactions</h4>
            </template>

            <Column field="month" header="Month" sortable style="min-width: 8rem" />
            <Column field="town" header="Town" sortable style="min-width: 10rem" />
            <Column field="flatType" header="Flat Type" sortable style="min-width: 8rem" />
            <Column field="block" header="Block" style="min-width: 6rem" />
            <Column field="streetName" header="Street Name" style="min-width: 14rem" />
            <Column field="storeyRange" header="Storey Range" style="min-width: 8rem" />
            <Column field="floorAreaSqm" header="Floor Area (sqm)" sortable style="min-width: 8rem" />
            <Column field="remainingLeaseRaw" header="Remaining Lease" style="min-width: 10rem" />
            <Column field="resalePrice" header="Resale Price" sortable style="min-width: 10rem">
                <template #body="{ data }">{{ formatCurrency(data.resalePrice) }}</template>
            </Column>
        </DataTable>
    </div>
</template>
