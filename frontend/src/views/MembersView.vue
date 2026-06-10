<template>
  <el-card class="page-card" shadow="never">
    <template #header>
      <div class="card-header">
        <span>家庭成员管理</span>
        <el-button v-if="groupStore.canWrite" type="primary" @click="openForm()">添加虚拟成员</el-button>
      </div>
    </template>
    <el-table :data="list" stripe>
      <el-table-column prop="name" label="名字">
        <template #default="{ row }">
          <div class="member-name-cell">
            <span>{{ row.name }}</span>
            <el-tag v-if="row.linkedUserId" type="info" size="small" effect="plain">用户</el-tag>
            <el-tag v-else type="warning" size="small" effect="plain">虚拟</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="relation" label="关系" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <span class="text-muted" v-if="row.linkedUserId">真实用户</span>
          <span class="text-muted" v-else>虚拟对象</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" v-if="groupStore.canWrite">
        <template #default="{ row }">
          <!-- Only virtual members can be edited/deleted -->
          <template v-if="!row.linkedUserId">
            <el-button link type="primary" @click="openForm(row)">编辑</el-button>
            <el-button link type="danger" @click="onDelete(row.id)">删除</el-button>
          </template>
          <template v-else>
            <span class="text-muted" style="font-size:12px">自动管理</span>
          </template>
        </template>
      </el-table-column>
    </el-table>
    <div class="member-hint">
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          <span style="font-size:13px">加入家庭组的真实用户会自动出现在成员列表中。虚拟成员（如"额外"）用于记录宠物、杂项等非用户收支。</span>
        </template>
      </el-alert>
    </div>
  </el-card>

  <el-dialog v-model="visible" :title="editingId ? '编辑虚拟成员' : '添加虚拟成员'" width="400px">
    <el-form :model="form" label-width="80px">
      <el-form-item label="名称" required>
        <el-input v-model="form.name" placeholder="例如：宠物、杂项" />
      </el-form-item>
      <el-form-item label="关系">
        <el-input v-model="form.relation" placeholder="例如：宠物、其他" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { memberApi } from '@/api';
import { useGroupStore } from '@/stores/group';

interface Member { id: number; name: string; relation: string; linkedUserId: number | null }

const groupStore = useGroupStore();

const list = ref<Member[]>([]);
const visible = ref(false);
const editingId = ref<number | null>(null);
const form = ref({ name: '', relation: '' });

async function load() {
  if (!groupStore.currentGroupId) return;
  list.value = (await memberApi.list(groupStore.currentGroupId)) as Member[];
}

function openForm(row?: Member) {
  form.value = row ? { name: row.name, relation: row.relation || '' } : { name: '', relation: '' };
  editingId.value = row?.id ?? null;
  visible.value = true;
}

async function onSave() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入名称');
    return;
  }
  const gid = groupStore.currentGroupId!;
  if (editingId.value) {
    await memberApi.update(gid, editingId.value, form.value);
  } else {
    await memberApi.create(gid, form.value);
  }
  visible.value = false;
  ElMessage.success('保存成功');
  load();
}

async function onDelete(id: number) {
  await ElMessageBox.confirm('确定删除该虚拟成员？有关联账目时无法删除', '提示', { type: 'warning' });
  await memberApi.remove(groupStore.currentGroupId!, id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
watch(() => groupStore.currentGroupId, (newId) => { if (newId) load(); });
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.member-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-hint {
  margin-top: 16px;
}

.text-muted {
  color: var(--text-muted);
  font-size: 13px;
}
</style>
