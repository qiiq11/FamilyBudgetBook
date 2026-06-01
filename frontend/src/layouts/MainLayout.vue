<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="logo">
        <el-icon :size="28"><Wallet /></el-icon>
        <span>家庭记账本</span>
      </div>
      <el-menu :default-active="route.path" router background-color="#1d2b3a" text-color="#bfcbd9" active-text-color="#409eff">
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <span>首页概览</span>
        </el-menu-item>
        <el-menu-item index="/transactions">
          <el-icon><List /></el-icon>
          <span>收支管理</span>
        </el-menu-item>
        <el-menu-item index="/categories">
          <el-icon><Collection /></el-icon>
          <span>分类管理</span>
        </el-menu-item>
        <el-menu-item index="/members">
          <el-icon><User /></el-icon>
          <span>家庭成员</span>
        </el-menu-item>
        <el-menu-item index="/statistics">
          <el-icon><DataAnalysis /></el-icon>
          <span>汇总统计</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <span class="title">{{ pageTitle }}</span>
        <div class="user-area">
          <span>{{ userStore.user?.displayName || userStore.user?.username }}</span>
          <el-button type="danger" link @click="onLogout">退出</el-button>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const titles: Record<string, string> = {
  '/dashboard': '首页概览',
  '/transactions': '收支管理',
  '/categories': '分类管理',
  '/members': '家庭成员',
  '/statistics': '汇总统计',
};

const pageTitle = computed(() => titles[route.path] || '家庭记账本');

function onLogout() {
  userStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
}
.aside {
  background: #1d2b3a;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 60px;
  padding: 0 20px;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.title {
  font-size: 18px;
  font-weight: 600;
}
.user-area {
  display: flex;
  align-items: center;
  gap: 12px;
}
.main {
  padding: 20px;
}
</style>
