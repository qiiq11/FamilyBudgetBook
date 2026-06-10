<template>
  <el-row :gutter="16">
    <el-col :xs="24" :md="12">
      <el-card class="page-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>收入分类</span>
            <el-button v-if="groupStore.canWrite" type="primary" size="small" @click="openForm('income')">新增</el-button>
          </div>
        </template>
        <el-table :data="incomeList" stripe>
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="sortOrder" label="排序" width="80" />
          <el-table-column label="操作" width="140" v-if="groupStore.canWrite">
            <template #default="{ row }">
              <el-button link type="primary" @click="openForm('income', row)">编辑</el-button>
              <el-button link type="danger" @click="onDelete(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-col>
    <el-col :xs="24" :md="12">
      <el-card class="page-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>支出分类</span>
            <el-button v-if="groupStore.canWrite" type="primary" size="small" @click="openForm('expense')">新增</el-button>
          </div>
        </template>
        <el-table :data="expenseList" stripe>
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="sortOrder" label="排序" width="80" />
          <el-table-column label="操作" width="140" v-if="groupStore.canWrite">
            <template #default="{ row }">
              <el-button link type="primary" @click="openForm('expense', row)">编辑</el-button>
              <el-button link type="danger" @click="onDelete(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-col>
  </el-row>

  <el-dialog v-model="visible" :title="editingId ? '编辑分类' : '新增分类'" width="400px">
    <el-form :model="form" label-width="80px">
      <el-form-item label="名称" required>
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="form.sortOrder" :min="0" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { categoryApi } from '@/api';
import { useGroupStore } from '@/stores/group';

interface Cat { id: number; name: string; type: string; sortOrder: number }

const groupStore = useGroupStore();

const list = ref<Cat[]>([]);
const visible = ref(false);
const editingId = ref<number | null>(null);
const form = ref({ name: '', type: 'expense', sortOrder: 0 });

const incomeList = computed(() => list.value.filter((c) => c.type === 'income'));
const expenseList = computed(() => list.value.filter((c) => c.type === 'expense'));

async function load() {
  if (!groupStore.currentGroupId) return;
  list.value = (await categoryApi.list(groupStore.currentGroupId)) as Cat[];
}

function openForm(type: string, row?: Cat) {
  form.value = row
    ? { name: row.name, type: row.type, sortOrder: row.sortOrder }
    : { name: '', type, sortOrder: 0 };
  editingId.value = row?.id ?? null;
  visible.value = true;
}

async function onSave() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入分类名称');
    return;
  }
  const gid = groupStore.currentGroupId!;
  if (editingId.value) {
    await categoryApi.update(gid, editingId.value, { name: form.value.name, sortOrder: form.value.sortOrder });
  } else {
    await categoryApi.create(gid, form.value);
  }
  visible.value = false;
  ElMessage.success('保存成功');
  load();
}

async function onDelete(id: number) {
  await ElMessageBox.confirm('确定删除？有关联账目时无法删除', '提示', { type: 'warning' });
  await categoryApi.remove(groupStore.currentGroupId!, id);
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
</style>
