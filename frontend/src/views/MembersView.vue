<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>家庭成员管理</span>
        <el-button type="primary" @click="openForm()">添加成员</el-button>
      </div>
    </template>
    <el-table :data="list" stripe>
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="relation" label="关系" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="openForm(row)">编辑</el-button>
          <el-button link type="danger" @click="onDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="visible" :title="editingId ? '编辑成员' : '添加成员'" width="400px">
    <el-form :model="form" label-width="80px">
      <el-form-item label="姓名" required>
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="关系">
        <el-input v-model="form.relation" placeholder="如：父亲、母亲" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { memberApi } from '@/api';

interface Member { id: number; name: string; relation: string }

const list = ref<Member[]>([]);
const visible = ref(false);
const editingId = ref<number | null>(null);
const form = ref({ name: '', relation: '' });

async function load() {
  list.value = (await memberApi.list()) as Member[];
}

function openForm(row?: Member) {
  form.value = row ? { name: row.name, relation: row.relation || '' } : { name: '', relation: '' };
  editingId.value = row?.id ?? null;
  visible.value = true;
}

async function onSave() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入姓名');
    return;
  }
  if (editingId.value) {
    await memberApi.update(editingId.value, form.value);
  } else {
    await memberApi.create(form.value);
  }
  visible.value = false;
  ElMessage.success('保存成功');
  load();
}

async function onDelete(id: number) {
  await ElMessageBox.confirm('确定删除？有关联账目时无法删除', '提示', { type: 'warning' });
  await memberApi.remove(id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
