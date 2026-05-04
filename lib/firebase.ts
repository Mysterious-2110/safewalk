import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
	apiKey: "AIzaSyA8u_JBtKbCMpjCCyf2usAzgACG4T02Sp0",
	authDomain: "safewalk-f89f3.firebaseapp.com",
	projectId: "safewalk-f89f3",
	storageBucket: "safewalk-f89f3.firebasestorage.app",
	messagingSenderId: "827581747810",
	appId: "1:827581747810:web:81c652d1c588bf3a6ef73b",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
