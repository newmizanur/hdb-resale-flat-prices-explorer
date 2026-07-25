<script setup>
import { ref } from 'vue';
import AppMenuItem from './AppMenuItem.vue';

const model = ref([
    {
        label: 'HDB Resale Explorer',
        icon: 'pi pi-fw pi-home',
        items: [
            {
                label: 'Transactions',
                icon: 'pi pi-fw pi-table',
                to: '/'
            },
            {
                label: 'Insights',
                icon: 'pi pi-fw pi-chart-bar',
                to: '/insights'
            }
        ]
    }
]);
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>
