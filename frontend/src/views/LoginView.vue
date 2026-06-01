<template>
  <div class="login-page">
    <el-card class="login-card" shadow="always">
      <h1>家庭记账本</h1>
      <p class="subtitle">家庭日常财务账目管理系统</p>
      <el-tabs v-model="tab">
        <el-tab-pane label="登录" name="login">
          <el-form :model="loginForm" @submit.prevent="onLogin">
            <el-form-item>
              <el-input v-model="loginForm.username" placeholder="用户名" prefix-icon="User" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="loginForm.password" type="password" placeholder="密码" prefix-icon="Lock" show-password />
            </el-form-item>
            <el-button type="primary" native-type="submit" :loading="loading" style="width: 100%">登录</el-button>
          </el-form>
          <p class="hint">演示账号：demo / 123456（需先运行 npm run seed）</p>
        </el-tab-pane>
        <el-tab-pane label="注册" name="register">
          <el-form :model="regForm" @submit.prevent="onRegister">
            <el-form-item>
              <el-input v-model="regForm.username" placeholder="用户名" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="regForm.displayName" placeholder="家庭名称（可选）" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="regForm.password" type="password" placeholder="密码（至少6位）" show-password />
            </el-form-item>
            <el-button type="primary" native-type="submit" :loading="loading" style="width: 100%">注册</el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { authApi } from '@/api';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();
const tab = ref('login');
const loading = ref(false);

const loginForm = reactive({ username: 'demo', password: '123456' });
const regForm = reactive({ username: '', password: '', displayName: '' });

async function onLogin() {
  loading.value = true;
  try {
    const res = await authApi.login(loginForm) as { token: string; user: { id: number; username: string; displayName: string } };
    userStore.setAuth(res.token, res.user);
    ElMessage.success('登录成功');
    router.push('/dashboard');
  } finally {
    loading.value = false;
  }
}

async function onRegister() {
  loading.value = true;
  try {
    const res = await authApi.register(regForm) as { token: string; user: { id: number; username: string; displayName: string } };
    userStore.setAuth(res.token, res.user);
    ElMessage.success('注册成功，已初始化默认分类与成员');
    router.push('/dashboard');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  width: 400px;
  padding: 20px;
}
h1 {
  text-align: center;
  margin-bottom: 8px;
}
.subtitle {
  text-align: center;
  color: #909399;
  margin-bottom: 24px;
  font-size: 14px;
}
.hint {
  margin-top: 12px;
  font-size: 12px;
  color: #909399;
  text-align: center;
}
</style>
