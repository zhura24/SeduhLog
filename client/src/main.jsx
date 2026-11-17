import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './styles.css';

registerSW({ immediate: true });

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 3, retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10000), staleTime: 30000 } }
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode><QueryClientProvider client={queryClient}><App /></QueryClientProvider></React.StrictMode>
);
