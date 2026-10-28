import cors from 'cors';
import express from 'express';
import {createRemoteJWKSet, jwtVerify} from 'jose';
import {decodeEventLog, isAddress, keccak256, parseAbi, toBytes} from 'viem';

const base = 'https://dapp.4dlabs.space';
const firebaseProjectId = 'projectzvault';
const maxBody = '20kb';
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean));
const firebaseKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const pointCache = new Map();
const app = express();

app.use(cors({origin(origin, done) {
  if (!origin || allowedOrigins.has(origin)) return done(null, true);
  return done(new Error('Origin is not allowed.'));
}, methods: ['POST'], allowedHeaders: ['Authorization', 'Content-Type'], maxAge: 86400}));
app.use(express.json({limit: maxBody, strict: true}));
app.get('/health', (_req, res) => res.json({ok: true}));

function fail(status, message) { const error = new Error(message); error.status = status; return error; }
async function requireUser(req, _res, next) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return next(fail(401, 'Sign in to Project Vault first.'));
  try {
    const {payload} = await jwtVerify(token, firebaseKeys, {issuer: `https://securetoken.google.com/${firebaseProjectId}`, audience: firebaseProjectId});
    if (!payload.sub || typeof payload.sub !== 'string') throw new Error('No user ID');
    req.user = {uid: payload.sub}; next();
  }
  catch { next(fail(401, 'Your login has expired. Sign in again.')); }
}
async function upstream(path, privyToken) {
  const response = await fetch(base + path, {headers: privyToken ? {Authorization: `Bearer ${privyToken}`} : {}, signal: AbortSignal.timeout(12000)});
  if (!response.ok) throw fail(response.status === 401 || response.status === 403 ? 401 : 503, '4D Labs could not return this data. Refresh your Privy token or use manual points.');
  return response.json();
}
async function currentContract() {
  const config = await upstream('/api/task/task-config');
  const address = (config.data || config)['checkin-contract']?.contract_address;
  if (!isAddress(address || '')) throw fail(503, '4D Labs returned no valid check-in contract. Transactions are paused.');
  return address;
}
function containsWallet(value, wallet) {
  if (typeof value === 'string') return value.toLowerCase() === wallet;
  if (Array.isArray(value)) return value.some(item => containsWallet(item, wallet));
  if (value && typeof value === 'object') return Object.values(value).some(item => containsWallet(item, wallet));
  return false;
}
function scoreFrom(value) {
  for (const item of [value, value?.data, value?.data?.rank, value?.rank]) {
    if (!item || typeof item !== 'object') continue;
    for (const key of ['score', 'total_score', 'totalScore', 'points', 'season_score']) {
      if (item[key] !== undefined && Number.isFinite(Number(item[key])) && Number(item[key]) >= 0) return Number(item[key]);
    }
  }
  throw fail(503, '4D Labs returned an unfamiliar points format. Use manual points until the adapter is updated.');
}
function validPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail(400, 'Invalid request.');
  if (!['config', 'points', 'history'].includes(body.action)) throw fail(400, 'Unknown action.');
  if (body.action !== 'config' && !isAddress(body.walletAddress || '')) throw fail(400, 'A valid public wallet address is required.');
  return body;
}
app.post('/api/4d', requireUser, async (req, res, next) => {
  try {
    const {action, walletAddress, token, fromBlock = '0'} = validPayload(req.body);
    if (action === 'config') return res.json({contractAddress: await currentContract()});
    const wallet = walletAddress.toLowerCase();
    if (action === 'points') {
      if (typeof token !== 'string' || token.length < 20 || token.length > 12000) throw fail(400, 'Paste a current Privy token for this account.');
      const linked = await upstream('/api/profile/linked-accounts', token);
      if (!containsWallet(linked, wallet)) return res.json({linked: false});
      const cacheKey = `${req.user.uid}:${wallet}`;
      const cached = pointCache.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < 600000) return res.json({linked: true, points: cached.points, cached: true});
      const points = scoreFrom(await upstream('/api/rank/me-by-season?season_phase=S1', token));
      pointCache.set(cacheKey, {points, cachedAt: Date.now()});
      return res.json({linked: true, points, cached: false});
    }
    if (!/^\d{1,12}$/.test(String(fromBlock))) throw fail(400, 'Enter a valid start block.');
    const key = process.env.BSCSCAN_API_KEY;
    if (!key) throw fail(503, 'On-chain history needs BSCSCAN_API_KEY in Render.');
    const contract = await currentContract();
    const query = new URLSearchParams({chainid: '56', module: 'logs', action: 'getLogs', fromBlock: String(fromBlock), toBlock: 'latest', address: contract, topic0: keccak256(toBytes('CheckIn(address,string)')), topic0_1_opr: 'and', topic1: '0x' + wallet.slice(2).padStart(64, '0'), page: '1', offset: '1000', apikey: key});
    const response = await fetch('https://api.etherscan.io/v2/api?' + query, {signal: AbortSignal.timeout(15000)});
    const result = await response.json();
    if (result.status === '0' && result.message === 'No records found') return res.json({checkIns: [], more: false});
    if (result.status !== '1' || !Array.isArray(result.result)) throw fail(503, 'Explorer history is unavailable. Check the API key and BNB Chain support.');
    const checkIns = []; let last = Number(fromBlock);
    for (const log of result.result) {
      if (log.address.toLowerCase() !== contract.toLowerCase()) continue;
      const parsed = decodeEventLog({abi: parseAbi(['event CheckIn(address indexed user_addr, string checkIn_location)']), data: log.data, topics: log.topics});
      last = Math.max(last, Number(BigInt(log.blockNumber)));
      if (parsed.args.user_addr.toLowerCase() === wallet && parsed.args.checkIn_location === 'ASN') checkIns.push({date: new Date(Number(BigInt(log.timeStamp)) * 1000).toISOString().slice(0, 10), txHash: log.transactionHash});
    }
    return res.json({checkIns, more: result.result.length === 1000, nextBlock: String(last + 1)});
  } catch (error) { next(error); }
});
app.use((error, _req, res, _next) => res.status(error.status || 503).json({error: error.status ? error.message : 'The secure backend is unavailable. Try again later or use manual points.'}));
app.listen(process.env.PORT || 10000, () => console.log('Project Vault API ready.'));
