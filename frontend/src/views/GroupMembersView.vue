<template>
  <div class="members-page">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="router.push('/groups')" text>
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2 v-if="group">
          <el-icon :size="22" color="var(--primary)"><Setting /></el-icon>
          {{ group.name }} — 成员权限管理
        </h2>
      </div>
    </div>

    <!-- Group Info Card -->
    <div class="info-card" v-if="group">
      <div class="info-row">
        <span class="info-label">家庭组名称</span>
        <span class="info-value">{{ group.name }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">邀请码</span>
        <code class="info-code">{{ group.inviteCode }}</code>
      </div>
      <div class="info-row">
        <span class="info-label">我的角色</span>
        <span class="role-badge" :class="group.myRole">{{ roleLabel(group.myRole) }}</span>
      </div>
    </div>

    <!-- Members Table -->
    <div class="page-card">
      <el-card shadow="never">
        <template #header>
          <span>成员列表（{{ members.length }}人）</span>
        </template>
        <el-table :data="members" stripe style="width: 100%">
          <el-table-column prop="username" label="用户名" min-width="120" />
          <el-table-column prop="displayName" label="昵称" min-width="120" />
          <el-table-column label="角色" width="120">
            <template #default="{ row }">
              <span class="role-badge" :class="row.role">{{ roleLabel(row.role) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="权限管理权" width="130">
            <template #default="{ row }">
              <el-tag v-if="row.role === 'creator'" type="warning" size="small">拥有</el-tag>
              <el-tag v-else-if="row.role === 'admin' && row.canManagePermissions" type="success" size="small">拥有</el-tag>
              <span v-else class="text-muted">无</span>
            </template>
          </el-table-column>
          <el-table-column label="加入时间" min-width="160">
            <template #default="{ row }">{{ row.joinedAt }}</template>
          </el-table-column>
          <el-table-column label="操作" width="280" fixed="right" v-if="isCreator || groupStore.canManagePermissions">
            <template #default="{ row }">
              <template v-if="row.username === userStore.user?.username">
                <el-tag type="info" size="small">我自己</el-tag>
              </template>
              <template v-else-if="row.role === 'creator'">
                <el-tag type="warning" size="small">创建者</el-tag>
              </template>
              <template v-else>
                <div class="action-group">
                  <!-- Role selector -->
                  <el-select
                    :model-value="row.role"
                    @update:model-value="(v: string) => onChangeRole(row, v)"
                    size="small"
                    style="width: 100px"
                  >
                    <el-option label="管理员" value="admin" />
                    <el-option label="成员" value="member" />
                  </el-select>

                  <!-- Permission management toggle (for admins) -->
                  <el-tooltip
                    v-if="row.role === 'admin'"
                    content="允许该管理员修改他人权限"
                    placement="top"
                  >
                    <el-switch
                      :model-value="!!row.canManagePermissions"
                      @update:model-value="(v: boolean) => onChangeManage(row, v)"
                      size="small"
                      active-text="权限管理"
                    />
                  </el-tooltip>

                  <!-- Remove member -->
                  <el-popconfirm
                    title="确定移除该成员？"
                    @confirm="onRemove(row)"
                  >
                    <template #reference>
                      <el-button type="danger" size="small" :icon="Delete" circle />
                    </template>
                  </el-popconfirm>
                </div>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- Permission info -->
    <div class="permission-info">
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          <strong>权限说明</strong>
        </template>
        <ul class="perm-list">
          <li><span class="role-badge creator">创建者</span> 拥有全部权限：增删改查 + 修改成员角色 + 管理权限</li>
          <li><span class="role-badge admin">管理员</span> 拥有增删改查权限（不含修改他人权限，除非被创建者授予）</li>
          <li><span class="role-badge member">成员</span> 仅拥有查看和搜索权限</li>
          <li>所有成员均不能修改自己的权限</li>
        </ul>
      </el-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Delete } from '@element-plus/icons-vue';
import { groupApi } from '@/api';
import { useUserStore } from '@/stores/user';
import { useGroupStore } from '@/stores/group';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const groupStore = useGroupStore();

const groupId = computed(() => Number(route.params.id));
const members = ref<any[]>([]);
const group = ref<any>(null);

const isCreator = computed(() => group.value?.myRole === 'creator');

function roleLabel(role: string) {
  const map: Record<string, string> = { creator: '创建者', admin: '管理员', member: '成员' };
  return map[role] || role;
}

async function fetchData() {
  if (!groupId.value) return;
  try {
    const [grp, mems] = await Promise.all([
      groupApi.get(groupId.value) as Promise<any>,
      groupApi.listMembers(groupId.value) as Promise<any[]>,
    ]);
    group.value = grp;
    members.value = mems;
  } catch {
    router.push('/groups');
  }
}

async function onChangeRole(member: any, newRole: string) {
  try {
    await groupApi.updateMember(groupId.value, member.id, { role: newRole });
    ElMessage.success(`已将 ${member.username} 的角色更改为${roleLabel(newRole)}`);
    await fetchData();
  } catch {
    // handled by interceptor
  }
}

async function onChangeManage(member: any, value: boolean) {
  try {
    await groupApi.updateMember(groupId.value, member.id, { canManagePermissions: value });
    ElMessage.success(value ? `已授予 ${member.username} 权限管理权` : `已撤销 ${member.username} 的权限管理权`);
    await fetchData();
  } catch {
    // handled by interceptor
  }
}

async function onRemove(member: any) {
  try {
    await groupApi.removeMember(groupId.value, member.id);
    ElMessage.success('已移除成员');
    await fetchData();
  } catch {
    // handled by interceptor
  }
}

onMounted(() => {
  fetchData();
});

watch(groupId, () => {
  fetchData();
});
</script>

<style scoped>
.members-page {
  max-width: 960px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
}

.info-card {
  background: #fff;
  border-radius: var(--radius-md);
  padding: 20px 24px;
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.info-value {
  font-weight: 600;
  color: var(--text-primary);
}

.info-code {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: 1px;
  background: var(--bg-header);
  padding: 2px 10px;
  border-radius: 4px;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.text-muted {
  color: var(--text-muted);
  font-size: 13px;
}

.permission-info {
  margin-top: 24px;
}

.perm-list {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.perm-list li {
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
