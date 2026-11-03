import {initializeApp}from'firebase/app';
import {browserLocalPersistence,getAuth,setPersistence}from'firebase/auth';
import {getFirestore}from'firebase/firestore';
import {configured,firebaseConfig}from'./config';
const app=configured?initializeApp(firebaseConfig):null;
export const auth=app?getAuth(app):null;
export const authReady=auth?setPersistence(auth,browserLocalPersistence):Promise.resolve();
export const db=app?getFirestore(app):null;
