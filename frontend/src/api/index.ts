import http from './http';

export const authApi = {
  login: (data: { username: string; password: string }) => http.post('/auth/login', data),
  register: (data: { username: string; password: string; displayName?: string }) =>
    http.post('/auth/register', data),
  me: () => http.get('/auth/me'),
};

export const memberApi = {
  list: () => http.get('/members'),
  create: (data: { name: string; relation?: string }) => http.post('/members', data),
  update: (id: number, data: { name: string; relation?: string }) => http.put(`/members/${id}`, data),
  remove: (id: number) => http.delete(`/members/${id}`),
};

export const categoryApi = {
  list: (type?: string) => http.get('/categories', { params: { type } }),
  create: (data: { name: string; type: string; icon?: string; sortOrder?: number }) =>
    http.post('/categories', data),
  update: (id: number, data: object) => http.put(`/categories/${id}`, data),
  remove: (id: number) => http.delete(`/categories/${id}`),
};

export const transactionApi = {
  list: (params: object) => http.get('/transactions', { params }),
  create: (data: object) => http.post('/transactions', data),
  update: (id: number, data: object) => http.put(`/transactions/${id}`, data),
  remove: (id: number) => http.delete(`/transactions/${id}`),
};

export const statsApi = {
  summary: (params: object) => http.get('/stats/summary', { params }),
  byCategory: (params: object) => http.get('/stats/by-category', { params }),
  byMember: (params: object) => http.get('/stats/by-member', { params }),
  trend: (params: object) => http.get('/stats/trend', { params }),
};
