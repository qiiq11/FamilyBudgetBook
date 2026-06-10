<template>
  <div>
    <el-card class="page-card" shadow="never">
      <el-form :inline="true" :model="query">
        <el-form-item label="类型">
          <el-select v-model="query.type" clearable placeholder="全部" style="width: 100px">
            <el-option label="收入" value="income" />
            <el-option label="支出" value="expense" />
          </el-select>
        </el-form-item>
        <el-form-item label="成员">
          <el-select v-model="query.memberId" clearable placeholder="全部" style="width: 120px">
            <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="query.categoryId" clearable placeholder="全部" style="width: 120px">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="备注/分类" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="load">查询</el-button>
          <el-button v-if="groupStore.canWrite" type="success" @click="openForm()">记一笔</el-button>
          <el-button v-if="!groupStore.canWrite" type="warning" @click="openForm()">
            <el-icon><EditPen /></el-icon> 申请记账
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="page-card" shadow="never">
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column prop="transDate" label="日期" width="120" />
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
        <el-table-column v-if="groupStore.canWrite" label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openForm(row)">编辑</el-button>
            <el-button link type="danger" @click="onDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        layout="total, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @change="load"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="类型" required>
          <el-radio-group v-model="form.type" @change="onTypeChange">
            <el-radio value="income">收入</el-radio>
            <el-radio value="expense">支出</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="成员" required>
          <el-select v-model="form.memberId" style="width: 100%">
            <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类" required>
          <el-select v-model="form.categoryId" style="width: 100%">
            <el-option v-for="c in filteredCategories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额" required>
          <el-input-number v-model="form.amount" :min="0.01" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="日期" required>
          <el-date-picker v-model="form.transDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { EditPen } from '@element-plus/icons-vue';
import { transactionApi, memberApi, categoryApi } from '@/api';
import { useGroupStore } from '@/stores/group';

interface Member { id: number; name: string }
interface Category { id: number; name: string; type: string }
interface TxRow {
  id: number;
  memberId: number;
  categoryId: number;
  amount: number;
  type: string;
  transDate: string;
  note: string;
}

const groupStore = useGroupStore();

const members = ref<Member[]>([]);
const categories = ref<Category[]>([]);
const list = ref<TxRow[]>([]);
const total = ref(0);
const loading = ref(false);
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const dateRange = ref<[string, string] | null>(null);

const dialogTitle = computed(() => {
  if (editingId.value) return '编辑账目';
  return groupStore.canWrite ? '记一笔' : '申请记账';
});

const query = reactive({
  type: '',
  memberId: undefined as number | undefined,
  categoryId: undefined as number | undefined,
  keyword: '',
  page: 1,
  pageSize: 15,
});

const form = reactive({
  type: 'expense' as 'income' | 'expense',
  memberId: undefined as number | undefined,
  categoryId: undefined as number | undefined,
  amount: 0,
  transDate: new Date().toISOString().slice(0, 10),
  note: '',
});

const filteredCategories = computed(() => categories.value.filter((c) => c.type === form.type));

async function loadMeta() {
  if (!groupStore.currentGroupId) return;
  const [m, c] = await Promise.all([
    memberApi.list(groupStore.currentGroupId),
    categoryApi.list(groupStore.currentGroupId),
  ]);
  members.value = m as Member[];
  categories.value = c as Category[];
}

async function load() {
  if (!groupStore.currentGroupId) return;
  loading.value = true;
  try {
    const params: Record<string, unknown> = { ...query };
    if (dateRange.value) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }
    const res = await transactionApi.list(groupStore.currentGroupId, params) as { list: TxRow[]; total: number };
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function openForm(row?: TxRow) {
  if (row) {
    editingId.value = row.id;
    Object.assign(form, {
      type: row.type,
      memberId: row.memberId,
      categoryId: row.categoryId,
      amount: row.amount,
      transDate: row.transDate,
      note: row.note || '',
    });
  } else {
    editingId.value = null;
    Object.assign(form, {
      type: 'expense',
      memberId: members.value[0]?.id,
      categoryId: undefined,
      amount: 0,
      transDate: new Date().toISOString().slice(0, 10),
      note: '',
    });
    onTypeChange();
  }
  dialogVisible.value = true;
}

function onTypeChange() {
  const first = filteredCategories.value[0];
  form.categoryId = first?.id;
}

async function onSave() {
  if (!form.memberId || !form.categoryId || !form.amount) {
    ElMessage.warning('请填写完整信息');
    return;
  }
  const gid = groupStore.currentGroupId!;
  const payload = { ...form };
  if (editingId.value) {
    await transactionApi.update(gid, editingId.value, payload);
    ElMessage.success('已更新');
  } else {
    const result = await transactionApi.create(gid, payload) as any;
    if (result.message) {
      ElMessage.success(result.message);
    } else {
      ElMessage.success(groupStore.canWrite ? '已添加' : '已提交申请');
    }
  }
  dialogVisible.value = false;
  load();
}

async function onDelete(id: number) {
  await ElMessageBox.confirm('确定删除该记录？', '提示', { type: 'warning' });
  await transactionApi.remove(groupStore.currentGroupId!, id);
  ElMessage.success('已删除');
  load();
}

onMounted(async () => {
  if (groupStore.currentGroupId) {
    await loadMeta();
    load();
  }
});

watch(() => groupStore.currentGroupId, async (newId) => {
  if (newId) {
    await loadMeta();
    load();
  }
});
</script>
