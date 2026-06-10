<template>
  <div>
    <el-card class="page-card" shadow="never">
      <el-form :inline="true">
        <el-form-item label="统计周期">
          <el-radio-group v-model="period" @change="onPeriodChange">
            <el-radio-button value="day">日</el-radio-button>
            <el-radio-button value="week">周</el-radio-button>
            <el-radio-button value="month">月</el-radio-button>
            <el-radio-button value="year">年</el-radio-button>
            <el-radio-button value="custom">自定义</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="period !== 'custom'" label="参考日期">
          <el-date-picker v-model="refDate" type="date" value-format="YYYY-MM-DD" @change="loadAll" />
        </el-form-item>
        <el-form-item v-else label="日期范围">
          <el-date-picker
            v-model="customRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            @change="loadAll"
          />
        </el-form-item>
        <el-form-item label="家庭成员">
          <el-select v-model="memberId" clearable placeholder="全部成员" style="width: 140px" @change="loadAll">
            <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadAll">查询统计</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-alert :title="summary.summaryText" type="success" show-icon :closable="false" class="page-card" />

    <el-row :gutter="16" class="page-card">
      <el-col :xs="24" :sm="8">
        <div class="stat-card">
          <div class="label">收入合计</div>
          <div class="value income-text">¥{{ summary.income.toFixed(2) }}</div>
          <div class="label">{{ summary.incomeCount }} 笔</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8">
        <div class="stat-card">
          <div class="label">支出合计</div>
          <div class="value expense-text">¥{{ summary.expense.toFixed(2) }}</div>
          <div class="label">{{ summary.expenseCount }} 笔</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8">
        <div class="stat-card">
          <div class="label">结余</div>
          <div class="value">¥{{ summary.balance.toFixed(2) }}</div>
        </div>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="表格统计" name="table">
        <el-row :gutter="16">
          <el-col :xs="24" :lg="12">
            <el-card class="page-card" shadow="never">
              <template #header>按成员统计</template>
              <el-table :data="memberStats" stripe>
                <el-table-column prop="memberName" label="成员" />
                <el-table-column prop="income" label="收入">
                  <template #default="{ row }">
                    <span class="income-text">¥{{ Number(row.income).toFixed(2) }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="expense" label="支出">
                  <template #default="{ row }">
                    <span class="expense-text">¥{{ Number(row.expense).toFixed(2) }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="balance" label="结余">
                  <template #default="{ row }">¥{{ Number(row.balance).toFixed(2) }}</template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
          <el-col :xs="24" :lg="12">
            <el-card class="page-card" shadow="never">
              <template #header>支出分类明细</template>
              <el-table :data="expenseByCat" stripe>
                <el-table-column prop="categoryName" label="分类" />
                <el-table-column prop="total" label="金额">
                  <template #default="{ row }">¥{{ Number(row.total).toFixed(2) }}</template>
                </el-table-column>
                <el-table-column prop="count" label="笔数" width="80" />
              </el-table>
            </el-card>
          </el-col>
        </el-row>
        <el-card class="page-card" shadow="never" style="margin-top: 16px">
          <template #header>收入分类明细</template>
          <el-table :data="incomeByCat" stripe>
            <el-table-column prop="categoryName" label="分类" />
            <el-table-column prop="total" label="金额">
              <template #default="{ row }">
                <span class="income-text">¥{{ Number(row.total).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="count" label="笔数" width="80" />
          </el-table>
        </el-card>
      </el-tab-pane>
      <el-tab-pane label="图形统计" name="chart">
        <el-row :gutter="16">
          <el-col :xs="24" :lg="12">
            <el-card class="page-card" shadow="never">
              <template #header>支出分类饼图</template>
              <div ref="expensePieRef" style="height: 360px" />
            </el-card>
          </el-col>
          <el-col :xs="24" :lg="12">
            <el-card class="page-card" shadow="never">
              <template #header>收入分类饼图</template>
              <div ref="incomePieRef" style="height: 360px" />
            </el-card>
          </el-col>
        </el-row>
        <el-card class="page-card" shadow="never" style="margin-top: 16px">
          <template #header>成员收支对比</template>
          <div ref="memberBarRef" style="height: 360px" />
        </el-card>
        <el-card class="page-card" shadow="never" style="margin-top: 16px">
          <template #header>收支趋势</template>
          <div ref="trendRef" style="height: 360px" />
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import * as echarts from 'echarts';
import { statsApi, memberApi } from '@/api';
import { useGroupStore } from '@/stores/group';

interface Member { id: number; name: string }

const groupStore = useGroupStore();

const members = ref<Member[]>([]);
const period = ref('month');
const refDate = ref(new Date().toISOString().slice(0, 10));
const customRange = ref<[string, string] | null>(null);
const memberId = ref<number | undefined>();
const activeTab = ref('table');

const summary = ref({
  income: 0,
  expense: 0,
  balance: 0,
  incomeCount: 0,
  expenseCount: 0,
  summaryText: '',
  startDate: '',
  endDate: '',
});

const memberStats = ref<Array<Record<string, number | string>>>([]);
const expenseByCat = ref<Array<{ categoryName: string; total: number; count: number }>>([]);
const incomeByCat = ref<Array<{ categoryName: string; total: number; count: number }>>([]);

const expensePieRef = ref<HTMLElement>();
const incomePieRef = ref<HTMLElement>();
const memberBarRef = ref<HTMLElement>();
const trendRef = ref<HTMLElement>();
const charts: echarts.ECharts[] = [];

function getRange() {
  if (period.value === 'custom' && customRange.value) {
    return { startDate: customRange.value[0], endDate: customRange.value[1] };
  }
  return null;
}

async function loadAll() {
  const gid = groupStore.currentGroupId;
  if (!gid) return;

  const rangeParams = getRange();
  const sumParams: Record<string, unknown> = rangeParams
    ? { ...rangeParams, memberId: memberId.value }
    : { period: period.value, refDate: refDate.value, memberId: memberId.value };

  const s = (await statsApi.summary(gid, sumParams)) as typeof summary.value;
  summary.value = s;

  const base = { startDate: s.startDate, endDate: s.endDate, memberId: memberId.value };
  const [byMember, expCat, incCat, trend] = await Promise.all([
    statsApi.byMember(gid, base),
    statsApi.byCategory(gid, { ...base, type: 'expense' }),
    statsApi.byCategory(gid, { ...base, type: 'income' }),
    statsApi.trend(gid, { ...base, groupBy: period.value === 'year' ? 'month' : 'day' }),
  ]);

  memberStats.value = (byMember as { list: typeof memberStats.value }).list;
  expenseByCat.value = (expCat as { list: typeof expenseByCat.value }).list;
  incomeByCat.value = (incCat as { list: typeof incomeByCat.value }).list;

  await nextTick();
  if (activeTab.value === 'chart') renderCharts(trend as { trend: Array<{ period: string; income: number; expense: number }> });
}

function renderCharts(trendData: { trend: Array<{ period: string; income: number; expense: number }> }) {
  charts.forEach((c) => c.dispose());
  charts.length = 0;

  const mk = (el: HTMLElement | undefined, opt: object) => {
    if (!el) return;
    const c = echarts.init(el);
    c.setOption(opt);
    charts.push(c);
  };

  mk(expensePieRef.value, {
    tooltip: { trigger: 'item' },
    color: ['#e74c3c','#e67e22','#f39c12','#9b59b6','#3498db','#1abc9c','#2ecc71','#f1c40f','#e91e63','#00bcd4','#ff6f00','#4caf50'],
    series: [{ type: 'pie', radius: '65%', data: expenseByCat.value.map((i) => ({ name: i.categoryName, value: i.total })) }],
  });

  mk(incomePieRef.value, {
    tooltip: { trigger: 'item' },
    color: ['#2ecc71','#27ae60','#1abc9c','#3498db','#9b59b6','#f39c12','#e67e22','#e74c3c','#f1c40f','#00bcd4','#e91e63','#1e8449'],
    series: [{ type: 'pie', radius: '65%', data: incomeByCat.value.map((i) => ({ name: i.categoryName, value: i.total })) }],
  });

  mk(memberBarRef.value, {
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出'] },
    xAxis: { type: 'category', data: memberStats.value.map((m) => m.memberName) },
    yAxis: { type: 'value' },
    series: [
      { name: '收入', type: 'bar', data: memberStats.value.map((m) => m.income), itemStyle: { color: '#67c23a' } },
      { name: '支出', type: 'bar', data: memberStats.value.map((m) => m.expense), itemStyle: { color: '#f56c6c' } },
    ],
  });

  mk(trendRef.value, {
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出', '结余'] },
    xAxis: { type: 'category', data: trendData.trend.map((t) => t.period) },
    yAxis: { type: 'value' },
    series: [
      { name: '收入', type: 'line', data: trendData.trend.map((t) => t.income) },
      { name: '支出', type: 'line', data: trendData.trend.map((t) => t.expense) },
      { name: '结余', type: 'bar', data: trendData.trend.map((t) => t.balance) },
    ],
  });
}

function onPeriodChange() {
  if (period.value === 'custom' && !customRange.value) {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    customRange.value = [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
  }
  loadAll();
}

async function loadMeta() {
  const gid = groupStore.currentGroupId;
  if (!gid) return;
  members.value = (await memberApi.list(gid)) as Member[];
}

onMounted(async () => {
  await loadMeta();
  if (groupStore.currentGroupId) loadAll();
});

watch(() => groupStore.currentGroupId, async (newId) => {
  if (newId) {
    await loadMeta();
    loadAll();
  }
});

onUnmounted(() => charts.forEach((c) => c.dispose()));
</script>
