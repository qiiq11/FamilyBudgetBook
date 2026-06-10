<template>
  <div>
    <!-- Summary Cards -->
    <el-row :gutter="16" class="page-card">
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="label">本月收入</div>
          <div class="value income-text">¥{{ summary.income.toFixed(2) }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="label">本月支出</div>
          <div class="value expense-text">¥{{ summary.expense.toFixed(2) }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="label">本月结余</div>
          <div class="value" :class="summary.balance >= 0 ? 'income-text' : 'expense-text'">
            ¥{{ summary.balance.toFixed(2) }}
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="label">统计周期</div>
          <div class="value" style="font-size: 16px">{{ summary.label }}</div>
        </div>
      </el-col>
    </el-row>

    <el-alert :title="summary.summaryText" type="info" show-icon :closable="false" class="page-card" />

    <!-- Calendar View -->
    <el-card class="page-card" shadow="never">
      <template #header>
        <div class="calendar-header">
          <el-button @click="prevMonth" :icon="ArrowLeft" circle size="small" />
          <h3>{{ calYear }}年{{ calMonth }}月</h3>
          <el-button @click="nextMonth" :icon="ArrowRight" circle size="small" />
          <el-button @click="goToday" size="small" style="margin-left: 12px">今天</el-button>
        </div>
      </template>

      <div class="calendar-grid">
        <div class="cal-day-header" v-for="d in ['日','一','二','三','四','五','六']" :key="d">
          {{ d }}
        </div>
        <!-- Empty cells before 1st -->
        <div
          v-for="i in firstDayOfWeek"
          :key="'empty-'+i"
          class="cal-cell empty"
        ></div>
        <!-- Day cells -->
        <div
          v-for="day in calDays"
          :key="day.date"
          class="cal-cell"
          :class="{ today: day.date === todayStr }"
          :style="cellStyle(day)"
          @click="onDayClick(day)"
        >
          <span class="cal-day-num">{{ day.day }}</span>
          <span v-if="day.income > 0" class="cal-income">+{{ fmtShort(day.income) }}</span>
          <span v-if="day.expense > 0" class="cal-expense">-{{ fmtShort(day.expense) }}</span>
        </div>
      </div>
    </el-card>

    <!-- Day Detail Dialog -->
    <el-dialog v-model="dayDialogVisible" :title="selectedDate" width="640px">
      <el-table :data="dayTransactions" stripe>
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
              {{ row.type === 'income' ? '+' : '-' }}¥{{ Number(row.amount).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" show-overflow-tooltip />
      </el-table>
    </el-dialog>

    <!-- Collapsible Charts Section -->
    <el-collapse v-model="expandedPanels" class="page-card">
      <el-collapse-item title="图表分析" name="charts">
        <el-row :gutter="16">
          <el-col :xs="24" :lg="12">
            <el-card shadow="never">
              <template #header>支出分类占比（本月）</template>
              <div ref="pieRef" style="height: 320px" />
            </el-card>
          </el-col>
          <el-col :xs="24" :lg="12">
            <el-card shadow="never">
              <template #header>收支趋势（近30天）</template>
              <div ref="lineRef" style="height: 320px" />
            </el-card>
          </el-col>
        </el-row>
      </el-collapse-item>
    </el-collapse>

    <!-- Recent Transactions -->
    <el-card class="page-card" shadow="never">
      <template #header>最近账目</template>
      <el-table :data="recentList" stripe>
        <el-table-column prop="transDate" label="日期" width="120" />
        <el-table-column prop="memberName" label="成员" width="100" />
        <el-table-column prop="categoryName" label="分类" />
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
              {{ row.type === 'income' ? '+' : '-' }}¥{{ Number(row.amount).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" show-overflow-tooltip />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { statsApi, transactionApi } from '@/api';
import { useGroupStore } from '@/stores/group';

const groupStore = useGroupStore();

const summary = ref({
  income: 0, expense: 0, balance: 0,
  label: '', summaryText: '加载中...', startDate: '', endDate: '',
});

const recentList = ref<Array<Record<string, unknown>>>([]);

// Calendar state
const calYear = ref(new Date().getFullYear());
const calMonth = ref(new Date().getMonth() + 1);
const calDays = ref<Array<{ date: string; day: number; weekday: number; income: number; expense: number; balance: number }>>([]);
const maxExpense = ref(0);
const maxIncome = ref(0);
const todayStr = new Date().toISOString().slice(0, 10);

// Day detail dialog
const dayDialogVisible = ref(false);
const selectedDate = ref('');
const dayTransactions = ref<Array<Record<string, unknown>>>([]);

// Charts (collapsed by default)
const expandedPanels = ref<string[]>([]);
const pieRef = ref<HTMLElement>();
const lineRef = ref<HTMLElement>();
let pieChart: echarts.ECharts | null = null;
let lineChart: echarts.ECharts | null = null;

const firstDayOfWeek = computed(() => {
  const d = new Date(calYear.value, calMonth.value - 1, 1);
  return d.getDay(); // 0=Sun
});

function fmtShort(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toFixed(0);
}

function cellStyle(day: { income: number; expense: number; date: string }) {
  const style: Record<string, string> = {};
  if (day.expense > 0 && maxExpense.value > 0) {
    const ratio = Math.min(day.expense / maxExpense.value, 1);
    style.backgroundColor = `rgba(231, 76, 60, ${0.06 + ratio * 0.18})`;
  }
  if (day.income > 0 && maxIncome.value > 0) {
    const ratio = Math.min(day.income / maxIncome.value, 1);
    style.borderColor = `rgba(39, 174, 96, ${0.3 + ratio * 0.7})`;
  }
  return style;
}

function prevMonth() {
  if (calMonth.value === 1) { calYear.value--; calMonth.value = 12; }
  else calMonth.value--;
  loadCalendar();
}

function nextMonth() {
  if (calMonth.value === 12) { calYear.value++; calMonth.value = 1; }
  else calMonth.value++;
  loadCalendar();
}

function goToday() {
  const now = new Date();
  calYear.value = now.getFullYear();
  calMonth.value = now.getMonth() + 1;
  loadCalendar();
}

async function onDayClick(day: { date: string }) {
  selectedDate.value = day.date;
  const gid = groupStore.currentGroupId!;
  const res = await transactionApi.list(gid, { startDate: day.date, endDate: day.date, pageSize: 100, status: 'approved' }) as { list: Array<Record<string, unknown>> };
  dayTransactions.value = res.list;
  dayDialogVisible.value = true;
}

async function loadCalendar() {
  const gid = groupStore.currentGroupId;
  if (!gid) return;
  const data = await statsApi.calendar(gid, { year: calYear.value, month: calMonth.value }) as { days: typeof calDays.value };
  calDays.value = data.days;
  maxExpense.value = Math.max(...data.days.map(d => d.expense), 1);
  maxIncome.value = Math.max(...data.days.map(d => d.income), 1);
}

async function loadData() {
  const gid = groupStore.currentGroupId;
  if (!gid) return;

  const s = await statsApi.summary(gid, { period: 'month' }) as typeof summary.value;
  summary.value = s;

  const start = new Date();
  start.setDate(start.getDate() - 29);
  const [expenseCat, trend, recent] = await Promise.all([
    statsApi.byCategory(gid, { type: 'expense', startDate: s.startDate, endDate: s.endDate }),
    statsApi.trend(gid, { startDate: dateStr(start), endDate: s.endDate, groupBy: 'day' }),
    transactionApi.list(gid, { page: 1, pageSize: 8 }),
  ]);

  const exp = expenseCat as { list: Array<{ categoryName: string; total: number }> };
  const tr = trend as { trend: Array<{ period: string; income: number; expense: number }> };
  const rec = recent as { list: Array<Record<string, unknown>> };
  recentList.value = rec.list;

  if (pieChart) {
    pieChart.setOption({
      tooltip: { trigger: 'item' },
      color: ['#e74c3c','#e67e22','#f39c12','#9b59b6','#3498db','#1abc9c','#2ecc71','#f1c40f','#e91e63','#00bcd4','#ff6f00','#4caf50'],
      series: [{ type: 'pie', radius: ['40%', '70%'], data: exp.list.map(i => ({ name: i.categoryName, value: i.total })) }],
    });
  }
  if (lineChart) {
    lineChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['收入', '支出'] },
      xAxis: { type: 'category', data: tr.trend.map(t => t.period) },
      yAxis: { type: 'value' },
      series: [
        { name: '收入', type: 'line', smooth: true, data: tr.trend.map(t => t.income), itemStyle: { color: '#67c23a' } },
        { name: '支出', type: 'line', smooth: true, data: tr.trend.map(t => t.expense), itemStyle: { color: '#f56c6c' } },
      ],
    });
  }
}

function dateStr(d: Date) { return d.toISOString().slice(0, 10); }

onMounted(async () => {
  if (groupStore.currentGroupId) {
    await loadCalendar();
    loadData();
  }
  nextTick(() => {
    if (pieRef.value) pieChart = echarts.init(pieRef.value);
    if (lineRef.value) lineChart = echarts.init(lineRef.value);
    // Re-render charts if data loaded before refs
    if (pieChart && recentList.value.length > 0) {
      loadData();
    }
  });
});

watch(() => groupStore.currentGroupId, async (newId) => {
  if (newId) {
    await loadCalendar();
    loadData();
  }
});

// Watch collapsible panel open to init charts
watch(expandedPanels, async (val) => {
  if (val.includes('charts')) {
    await nextTick();
    if (!pieChart && pieRef.value) {
      pieChart = echarts.init(pieRef.value);
      lineChart = echarts.init(lineRef.value!);
      loadData();
    }
    pieChart?.resize();
    lineChart?.resize();
  }
});

onUnmounted(() => {
  pieChart?.dispose();
  lineChart?.dispose();
});
</script>

<style scoped>
.calendar-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.calendar-header h3 {
  margin: 0;
  font-size: 18px;
  min-width: 120px;
  text-align: center;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.cal-day-header {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 8px 0;
}

.cal-cell {
  min-height: 72px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.cal-cell:hover {
  border-color: var(--primary-light);
  box-shadow: var(--shadow-sm);
}

.cal-cell.empty {
  background: transparent;
  border-color: transparent;
  cursor: default;
}

.cal-cell.today {
  border-color: var(--primary) !important;
  border-width: 2px;
}

.cal-day-num {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.cal-income {
  font-size: 11px;
  color: var(--accent);
  font-weight: 600;
  line-height: 1.4;
}

.cal-expense {
  font-size: 11px;
  color: var(--danger);
  font-weight: 600;
  line-height: 1.4;
}
</style>
