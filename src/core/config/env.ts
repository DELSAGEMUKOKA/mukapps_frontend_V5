export const env = {
  API_URL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://mukappss.online/api' : '/api'),
  APP_ENV: import.meta.env.MODE || 'development',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};
