import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { groupApi } from '@/api';

export interface GroupInfo {
  id: number;
  name: string;
  inviteCode: string;
  creatorId: number;
  role: 'creator' | 'admin' | 'member';
  canManagePermissions: boolean | number;
  createdAt: string;
}

export const useGroupStore = defineStore('group', () => {
  const groups = ref<GroupInfo[]>([]);
  const currentGroupId = ref<number | null>(
    localStorage.getItem('currentGroupId') ? Number(localStorage.getItem('currentGroupId')) : null
  );
  const loading = ref(false);

  const currentGroup = computed(() =>
    groups.value.find((g) => g.id === currentGroupId.value) || null
  );

  const currentRole = computed(() => currentGroup.value?.role || 'member');
  const canManagePermissions = computed(() =>
    currentGroup.value?.role === 'creator' ||
    (currentGroup.value?.role === 'admin' && !!currentGroup.value?.canManagePermissions)
  );
  const canWrite = computed(() => currentRole.value !== 'member');
  const isCreator = computed(() => currentRole.value === 'creator');

  function selectGroup(id: number) {
    currentGroupId.value = id;
    localStorage.setItem('currentGroupId', String(id));
  }

  async function fetchGroups() {
    loading.value = true;
    try {
      groups.value = await groupApi.list() as GroupInfo[];
      // Auto-select first group if none selected
      if (!currentGroupId.value && groups.value.length > 0) {
        selectGroup(groups.value[0].id);
      }
      // Clear selection if no groups
      if (groups.value.length === 0) {
        currentGroupId.value = null;
        localStorage.removeItem('currentGroupId');
      }
    } finally {
      loading.value = false;
    }
  }

  return {
    groups,
    currentGroupId,
    currentGroup,
    currentRole,
    canManagePermissions,
    canWrite,
    isCreator,
    loading,
    selectGroup,
    fetchGroups,
  };
});
