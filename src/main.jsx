import React from 'react';
import {createRoot} from 'react-dom/client';
import {WagmiProvider} from 'wagmi';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {walletConfig} from './services';
import App from './App';
import './style.css';
createRoot(document.getElementById('root')).render(<WagmiProvider config={walletConfig} reconnectOnMount={false}><QueryClientProvider client={new QueryClient()}><App/></QueryClientProvider></WagmiProvider>);

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
