import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBttVAurq3ybYPmXrbmdef8kBSY6lFYY18",
  authDomain: "business-chatbot-ba9c4.firebaseapp.com",
  projectId: "business-chatbot-ba9c4",
  storageBucket: "business-chatbot-ba9c4.firebasestorage.app",
  messagingSenderId: "507564173554",
  appId: "1:507564173554:web:97560029ccc80d12bd086b",
  measurementId: "G-B66DJ23VL1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();