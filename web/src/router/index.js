import AppLayout from '@/layout/AppLayout.vue';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: AppLayout,
            children: [
                {
                    path: '',
                    name: 'transactions',
                    component: () => import('@/views/TransactionsView.vue')
                },
                {
                    path: '/insights',
                    name: 'insights',
                    component: () => import('@/views/InsightsView.vue')
                }
            ]
        },
        {
            path: '/:pathMatch(.*)*',
            name: 'notfound',
            component: () => import('@/views/pages/NotFound.vue')
        }
    ]
});

export default router;
