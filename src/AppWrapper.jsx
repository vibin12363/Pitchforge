import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import App from "./App";
import axios from "axios";

export default function AppWrapper() {
    const [user, setUser] = useState(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            setChecking(false);
            if (u) {
                try {
                    await axios.post("http://127.0.0.1:8000/user/profile", {
                        firebase_uid: u.uid,
                        email: u.email,
                        display_name: u.displayName,
                        photo_url: u.photoURL,
                    });
                } catch (err) {
                    console.error("Profile sync failed:", err);
                }
            }
        });
        return () => unsub();
    }, []);

    if (checking) {
        return (
            <div style={{ minHeight: "100vh", background: "#f1f1ee", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Poppins',system-ui,sans-serif", fontSize: "14px", color: "#7a9a50" }}>
                Loading...
            </div>
        );
    }

    // No forced login — pass user (can be null) to App
    return <App user={user} onLogout={async () => { await signOut(auth); }} onLogin={setUser} />;
}