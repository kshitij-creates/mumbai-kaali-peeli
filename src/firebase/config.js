import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAuca_BbRV27xRnxmPJKJviaSQGj3lfnGo",
    authDomain: "mumbai-kaali-peeli.firebaseapp.com",
    projectId: "mumbai-kaali-peeli",
    storageBucket: "mumbai-kaali-peeli.firebasestorage.app",
    messagingSenderId: "115301776166",
    appId: "1:115301776166:web:bd0087822b76e831351fe7",
    measurementId: "G-XRKK35KYGZ"
  };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "default");