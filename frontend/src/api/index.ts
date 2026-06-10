import http from './http';

export const authApi = {
  login: (data: { username: string; password: string }) => http.post('/auth/login', data),
  register: (data: { username: string; password: string; displayName?: string }) =>
    http.post('/auth/register', data),
  me: () => http.get('/auth/me'),
};

export const groupApi = {
  list: () => http.get('/groups'),
  get: (id: number) => http.get(`/groups/${id}`, { headers: { 'X-Group-Id': id } }),
  create: (data: { name: string; password: string }) => http.post('/groups', data),
  update: (id: number, data: { name?: string; password?: string }) =>
    http.put(`/groups/${id}`, data, { headers: { 'X-Group-Id': id } }),
  remove: (id: number) => http.delete(`/groups/${id}`, { headers: { 'X-Group-Id': id } }),
  join: (data: { inviteCode: string; password: string }) => http.post('/groups/join', data),
  listMembers: (groupId: number) =>
    http.get(`/groups/${groupId}/members`, { headers: { 'X-Group-Id': groupId } }),
  updateMember: (groupId: number, userId: number, data: { role?: string; canManagePermissions?: boolean }) =>
    http.put(`/groups/${groupId}/members/${userId}`, data, { headers: { 'X-Group-Id': groupId } }),
  removeMember: (groupId: number, userId: number) =>
    http.delete(`/groups/${groupId}/members/${userId}`, { headers: { 'X-Group-Id': groupId } }),
};

export const memberApi = {
  list: (groupId: number) => http.get('/members', { headers: { 'X-Group-Id': String(groupId) } }),
  create: (groupId: number, data: { name: string; relation?: string }) =>
    http.post('/members', data, { headers: { 'X-Group-Id': String(groupId) } }),
  update: (groupId: number, id: number, data: { name: string; relation?: string }) =>
    http.put(`/members/${id}`, data, { headers: { 'X-Group-Id': String(groupId) } }),
  remove: (groupId: number, id: number) =>
    http.delete(`/members/${id}`, { headers: { 'X-Group-Id': String(groupId) } }),
};

export const categoryApi = {
  list: (groupId: number, type?: string) =>
    http.get('/categories', { headers: { 'X-Group-Id': String(groupId) }, params: { type } }),
  create: (groupId: number, data: { name: string; type: string; icon?: string; sortOrder?: number }) =>
    http.post('/categories', data, { headers: { 'X-Group-Id': String(groupId) } }),
  update: (groupId: number, id: number, data: object) =>
    http.put(`/categories/${id}`, data, { headers: { 'X-Group-Id': String(groupId) } }),
  remove: (groupId: number, id: number) =>
    http.delete(`/categories/${id}`, { headers: { 'X-Group-Id': String(groupId) } }),
};

export const transactionApi = {
  list: (groupId: number, params: object) =>
    http.get('/transactions', { headers: { 'X-Group-Id': String(groupId) }, params }),
  create: (groupId: number, data: object) =>
    http.post('/transactions', data, { headers: { 'X-Group-Id': String(groupId) } }),
  update: (groupId: number, id: number, data: object) =>
    http.put(`/transactions/${id}`, data, { headers: { 'X-Group-Id': String(groupId) } }),
  remove: (groupId: number, id: number) =>
    http.delete(`/transactions/${id}`, { headers: { 'X-Group-Id': String(groupId) } }),
  pending: (groupId: number) =>
    http.get('/transactions/pending', { headers: { 'X-Group-Id': String(groupId) } }),
  approve: (groupId: number, id: number) =>
    http.put(`/transactions/${id}/approve`, {}, { headers: { 'X-Group-Id': String(groupId) } }),
  reject: (groupId: number, id: number) =>
    http.put(`/transactions/${id}/reject`, {}, { headers: { 'X-Group-Id': String(groupId) } }),
};

export const statsApi = {
  summary: (groupId: number, params: object) =>
    http.get('/stats/summary', { headers: { 'X-Group-Id': String(groupId) }, params }),
  byCategory: (groupId: number, params: object) =>
    http.get('/stats/by-category', { headers: { 'X-Group-Id': String(groupId) }, params }),
  byMember: (groupId: number, params: object) =>
    http.get('/stats/by-member', { headers: { 'X-Group-Id': String(groupId) }, params }),
  trend: (groupId: number, params: object) =>
    http.get('/stats/trend', { headers: { 'X-Group-Id': String(groupId) }, params }),
  calendar: (groupId: number, params: object) =>
    http.get('/stats/calendar', { headers: { 'X-Group-Id': String(groupId) }, params }),
};
