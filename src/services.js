import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors/injected';
import { walletConnect } from 'wagmi/connectors/walletConnect';
import { bsc } from 'wagmi/chains';
import { firebaseConfig, walletConnectProjectId, backendUrl, bnbRpcUrl, configured } from './config';
const app = configured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const authReady = auth ? setPersistence(auth, browserLocalPersistence) : Promise.resolve();
export const db = app ? getFirestore(app) : null;
export async function backendCall(payload) {
  if (!backendUrl) throw new Error('The secure backend is not connected yet. Add its Render URL in src/config.js.');
  const user = auth?.currentUser;
  if (!user) throw new Error('Sign in to Project Vault first.');
  const token = await user.getIdToken();
  const response = await fetch(`${backendUrl.replace(/\/$/, '')}/api/4d`, {
    method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`}, body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The secure backend is unavailable. Try again later or use manual points.');
  return result;
}
export const walletConfig = createConfig({chains:[bsc], multiInjectedProviderDiscovery:true, connectors:[
  injected({target:{id:'metaMask',name:'MetaMask',provider: w => w?.ethereum?.providers?.find(p => p.isMetaMask) || (w?.ethereum?.isMetaMask ? w.ethereum : undefined)},shimDisconnect:true}),
  injected({target:{id:'binance',name:'Binance Wallet',provider:w => w?.binancew3w?.ethereum || w?.BinanceChain || (w?.ethereum?.isBinance ? w.ethereum : undefined)},shimDisconnect:true}),
  injected({shimDisconnect:true}),
  ...(walletConnectProjectId ? [walletConnect({projectId:walletConnectProjectId,metadata:{name:'Project Vault',description:'Personal 4D Labs check-ins',url:window.location.origin,icons:[]},showQrModal:true})] : [])
],transports:{[bsc.id]:http(bnbRpcUrl)}});

