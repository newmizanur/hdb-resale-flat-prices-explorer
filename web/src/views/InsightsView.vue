<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { api } from '@/services/api';

const toast = useToast();
const metadata = ref(null);
const avgPriceByTownData = ref(null);
const priceTrendData = ref(null);
const priceVsLeaseData = ref(null);

const trendFilters = reactive({ town: undefined, flatType: undefined });

function notifyLoadError(detail) {
    toast.add({ severity: 'error', summary: 'Failed to load insights', detail, life: 5000 });
}

async function loadAvgPriceByTown() {
    const rows = await api.getAvgPriceByTown();
    avgPriceByTownData.value = {
        labels: rows.map((r) => r.town),
        datasets: [{ label: 'Avg Resale Price (SGD)', data: rows.map((r) => r.avgPrice), backgroundColor: '#42A5F5' }]
    };
}

async function loadPriceTrend() {
    const rows = await api.getPriceTrend(trendFilters);
    priceTrendData.value = {
        labels: rows.map((r) => r.month),
        datasets: [{ label: 'Avg Resale Price (SGD)', data: rows.map((r) => r.avgPrice), borderColor: '#66BB6A', fill: false }]
    };
}

async function loadPriceVsLease() {
    const rows = await api.getPriceVsLease();
    priceVsLeaseData.value = {
        labels: rows.map((r) => `${r.leaseBand} yrs`),
        datasets: [{ label: 'Avg Resale Price (SGD)', data: rows.map((r) => r.avgPrice), backgroundColor: '#FFA726' }]
    };
}

watch(trendFilters, () => {
    loadPriceTrend().catch((error) => notifyLoadError(error.message));
}, { deep: true });

onMounted(async () => {
    try {
        metadata.value = await api.getMetadata();
        await Promise.all([loadAvgPriceByTown(), loadPriceTrend(), loadPriceVsLease()]);
    } catch (error) {
        notifyLoadError(error.message);
    }
});
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="card" data-testid="avg-price-by-town-section">
            <h4 class="mt-0">Average Price by Town</h4>
            <Chart v-if="avgPriceByTownData" type="bar" :data="avgPriceByTownData" />
        </div>

        <div class="card" data-testid="price-trend-section">
            <h4 class="mt-0">Price Trend Over Time</h4>
            <div class="flex flex-wrap gap-4 mb-4">
                <Select v-model="trendFilters.town" :options="metadata?.towns ?? []" placeholder="All towns" showClear />
                <Select v-model="trendFilters.flatType" :options="metadata?.flatTypes ?? []" placeholder="All types" showClear />
            </div>
            <Chart v-if="priceTrendData" type="line" :data="priceTrendData" />
        </div>

        <div class="card" data-testid="price-vs-lease-section">
            <h4 class="mt-0">Price vs Remaining Lease</h4>
            <Chart v-if="priceVsLeaseData" type="bar" :data="priceVsLeaseData" />
        </div>
    </div>
</template>
