const encode = bytes => btoa(String.fromCharCode(...bytes));
const decode = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));
async function key(pin, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encryptPassword(password, pin) {
  if (!/^\d{6,}$/.test(pin)) throw new Error('Use a PIN with at least 6 digits.');
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(pin,salt),new TextEncoder().encode(password));
  return JSON.stringify({v:1,salt:encode(salt),iv:encode(iv),data:encode(new Uint8Array(ciphertext))});
}
export async function decryptPassword(payload, pin) {
  try { const p = JSON.parse(payload); return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(p.iv)},await key(pin,decode(p.salt)),decode(p.data))); }
  catch { throw new Error('That PIN could not unlock this password.'); }
}
