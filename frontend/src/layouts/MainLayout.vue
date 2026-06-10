<template>
  <div class="app-layout">
    <!-- Top Navigation Bar -->
    <header class="top-nav">
      <div class="nav-left">
        <div class="logo">
          <el-icon :size="28" color="#e67e22"><House /></el-icon>
          <span class="logo-text">家庭记账本</span>
        </div>
        <nav class="nav-links">
          <router-link to="/dashboard" class="nav-item" :class="{ active: route.path === '/dashboard' }">
            <el-icon><Odometer /></el-icon>
            <span>首页概览</span>
          </router-link>
          <router-link to="/transactions" class="nav-item" :class="{ active: route.path === '/transactions' }">
            <el-icon><List /></el-icon>
            <span>收支管理</span>
          </router-link>
          <router-link to="/categories" class="nav-item" :class="{ active: route.path === '/categories' }">
            <el-icon><Collection /></el-icon>
            <span>分类管理</span>
          </router-link>
          <router-link to="/members" class="nav-item" :class="{ active: route.path === '/members' }">
            <el-icon><User /></el-icon>
            <span>家庭成员</span>
          </router-link>
          <router-link to="/statistics" class="nav-item" :class="{ active: route.path === '/statistics' }">
            <el-icon><DataAnalysis /></el-icon>
            <span>汇总统计</span>
          </router-link>
        </nav>
      </div>
      <div class="nav-right">
        <!-- Group Selector -->
        <div class="group-selector" v-if="groupStore.groups.length > 0">
          <el-icon color="#e67e22"><HomeFilled /></el-icon>
          <el-select
            :model-value="groupStore.currentGroupId"
            @update:model-value="onGroupChange"
            placeholder="选择家庭组"
            size="small"
            class="group-select"
          >
            <el-option
              v-for="g in groupStore.groups"
              :key="g.id"
              :label="g.name"
              :value="g.id"
            >
              <span>{{ g.name }}</span>
              <el-tag size="small" :type="roleTagType(g.role)" class="ml-2">{{ roleLabel(g.role) }}</el-tag>
            </el-option>
          </el-select>
        </div>
        <router-link to="/groups" class="nav-item">
          <el-icon><Setting /></el-icon>
          <span>我的家庭组</span>
        </router-link>
        <router-link v-if="groupStore.canWrite" to="/transactions/pending" class="nav-item">
          <el-icon><Checked /></el-icon>
          <span>审批管理</span>
          <el-badge v-if="pendingCount > 0" :value="pendingCount" class="nav-badge" />
        </router-link>
        <!-- User Dropdown -->
        <el-dropdown trigger="click" @command="onUserCommand">
          <span class="user-avatar">
            <el-avatar :size="34" icon="UserFilled" />
            <span class="user-name">{{ userStore.user?.displayName || userStore.user?.username }}</span>
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>
                <span class="dropdown-user">{{ userStore.user?.username }}</span>
                <el-tag size="small" v-if="groupStore.currentGroup" :type="roleTagType(groupStore.currentGroup.role)">
                  {{ roleLabel(groupStore.currentGroup.role) }}
                </el-tag>
              </el-dropdown-item>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- Breadcrumb -->
    <div class="breadcrumb-bar" v-if="breadcrumbs.length > 0">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item v-for="(b, i) in breadcrumbs" :key="i" :to="b.to">
          {{ b.label }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- Main Content -->
    <main class="main-content">
      <div v-if="!groupStore.currentGroupId && route.path !== '/groups'" class="no-group-hint">
        <el-result icon="info" title="请先选择或创建一个家庭组" sub-title="前往「我的家庭组」页面创建或加入一个家庭组">
          <template #extra>
            <el-button type="primary" @click="router.push('/groups')">前往我的家庭组</el-button>
          </template>
        </el-result>
      </div>
      <router-view v-else />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useGroupStore } from '@/stores/group';
import { transactionApi } from '@/api';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const groupStore = useGroupStore();

const pendingCount = ref(0);

const titles: Record<string, string> = {
  '/dashboard': '首页概览',
  '/transactions': '收支管理',
  '/categories': '分类管理',
  '/members': '家庭成员',
  '/statistics': '汇总统计',
  '/groups': '我的家庭组',
};

const breadcrumbs = computed(() => {
  const crumbs: { label: string; to?: string }[] = [];
  if (groupStore.currentGroup) {
    crumbs.push({ label: groupStore.currentGroup.name, to: '/groups' });
  }
  const label = titles[route.path] || '';
  if (label) crumbs.push({ label });
  return crumbs;
});

function roleLabel(role: string) {
  const map: Record<string, string> = { creator: '创建者', admin: '管理员', member: '成员' };
  return map[role] || role;
}

function roleTagType(role: string) {
  const map: Record<string, string> = { creator: 'warning', admin: 'success', member: 'info' };
  return map[role] || 'info';
}

function onGroupChange(groupId: number) {
  groupStore.selectGroup(groupId);
  router.push('/dashboard');
}

function onUserCommand(cmd: string) {
  if (cmd === 'logout') {
    userStore.logout();
    router.push('/login');
  }
}

onMounted(async () => {
  await groupStore.fetchGroups();
  if (groupStore.currentGroupId && groupStore.canWrite) {
    fetchPendingCount();
  }
});

async function fetchPendingCount() {
  if (!groupStore.currentGroupId || !groupStore.canWrite) return;
  try {
    const list = await transactionApi.pending(groupStore.currentGroupId) as any[];
    pendingCount.value = Array.isArray(list) ? list.length : 0;
  } catch { pendingCount.value = 0; }
}

// Watch route changes to handle groups/:id/members
watch(() => route.params.id, (id) => {
  if (route.path.startsWith('/groups/') && id) {
    groupStore.selectGroup(Number(id));
  }
});

// Refresh pending count when group changes
watch(() => groupStore.currentGroupId, () => {
  fetchPendingCount();
});
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: var(--bg-page);
}

/* ===== Top Nav ===== */
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 58px;
  padding: 0 24px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(230, 126, 34, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 32px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: 1px;
}

.nav-links {
  display: flex;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-item:hover {
  color: var(--primary);
  background: var(--bg-header);
}

.nav-item.active {
  color: var(--primary);
  background: #fef3e2;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 16px;
  border-right: 1px solid var(--border-color);
}

.group-select {
  width: 160px;
}

.user-avatar {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}

.user-avatar:hover {
  background: var(--bg-header);
}

.user-name {
  font-size: 14px;
  color: var(--text-primary);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-user {
  margin-right: 8px;
}

/* ===== Breadcrumb ===== */
.breadcrumb-bar {
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid var(--border-color);
}

/* ===== Main Content ===== */
.main-content {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 58px - 42px);
}

.no-group-hint {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.ml-2 {
  margin-left: 8px;
}

.nav-badge {
  margin-left: 2px;
}

.nav-badge :deep(.el-badge__content) {
  font-size: 10px;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
}
</style>
