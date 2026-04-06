import axios from 'axios';

const api = axios.create({ baseURL: '/api/instagram' });

export const checkSession = () => api.get('/session').then(r => r.data);
export const reloadSession = () => api.post('/session/reload').then(r => r.data);
export const logout = () => api.post('/logout').then(r => r.data);

export const runCekilis = (params) => api.post('/cekilis', params).then(r => r.data);
export const previewPost = (postUrl) => api.post('/preview', { postUrl }).then(r => r.data);
