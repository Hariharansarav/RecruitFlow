import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 65000, // 65 seconds wait time for slow backend data rendering
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to catch timeouts and network glitches gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.warn('Backend request timed out after 65s. Please verify backend status.');
    }
    return Promise.reject(error);
  }
);

export default api;
