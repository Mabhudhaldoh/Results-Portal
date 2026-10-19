/// <reference types="vite/client" />
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken() { return localStorage.getItem('token'); }

async function request(method: string, url: string, data?: any) {
  const token = getToken();
  const isFormData = data instanceof FormData;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const options: RequestInit = { method, headers };
  if (data !== undefined && data !== null && method !== 'GET') {
    options.body = isFormData ? data : JSON.stringify(data);
  }

  const res = await fetch(`${BASE_URL}${url}`, options);
  const json = await res.json();

  if (!res.ok) {
    const err: any = new Error(json.message || 'Request failed');
    err.response = { data: json, status: res.status };
    throw err;
  }

  if (json.token) localStorage.setItem('token', json.token);
  if (json.user) localStorage.setItem('user', JSON.stringify(json.user));

  return { data: json };
}

const api = {
  get(url: string) { return request('GET', url); },
  post(url: string, data?: any) { return request('POST', url, data); },
  put(url: string, data?: any) { return request('PUT', url, data); },
  delete(url: string) { return request('DELETE', url); },
};

export default api;
