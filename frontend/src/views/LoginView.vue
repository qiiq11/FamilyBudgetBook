<template>
  <div class="login-page">
    <!-- Background decoration -->
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>

    <div class="login-container">
      <!-- Left: illustration -->
      <div class="login-illustration">
        <div class="illustration-content">
          <el-icon :size="72" color="#e67e22"><House /></el-icon>
          <h2>家庭记账本</h2>
          <p>记录每一笔温暖的开销<br/>与家人一起管理财务</p>
          <div class="feature-icons">
            <div class="feature-item">
              <el-icon :size="24"><Wallet /></el-icon>
              <span>智能记账</span>
            </div>
            <div class="feature-item">
              <el-icon :size="24"><UserFilled /></el-icon>
              <span>家庭协作</span>
            </div>
            <div class="feature-item">
              <el-icon :size="24"><DataAnalysis /></el-icon>
              <span>数据统计</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: login / register form -->
      <div class="login-form-area">
        <div class="form-tabs">
          <button
            class="tab-btn"
            :class="{ active: tab === 'login' }"
            @click="tab = 'login'"
          >登录</button>
          <button
            class="tab-btn"
            :class="{ active: tab === 'register' }"
            @click="tab = 'register'"
          >注册</button>
        </div>

        <!-- Login Form -->
        <form v-if="tab === 'login'" @submit.prevent="onLogin" class="form-body">
          <div class="input-group">
            <el-icon class="input-icon"><User /></el-icon>
            <input v-model="loginForm.username" placeholder="用户名" class="form-input" autocomplete="username" />
          </div>
          <div class="input-group">
            <el-icon class="input-icon"><Lock /></el-icon>
            <input v-model="loginForm.password" type="password" placeholder="密码" class="form-input" autocomplete="current-password" />
          </div>
          <button type="submit" class="submit-btn" :disabled="loading">
            <span v-if="!loading">登 录</span>
            <el-icon v-else :size="20" class="spinner"><Loading /></el-icon>
          </button>
          <p class="form-hint">演示账号：测试员 / 666666</p>
        </form>

        <!-- Register Form -->
        <form v-if="tab === 'register'" @submit.prevent="onRegister" class="form-body">
          <div class="input-group">
            <el-icon class="input-icon"><User /></el-icon>
            <input v-model="regForm.username" placeholder="用户名" class="form-input" autocomplete="username" />
          </div>
          <div class="input-group">
            <el-icon class="input-icon"><EditPen /></el-icon>
            <input v-model="regForm.displayName" placeholder="昵称（可选）" class="form-input" />
          </div>
          <div class="input-group">
            <el-icon class="input-icon"><Lock /></el-icon>
            <input v-model="regForm.password" type="password" placeholder="密码（至少6位）" class="form-input" autocomplete="new-password" />
          </div>
          <button type="submit" class="submit-btn" :disabled="loading">
            <span v-if="!loading">注 册</span>
            <el-icon v-else :size="20" class="spinner"><Loading /></el-icon>
          </button>
          <p class="form-hint">注册后请创建或加入一个家庭组</p>
        </form>
      </div>
    </div>
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

const loginForm = reactive({ username: '测试员', password: '666666' });
const regForm = reactive({ username: '', password: '', displayName: '' });

async function onLogin() {
  loading.value = true;
  try {
    const res = await authApi.login(loginForm) as { token: string; user: { id: number; username: string; displayName: string } };
    userStore.setAuth(res.token, res.user);
    ElMessage.success('欢迎回来！');
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
    ElMessage.success('注册成功，请创建或加入一个家庭组');
    router.push('/groups');
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
  background: linear-gradient(135deg, #fdf6f0 0%, #fef9f3 30%, #fef3e2 70%, #fde8d0 100%);
  position: relative;
  overflow: hidden;
}

/* Background decoration */
.bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.12;
}

.circle-1 {
  width: 400px;
  height: 400px;
  background: var(--primary);
  top: -100px;
  right: -80px;
}

.circle-2 {
  width: 250px;
  height: 250px;
  background: var(--accent);
  bottom: -60px;
  left: -40px;
}

.circle-3 {
  width: 150px;
  height: 150px;
  background: var(--primary-light);
  bottom: 120px;
  right: 300px;
}

/* Container */
.login-container {
  display: flex;
  width: 860px;
  min-height: 500px;
  background: #fff;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  position: relative;
  z-index: 1;
}

/* Left Illustration */
.login-illustration {
  width: 380px;
  background: linear-gradient(160deg, #fef3e2 0%, #fdf0db 40%, #fef9f3 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.illustration-content {
  text-align: center;
}

.illustration-content h2 {
  font-size: 24px;
  color: var(--primary);
  margin: 16px 0 12px;
  font-weight: 700;
}

.illustration-content p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 32px;
}

.feature-icons {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 14px;
}

.feature-item .el-icon {
  color: var(--primary-light);
}

/* Right Form Area */
.login-form-area {
  flex: 1;
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
}

.form-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 36px;
  background: var(--bg-page);
  border-radius: var(--radius-sm);
  padding: 4px;
}

.tab-btn {
  flex: 1;
  padding: 10px 20px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.25s;
}

.tab-btn.active {
  background: #fff;
  color: var(--primary);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.tab-btn:hover:not(.active) {
  color: var(--text-primary);
}

.form-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: var(--text-muted);
  font-size: 18px;
  pointer-events: none;
}

.form-input {
  width: 100%;
  padding: 12px 14px 12px 42px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 15px;
  color: var(--text-primary);
  background: #fefefd;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
  font-family: var(--font-family);
}

.form-input::placeholder {
  color: var(--text-muted);
}

.form-input:focus {
  border-color: var(--primary-light);
  box-shadow: 0 0 0 3px rgba(240, 165, 0, 0.1);
}

.submit-btn {
  margin-top: 8px;
  padding: 13px 20px;
  border: none;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
  letter-spacing: 2px;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.92;
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.form-hint {
  margin-top: 20px;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}

/* Responsive */
@media (max-width: 768px) {
  .login-container {
    flex-direction: column;
    width: 90vw;
  }
  .login-illustration {
    width: 100%;
    padding: 28px 20px;
  }
  .feature-icons {
    flex-direction: row;
    justify-content: center;
    gap: 24px;
  }
  .login-form-area {
    padding: 32px 24px;
  }
}
</style>
