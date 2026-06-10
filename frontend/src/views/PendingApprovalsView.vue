<template>
  <div class="pending-page">
    <div class="page-header">
      <h2>
        <el-icon :size="22" color="var(--primary)"><Checked /></el-icon>
        记账审批管理
      </h2>
      <el-button @click="load" :loading="loading">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <el-card class="page-card" shadow="never" v-if="pendingList.length === 0 && !loading">
      <el-empty description="暂无待审批记录" />
    </el-card>

    <el-card class="page-card" shadow="never" v-else>
      <el-table :data="pendingList" stripe v-loading="loading">
        <el-table-column prop="transDate" label="日期" width="120" />
        <el-table-column prop="submitterName" label="提交者" width="120" />
        <el-table-column prop="memberName" label="成员" width="100" />
        <el-table-column prop="categoryName" label="分类" width="100" />
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === 'income' ? 'success' : 'danger'" size="small">
              {{ row.type === 'income' ? '收入' : '支出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">
            <span :class="row.type === 'income' ? 'income-text' : 'expense-text'">
              ¥{{ Number(row.amount).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" show-overflow-tooltip />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="success" size="small" @click="onApprove(row)">
              <el-icon><Check /></el-icon> 通过
            </el-button>
            <el-button type="danger" size="small" @click="onReject(row)">
              <el-icon><Close /></el-icon> 拒绝
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { transactionApi } from '@/api';
import { useGroupStore } from '@/stores/group';

const groupStore = useGroupStore();
const pendingList = ref<any[]>([]);
const loading = ref(false);

async function load() {
  if (!groupStore.currentGroupId) return;
  loading.value = true;
  try {
    pendingList.value = await transactionApi.pending(groupStore.currentGroupId) as any[];
  } finally {
    loading.value = false;
  }
}

async function onApprove(row: any) {
  try {
    await transactionApi.approve(groupStore.currentGroupId!, row.id);
    ElMessage.success('已通过');
    load();
  } catch { /* handled by interceptor */ }
}

async function onReject(row: any) {
  try {
    await ElMessageBox.confirm('确定拒绝该记账申请？', '确认', { type: 'warning' });
    await transactionApi.reject(groupStore.currentGroupId!, row.id);
    ElMessage.success('已拒绝');
    load();
  } catch { /* cancel or handled */ }
}

onMounted(load);
watch(() => groupStore.currentGroupId, (newId) => { if (newId) load(); });
</script>

<style scoped>
.pending-page {
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
}
</style>
