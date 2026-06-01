import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { guest: true } },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { auth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
        { path: 'transactions', name: 'transactions', component: () => import('@/views/TransactionsView.vue') },
        { path: 'categories', name: 'categories', component: () => import('@/views/CategoriesView.vue') },
        { path: 'members', name: 'members', component: () => import('@/views/MembersView.vue') },
        { path: 'statistics', name: 'statistics', component: () => import('@/views/StatisticsView.vue') },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const token = localStorage.getItem('token');
  if (to.meta.auth && !token) return '/login';
  if (to.meta.guest && token) return '/dashboard';
});

export default router;
