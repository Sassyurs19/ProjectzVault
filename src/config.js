// Paste your Firebase web-app config and WalletConnect project ID here.
export const firebaseConfig = { apiKey: 'AIzaSyDCiqqgePE8L0tFTN4_vW26bGFO5tJE9Pw', authDomain: 'projectzvault.firebaseapp.com', projectId: 'projectzvault', storageBucket: 'projectzvault.firebasestorage.app', messagingSenderId: '802216704510', appId: '1:802216704510:web:9afcf8cd06e57e9db9e8af' };
export const walletConnectProjectId = '';
// The Render address is added after its first deployment, for example:
// https://project-vault-api.onrender.com
export const backendUrl = '';
export const bnbRpcUrl = 'https://bsc-dataseed.binance.org';
export const configured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
