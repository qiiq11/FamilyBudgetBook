<template>
  <div class="groups-page">
    <div class="page-header">
      <h2>
        <el-icon :size="24" color="var(--primary)"><HomeFilled /></el-icon>
        我的家庭组
      </h2>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon> 创建家庭组
        </el-button>
        <el-button @click="showJoinDialog = true">
          <el-icon><Connection /></el-icon> 加入家庭组
        </el-button>
      </div>
    </div>

    <!-- Groups Grid -->
    <div v-if="groupStore.loading" class="loading-area">
      <el-skeleton :rows="3" animated />
    </div>

    <div v-else-if="groupStore.groups.length === 0" class="empty-groups">
      <el-empty description="你还没有加入任何家庭组">
        <el-button type="primary" @click="showCreateDialog = true">创建第一个家庭组</el-button>
        <el-button @click="showJoinDialog = true">加入已有家庭组</el-button>
      </el-empty>
    </div>

    <div v-else class="groups-grid">
      <div
        v-for="g in groupStore.groups"
        :key="g.id"
        class="group-card"
        :class="{ active: g.id === groupStore.currentGroupId }"
      >
        <div class="group-card-top" @click="onSelectGroup(g)">
          <div class="group-icon">
            <el-icon :size="28"><HomeFilled /></el-icon>
          </div>
          <div class="group-info">
            <h3>{{ g.name }}</h3>
            <div class="group-meta">
              <span class="role-badge" :class="g.role">{{ roleLabel(g.role) }}</span>
            </div>
          </div>
        </div>

        <!-- Invite code + copy -->
        <div class="group-card-row">
          <span class="field-label">邀请码</span>
          <code class="field-code">{{ g.inviteCode }}</code>
          <el-button size="small" text @click.stop="copyText(g.inviteCode, '邀请码')">
            <el-icon><CopyDocument /></el-icon>
          </el-button>
        </div>

        <!-- Password (show when available) -->
        <div class="group-card-row">
          <span class="field-label">密码</span>
          <code class="field-code">{{ groupPasswords[g.id] || '（仅创建/加入时可查看）' }}</code>
          <el-button v-if="groupPasswords[g.id]" size="small" text @click.stop="copyText(groupPasswords[g.id], '密码')">
            <el-icon><CopyDocument /></el-icon>
          </el-button>
        </div>

        <div class="group-card-actions">
          <el-button
            v-if="g.id === groupStore.currentGroupId"
            type="primary"
            plain
            size="small"
            disabled
          >当前使用中</el-button>
          <el-button
            v-else
            type="primary"
            size="small"
            @click.stop="onSelectGroup(g)"
          >切换到此组</el-button>
          <el-button
            v-if="g.role === 'creator'"
            size="small"
            @click.stop="onManageMembers(g)"
          >
            <el-icon><Setting /></el-icon> 成员权限
          </el-button>
          <el-popconfirm
            v-if="g.role === 'creator'"
            title="删除后所有数据将被清除，确定删除？"
            confirm-button-text="确定删除"
            cancel-button-text="取消"
            @confirm="onDeleteGroup(g)"
          >
            <template #reference>
              <el-button type="danger" size="small" @click.stop>
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-popconfirm>
        </div>
      </div>
    </div>

    <!-- Create Group Dialog -->
    <el-dialog v-model="showCreateDialog" title="创建家庭组" width="420px" center>
      <el-form :model="createForm" label-position="top">
        <el-form-item label="家庭组名称">
          <el-input v-model="createForm.name" placeholder="例如：我的温馨小家" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="加入密码（至少4位）">
          <el-input v-model="createForm.password" type="password" placeholder="设置加入密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="onCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- Join Group Dialog -->
    <el-dialog v-model="showJoinDialog" title="加入家庭组" width="420px" center>
      <el-form :model="joinForm" label-position="top">
        <el-form-item label="邀请码">
          <el-input v-model="joinForm.inviteCode" placeholder="输入邀请码" maxlength="10" />
        </el-form-item>
        <el-form-item label="加入密码">
          <el-input v-model="joinForm.password" type="password" placeholder="输入密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showJoinDialog = false">取消</el-button>
        <el-button type="primary" :loading="joining" @click="onJoin">加入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { groupApi } from '@/api';
import { useGroupStore } from '@/stores/group';

const router = useRouter();
const groupStore = useGroupStore();

const showCreateDialog = ref(false);
const showJoinDialog = ref(false);
const creating = ref(false);
const joining = ref(false);

