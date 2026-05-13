import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyADVkZsFfQKiJaHHu54tD0uEVQns2UEsdY',
  authDomain: 'amarglaom-479e1.firebaseapp.com',
  databaseURL: 'https://amarglaom-479e1-default-rtdb.firebaseio.com',
  projectId: 'amarglaom-479e1',
  storageBucket: 'amarglaom-479e1.firebasestorage.app',
  messagingSenderId: '230656935686',
  appId: '1:230656935686:android:a1e9828ed3787802f18087'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
