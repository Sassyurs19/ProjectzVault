import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {isAddress,keccak256,toBytes,decodeEventLog,parseAbi} from 'viem';
initializeApp();
const db=getFirestore(),base='https://dapp.4dlabs.space';
async function upstream(path,token){
 const response=await fetch(base+path,{headers:token?{Authorization:`Bearer ${token}`}:{},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new HttpsError(response.status===401||response.status===403?'unauthenticated':'unavailable','4D Labs could not return this data. Refresh your Privy token or use manual points.');
 return response.json();
}
async function currentContract(){
 const config=await upstream('/api/task/task-config');
 const address=(config.data||config)['checkin-contract']?.contract_address;
 if(!isAddress(address||''))throw new HttpsError('unavailable','4D Labs returned no valid check-in contract. Transactions are paused.');
 return address;
}
function containsWallet(value,wallet){
 if(typeof value==='string')return value.toLowerCase()===wallet;
 if(Array.isArray(value))return value.some(x=>containsWallet(x,wallet));
 if(value&&typeof value==='object')return Object.values(value).some(x=>containsWallet(x,wallet));
 return false;
}
function scoreFrom(value){
 for(const obj of [value,value?.data,value?.data?.rank,value?.rank]){
  if(!obj||typeof obj!=='object')continue;
  for(const key of ['score','total_score','totalScore','points','season_score'])if(obj[key]!==undefined&&obj[key]!==null&&String(obj[key]).trim()!==''&&Number.isFinite(Number(obj[key]))&&Number(obj[key])>=0)return Number(obj[key]);
 }
 throw new HttpsError('unavailable','4D Labs returned an unfamiliar points format. Use manual points until the adapter is updated.');
}
// One callable function. Privy tokens are used in memory only: never logged or stored.
export const fourDLabs=onCall({region:'asia-south1',timeoutSeconds:60,maxInstances:5,cors:true},async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','Sign in to Project Vault first.');
 const {action,walletAddress,token,fromBlock='0'}=request.data||{};
 try{
  if(action==='config')return {contractAddress:await currentContract()};
  if(!isAddress(walletAddress||''))throw new HttpsError('invalid-argument','A valid public wallet address is required.');
  const wallet=walletAddress.toLowerCase();
  if(action==='points'){
   if(typeof token!=='string'||token.length<20||token.length>12000)throw new HttpsError('invalid-argument','Paste a current Privy token for this account.');
   // Always verify token and wallet linkage, even when points are cached.
   const linked=await upstream('/api/profile/linked-accounts',token);
   if(!containsWallet(linked,wallet))return {linked:false};
   const ref=db.doc(`users/${request.auth.uid}/pointsCache/${wallet}`),cached=await ref.get();
   if(cached.exists&&Date.now()-cached.data().cachedAt<600000)return {linked:true,points:cached.data().points,cached:true};
   const points=scoreFrom(await upstream('/api/rank/me-by-season?season_phase=S1',token));
   await ref.set({points,cachedAt:Date.now()});
   return {linked:true,points,cached:false};
  }
  if(action==='history'){
   if(!/^\d{1,12}$/.test(String(fromBlock)))throw new HttpsError('invalid-argument','Enter a valid start block.');
   const key=process.env.BSCSCAN_API_KEY;
   if(!key)throw new HttpsError('failed-precondition','Set BSCSCAN_API_KEY for the Cloud Function to enable on-chain imports.');
   const contract=await currentContract();
   const query=new URLSearchParams({chainid:'56',module:'logs',action:'getLogs',fromBlock:String(fromBlock),toBlock:'latest',address:contract,topic0:keccak256(toBytes('CheckIn(address,string)')),topic0_1_opr:'and',topic1:'0x'+wallet.slice(2).padStart(64,'0'),page:'1',offset:'1000',apikey:key});
   const response=await fetch('https://api.etherscan.io/v2/api?'+query,{signal:AbortSignal.timeout(15000)});
   const result=await response.json();
   if(result.status==='0'&&result.message==='No records found')return {checkIns:[],more:false};
   if(result.status!=='1'||!Array.isArray(result.result))throw new HttpsError('unavailable','Explorer history unavailable. Check API key and BNB Chain plan support.');
   const checkIns=[];let last=Number(fromBlock);
   for(const log of result.result){
    if(log.address.toLowerCase()!==contract.toLowerCase())continue;
    const parsed=decodeEventLog({abi:parseAbi(['event CheckIn(address indexed user_addr, string checkIn_location)']),data:log.data,topics:log.topics});
    last=Math.max(last,Number(BigInt(log.blockNumber)));
    if(parsed.args.user_addr.toLowerCase()!==wallet||parsed.args.checkIn_location!=='ASN')continue;
    checkIns.push({date:new Date(Number(BigInt(log.timeStamp))*1000).toISOString().slice(0,10),txHash:log.transactionHash});
   }
   return {checkIns,more:result.result.length===1000,nextBlock:String(last+1)};
  }
  throw new HttpsError('invalid-argument','Unknown action.');
 }catch(error){if(error instanceof HttpsError)throw error;throw new HttpsError('unavailable','The upstream service is unavailable. Try again later or use manual points.');}
});