const createForm = reactive({ name: '', password: '' });
const joinForm = reactive({ inviteCode: '', password: '' });
// Store passwords by group ID for display (persisted to localStorage)
const PASSWORD_STORAGE_KEY = 'groupPasswords';

function loadPasswords(): Record<number, string> {
  try {
    const stored = localStorage.getItem(PASSWORD_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function savePasswords(passwords: Record<number, string>) {
  localStorage.setItem(PASSWORD_STORAGE_KEY, JSON.stringify(passwords));
}

const groupPasswords = ref<Record<number, string>>(loadPasswords());

function roleLabel(role: string) {
  const map: Record<string, string> = { creator: '创建者', admin: '管理员', member: '成员' };
  return map[role] || role;
}

function onSelectGroup(g: { id: number }) {
  groupStore.selectGroup(g.id);
  router.push('/dashboard');
}

function onManageMembers(g: { id: number }) {
  router.push(`/groups/${g.id}/members`);
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(`${label}已复制到剪贴板`);
  } catch {
    ElMessage.warning('复制失败，请手动复制');
  }
}

async function onCreate() {
  if (!createForm.name.trim()) {
    ElMessage.warning('请输入家庭组名称');
    return;
  }
  if (!createForm.password || createForm.password.length < 4) {
    ElMessage.warning('密码至少4位');
    return;
  }
  creating.value = true;
  try {
    await groupApi.create({ name: createForm.name.trim(), password: createForm.password });
    ElMessage.success('家庭组创建成功');
    // Remember the password for display
    const pw = createForm.password;
    showCreateDialog.value = false;
    createForm.name = '';
    createForm.password = '';
    await groupStore.fetchGroups();
    // Associate password with newly created group
    const newGroup = groupStore.groups.find(g => !groupPasswords.value[g.id]);
    if (newGroup) { groupPasswords.value[newGroup.id] = pw; savePasswords(groupPasswords.value); }
  } finally {
    creating.value = false;
  }
}

async function onJoin() {
  if (!joinForm.inviteCode.trim()) {
    ElMessage.warning('请输入邀请码');
    return;
  }
  if (!joinForm.password) {
    ElMessage.warning('请输入密码');
    return;
  }
  joining.value = true;
  try {
    const result = await groupApi.join({ inviteCode: joinForm.inviteCode.trim(), password: joinForm.password }) as any;
    ElMessage.success('加入成功');
    const pw = joinForm.password;
    showJoinDialog.value = false;
    joinForm.inviteCode = '';
    joinForm.password = '';
    await groupStore.fetchGroups();
    // Remember the password
    groupPasswords.value[result.id] = pw;
    savePasswords(groupPasswords.value);
  } finally {
    joining.value = false;
  }
}

async function onDeleteGroup(g: { id: number }) {
  try {
    await groupApi.remove(g.id);
    ElMessage.success('已删除');
    delete groupPasswords.value[g.id];
    savePasswords(groupPasswords.value);
    await groupStore.fetchGroups();
    if (groupStore.currentGroupId === g.id) {
      if (groupStore.groups.length > 0) {
        groupStore.selectGroup(groupStore.groups[0].id);
      }
      router.push('/groups');
    }
  } catch {
    // Error handled by interceptor
  }
}

onMounted(async () => {
  await groupStore.fetchGroups();
  // For groups already created (e.g. seed data), we can't retrieve the password
});
</script>

<style scoped>
.groups-page {
  max-width: 960px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.page-header h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 10px;
}

.loading-area {
  padding: 40px;
}

.empty-groups {
  padding: 60px 20px;
}

.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.group-card {
  background: #fff;
  border-radius: var(--radius-md);
  padding: 24px;
  border: 2px solid var(--border-color);
  transition: all 0.25s;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.group-card:hover {
  border-color: var(--primary-light);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.group-card.active {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(230, 126, 34, 0.12);
}

.group-card-top {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  cursor: pointer;
}

.group-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-sm);
  background: var(--bg-header);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  flex-shrink: 0;
}

.group-info h3 {
  font-size: 17px;
  margin-bottom: 6px;
  color: var(--text-primary);
}

.group-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-card-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--bg-page);
  border-radius: var(--radius-sm);
}

.field-label {
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
  min-width: 40px;
}

.field-code {
  font-size: 15px;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: 1px;
  background: transparent;
  flex: 1;
}

.group-card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
