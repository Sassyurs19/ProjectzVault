import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encryptPassword,decryptPassword} from '../src/crypto.js';
import {toFunctionSelector,encodeAbiParameters,decodeAbiParameters} from 'viem';
import {checkInSettings} from '../src/settings.js';
test('reference password is authenticated encrypted and wrong PIN fails',async()=>{const payload=await encryptPassword('test-reference-only','123456');assert.equal(payload.includes('test-reference-only'),false);assert.equal(await decryptPassword(payload,'123456'),'test-reference-only');await assert.rejects(()=>decryptPassword(payload,'654321'));const p=JSON.parse(payload);p.data=p.data.slice(0,-3)+'AAA';await assert.rejects(()=>decryptPassword(JSON.stringify(p),'123456'));});
test('fresh salt and IV for every encryption and reject short PIN',async()=>{const a=await encryptPassword('same','123456'),b=await encryptPassword('same','123456');assert.notEqual(a,b);await assert.rejects(()=>encryptPassword('same','123'));});
test('selector and payload exactly encode checkIn ASN with no extra args',()=>{assert.equal(checkInSettings.selector,toFunctionSelector('checkIn(string)'));const encoded=encodeAbiParameters([{type:'string'}],[checkInSettings.regionCode]);assert.deepEqual(decodeAbiParameters([{type:'string'}],encoded),['ASN']);});
