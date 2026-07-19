import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

const G = "#26851d";
const BG = "#f1f1ee";
const SHADOW_OUT = "6px 6px 14px #c8d4b8, -6px -6px 14px #ffffff";
const SHADOW_BTN = "4px 4px 10px #c8d4b8, -4px -4px 10px #ffffff";

export default function Login({ onLogin }) {
    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            onLogin(result.user);
        } catch (err) {
            console.error("Login failed:", err);
            alert("Login failed. Please try again.");
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: BG, fontFamily: "'Poppins',system-ui,sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />

            <div style={{ background: BG, borderRadius: "24px", boxShadow: SHADOW_OUT, padding: "48px 40px", textAlign: "center", maxWidth: "400px", width: "90%" }}>

                {/* Logo */}
                <div style={{ width: "56px", height: "56px", background: G, borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#fff", fontWeight: "700", fontSize: "22px", boxShadow: SHADOW_BTN }}>
                    P
                </div>

                <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#2d3a1a", letterSpacing: "-0.8px", margin: "0 0 8px" }}>
                    Welcome to PitchForge
                </h1>
                <p style={{ fontSize: "14px", color: "#7a9a50", lineHeight: "1.7", margin: "0 0 36px" }}>
                    Sign in to save your pitch decks and access them from any device.
                </p>

                {/* Google Login Button */}
                <button onClick={handleGoogleLogin}
                    style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: BG, color: "#2d3a1a", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", boxShadow: SHADOW_BTN, display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", transition: "all 0.2s" }}>
                    <svg width="20" height="20" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.2 29.2 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5 13 5 4 14 4 25s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
                        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5 16.3 5 9.7 9.3 6.3 14.7z" />
                        <path fill="#4CAF50" d="M24 45c4.9 0 9.3-1.8 12.7-4.8l-5.9-5c-1.8 1.3-4.1 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2l-6.5 5C9.5 40.5 16.2 45 24 45z" />
                        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l5.9 5C40.6 36 44 31 44 25c0-1.3-.1-2.6-.4-3.9z" />
                    </svg>
                    Continue with Google
                </button>

                <p style={{ fontSize: "11px", color: "#aaa", marginTop: "24px", lineHeight: "1.6" }}>
                    By signing in, your pitch decks will be saved securely and synced across all your devices.
                </p>
            </div>
        </div>
    );
}