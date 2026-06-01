import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api';

export interface UserInfo {
  id: number;
  username: string;
  displayName: string;
}

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '');
  const user = ref<UserInfo | null>(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
  );

  const isLoggedIn = computed(() => !!token.value);

  function setAuth(t: string, u: UserInfo) {
    token.value = t;
    user.value = u;
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async function fetchMe() {
    const data = await authApi.me() as UserInfo;
    user.value = data;
    localStorage.setItem('user', JSON.stringify(data));
  }

  return { token, user, isLoggedIn, setAuth, logout, fetchMe };
});
