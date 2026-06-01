<template>
  <div>
    <el-row :gutter="16" class="page-card">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="label">本月收入</div>
          <div class="value income-text">¥{{ summary.income.toFixed(2) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="label">本月支出</div>
          <div class="value expense-text">¥{{ summary.expense.toFixed(2) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="label">本月结余</div>
          <div class="value" :class="summary.balance >= 0 ? 'income-text' : 'expense-text'">
            ¥{{ summary.balance.toFixed(2) }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="label">统计周期</div>
          <div class="value" style="font-size: 16px">{{ summary.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-alert :title="summary.summaryText" type="info" show-icon :closable="false" class="page-card" />

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card header="支出分类占比（本月）">
          <div ref="pieRef" style="height: 320px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card header="收支趋势（近30天）">
          <div ref="lineRef" style="height: 320px" />
        </el-card>
      </el-col>
    </el-row>

    <el-card header="最近账目" class="page-card" style="margin-top: 16px">
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
              {{ row.type === 'income' ? '+' : '-' }}¥{{ row.amount.toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" show-overflow-tooltip />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import { statsApi, transactionApi } from '@/api';

const summary = ref({
  income: 0,
  expense: 0,
  balance: 0,
  label: '',
  summaryText: '加载中...',
  startDate: '',
  endDate: '',
});

const recentList = ref<Array<Record<string, unknown>>>([]);
const pieRef = ref<HTMLElement>();
const lineRef = ref<HTMLElement>();
let pieChart: echarts.ECharts | null = null;
let lineChart: echarts.ECharts | null = null;

function dateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

onMounted(async () => {
  const s = await statsApi.summary({ period: 'month' }) as typeof summary.value;
  summary.value = s;

  const start = new Date();
  start.setDate(start.getDate() - 29);
  const [expenseCat, trend, recent] = await Promise.all([
    statsApi.byCategory({ type: 'expense', startDate: s.startDate, endDate: s.endDate }),
    statsApi.trend({ startDate: dateStr(start), endDate: s.endDate, groupBy: 'day' }),
    transactionApi.list({ page: 1, pageSize: 8 }),
  ]);

  const exp = expenseCat as { list: Array<{ categoryName: string; total: number }> };
  const tr = trend as { trend: Array<{ period: string; income: number; expense: number }> };
  const rec = recent as { list: Array<Record<string, unknown>> };
  recentList.value = rec.list;

  if (pieRef.value) {
    pieChart = echarts.init(pieRef.value);
    pieChart.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: exp.list.map((i) => ({ name: i.categoryName, value: i.total })),
      }],
    });
  }

  if (lineRef.value) {
    lineChart = echarts.init(lineRef.value);
    lineChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['收入', '支出'] },
      xAxis: { type: 'category', data: tr.trend.map((t) => t.period) },
      yAxis: { type: 'value' },
      series: [
        { name: '收入', type: 'line', smooth: true, data: tr.trend.map((t) => t.income), itemStyle: { color: '#67c23a' } },
        { name: '支出', type: 'line', smooth: true, data: tr.trend.map((t) => t.expense), itemStyle: { color: '#f56c6c' } },
      ],
    });
  }
});

onUnmounted(() => {
  pieChart?.dispose();
  lineChart?.dispose();
});
</script>
