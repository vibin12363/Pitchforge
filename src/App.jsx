import { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import PptxGenJS from "pptxgenjs";
import { auth } from "./firebase";
import EditableResult from "./EditableResult";
import InputFlow from "./InputFlow";
import logo from "./assets/ChatGPT_Genearted.png";



const TONES = ["persuasive", "formal", "visionary", "technical"];
const DECK_TYPES = ["investor", "academic", "internal", "partnership"];
const STEPS = [
  "Analyzing your business idea…",
  "Extracting key components…",
  "Running SWOT analysis…",
  "Calculating financials…",
  "Building your pitch deck…",
];
const THEMES = [
  { id: "olive", name: "Olive", primary: "#26851d", bg: "#f1f1ee", shadowOut: "6px 6px 14px #c8d4b8, -6px -6px 14px #ffffff", shadowIn: "inset 4px 4px 10px #c8d4b8, inset -4px -4px 10px #ffffff", shadowBtn: "4px 4px 10px #c8d4b8, -4px -4px 10px #ffffff" },
  { id: "navy", name: "Navy", primary: "#1a3a6b", bg: "#f0f2f8", shadowOut: "6px 6px 14px #c0c8e0, -6px -6px 14px #ffffff", shadowIn: "inset 4px 4px 10px #c0c8e0, inset -4px -4px 10px #ffffff", shadowBtn: "4px 4px 10px #c0c8e0, -4px -4px 10px #ffffff" },
  { id: "crimson", name: "Crimson", primary: "#8b1a1a", bg: "#f8f0f0", shadowOut: "6px 6px 14px #dfc8c8, -6px -6px 14px #ffffff", shadowIn: "inset 4px 4px 10px #dfc8c8, inset -4px -4px 10px #ffffff", shadowBtn: "4px 4px 10px #dfc8c8, -4px -4px 10px #ffffff" },
  { id: "midnight", name: "Midnight", primary: "#2c2c54", bg: "#f0f0f8", shadowOut: "6px 6px 14px #c8c8e0, -6px -6px 14px #ffffff", shadowIn: "inset 4px 4px 10px #c8c8e0, inset -4px -4px 10px #ffffff", shadowBtn: "4px 4px 10px #c8c8e0, -4px -4px 10px #ffffff" },
];

const menuBtnStyle = {
  display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
  background: "none", border: "none", borderRadius: "6px", fontSize: "13px",
  color: "#2d3a1a", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif",
  fontWeight: "500",
};

export default function App({ user, onLogout, onLogin }) {
  const [idea, setIdea] = useState("");
  const [tone, setTone] = useState("persuasive");
  const [deckType, setDeckType] = useState("investor");
  const [theme, setTheme] = useState(THEMES[0]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebar, setDesktopSidebar] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [showAuth, setShowAuth] = useState(null);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatPhase, setChatPhase] = useState("idea");
  const [chatQuestions, setChatQuestions] = useState([]);
  const [chatAnswers, setChatAnswers] = useState({});
  const [chatCurrentQ, setChatCurrentQ] = useState(0);
  const [chatShowTone, setChatShowTone] = useState(false);
  const [chatShowDeck, setChatShowDeck] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [myExports, setMyExports] = useState([]);
  const [showExports, setShowExports] = useState(false);
  const [undoStack, setUndoStack] = useState([]);

  const G = theme.primary;
  const BG = theme.bg;
  const SHADOW_OUT = theme.shadowOut;
  const SHADOW_IN = theme.shadowIn;
  const SHADOW_BTN = theme.shadowBtn;

  useEffect(() => {
    if (user) {
      // Load history from MongoDB
      axios.get(`http://127.0.0.1:8000/decks/${user.uid}`)
        .then(res => {
          const decks = res.data.decks.map(d => ({
            id: d._id,
            title: d.title,
            idea: d.idea,
            tone: d.tone,
            deckType: d.deck_type,
            data: d.data,
            timestamp: d.created_at,
            chatMessages: d.chat_messages || [],
            chatQuestions: d.chat_questions || [],   // ← ADD
            chatAnswers: d.chat_answers || {},       // ← ADD
          }));
          setHistory(decks);
        })
        .catch(() => setHistory([]));

      // Restore in-progress chat
      const saved = localStorage.getItem(`inProgress_${user.uid}`);
      if (saved) {
        try {
          const state = JSON.parse(saved);
          if (state.chatMessages?.length > 0) {
            const resume = window.confirm(
              "You have an unfinished pitch deck session. Would you like to continue where you left off?"
            );
            if (resume) {
              setChatMessages(state.chatMessages);
              setChatPhase(state.chatPhase);
              setChatAnswers(state.chatAnswers || {});
              setChatCurrentQ(state.chatCurrentQ || 0);
              setChatQuestions(state.chatQuestions || []);
              setChatShowTone(state.chatShowTone || false);
              setChatShowDeck(state.chatShowDeck || false);
              if (state.idea) setIdea(state.idea);
              if (state.tone) setTone(state.tone);
              if (state.deckType) setDeckType(state.deckType);
            } else {
              localStorage.removeItem(`inProgress_${user.uid}`);
            }
          }
        } catch {
          localStorage.removeItem(`inProgress_${user.uid}`);
        }
      }
    } else {
      setHistory([]);
    }
  }, [user]);

  const setResultWithUndo = (updater) => {
    setResult(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (prev && !prev._streaming) {
        setUndoStack(stack => [...stack.slice(-9), prev]); // keep last 10
      }
      return next;
    });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(stack => stack.slice(0, -1));
    setResult(last);
  };

  const saveToHistory = async (newResult, newIdea, newTone, newDeckType, id = null) => {
    if (!user) return Date.now();
    try {
      const payload = {
        user_id: user.uid,
        title: newResult.title,
        idea: newIdea,
        tone: newTone,
        deck_type: newDeckType,
        data: newResult,
        chat_messages: chatMessages, // ← ADD THIS
        chat_questions: chatQuestions,   // ← ADD
        chat_answers: chatAnswers,
      };
      if (id) {
        await axios.put(`http://127.0.0.1:8000/decks/update/${id}`, payload);
        setHistory(prev => prev.map(h => h.id === id ? { ...h, title: newResult.title, data: newResult, tone: newTone, deckType: newDeckType, chatMessages: chatMessages } : h));
        return id;
      } else {
        const res = await axios.post("http://127.0.0.1:8000/decks/save", payload);
        const newId = res.data.deck_id;
        const newEntry = { id: newId, title: newResult.title, data: newResult, idea: newIdea, tone: newTone, deckType: newDeckType, chatMessages: chatMessages };
        setHistory(prev => [newEntry, ...prev]);
        return newId;
      }
    } catch (err) {
      console.error("Save error:", err);
      return id || Date.now();
    }
  };

  const fetchMyExports = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`http://127.0.0.1:8000/exports/${user.uid}`);
      setMyExports(res.data.exports);
    } catch { setMyExports([]); }
  };



  const openUserPopup = async () => {
    setShowUserPopup(p => !p);
    if (user && !userProfile) {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/user/profile/${user.uid}`);
        setUserProfile(res.data);
      } catch { }
    }
  };

  const handleGenerate = async (answers = {}) => {
    if (idea.trim().length < 10) return;
    setLoading(true); setError(""); setResult(null); setStep(0);
    const iv = setInterval(() => setStep(p => Math.min(p + 1, STEPS.length - 1)), 900);
    try {
      const response = await fetch("http://127.0.0.1:8000/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, tone, deck_type: deckType, answers }),
      });
      if (!response.ok) throw new Error("stream failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      // Live preview: extract fields as they stream in
      const extractField = (text, field) => {
        const m = text.match(new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
        return m ? m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : null;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });

        // Build partial preview from streamed text
        const partial = {};
        ["title", "tagline", "problem", "solution", "target_audience", "market_size", "business_model", "go_to_market", "call_to_action"].forEach(f => {
          const v = extractField(fullText, f);
          if (v) partial[f] = v;
        });
        if (partial.title) {
          setResult(prev => ({
            competitors: [], swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
            financials: {}, improvements: [], similar_startups: [],
            ...prev, ...partial, _streaming: true,
          }));
        }
      }

      // Stream finished — parse the complete JSON
      // Stream finished — parse the complete JSON
      let data;
      try {
        let text = fullText.trim();
        if (text.startsWith("```")) text = text.split("```json").pop().split("```")[0].trim();
        // Find the JSON object boundaries in case extra text surrounds it
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
        data = JSON.parse(text);
      } catch (parseErr) {
        console.warn("Stream parse failed, falling back to normal generate:", parseErr);
        const res = await axios.post("http://127.0.0.1:8000/generate", { idea, tone, deck_type: deckType, answers });
        data = res.data;
      }
      setResult(data);
      setResult(data);
      if (user) localStorage.removeItem(`inProgress_${user.uid}`);
      clearInterval(iv);
      setLoading(false);
      try {
        await axios.put(`http://127.0.0.1:8000/user/profile/increment/${user.uid}`);
        setUserProfile(prev => prev ? { ...prev, decks_generated: (prev.decks_generated || 0) + 1 } : prev);
      } catch { }
      try {
        const newId = await saveToHistory(data, idea, tone, deckType, activeId);
        setActiveId(newId);
      } catch (saveErr) { console.error("Save error:", saveErr); }
    } catch (err) {
      console.error(err);
      setError("Backend not running. Start the server and try again.");
      clearInterval(iv);
      setLoading(false);
    }
  };

  const uploadExportToCloud = async (fileBlob, fileType) => {
    if (!user || !activeId) return;
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result.split(",")[1];
        await axios.post("http://127.0.0.1:8000/exports/upload", {
          user_id: user.uid,
          deck_id: String(activeId),
          title: result.title,
          file_type: fileType,
          file_data: base64Data,
        });
        console.log(`${fileType.toUpperCase()} uploaded to cloud`);
      };
      reader.readAsDataURL(fileBlob);
    } catch (err) {
      console.error("Cloud upload failed:", err);
    }
  };


  const loadChat = (item) => {
    setResult(item.data);
    setIdea(item.idea);
    setTone(item.tone);
    setDeckType(item.deckType);
    setUndoStack([]);
    setActiveId(item.id);
    setSidebarOpen(false);
    // Restore full chat messages if available
    if (item.chatMessages && item.chatMessages.length > 0) {
      setChatMessages(item.chatMessages);
      setChatPhase("generating");
    } else {
      setChatMessages([
        { id: "user_idea", sender: "user", text: item.idea },
        { id: "ai_done", sender: "ai", text: `Pitch deck "${item.title}" generated successfully!` },
      ]);
      setChatPhase("generating");
    }
    setChatAnswers(item.chatAnswers || {});
    setChatQuestions(item.chatQuestions || []);
    setChatCurrentQ(0);
    setChatShowTone(false);
    setChatShowDeck(false);
  };

  const startNewChat = () => {
    if (!user) { setShowAuth("login"); return; }
    setResult(null);
    setLoading(false);      // ← ADD
    setError("");
    setIdea("");
    setTone("persuasive");
    setDeckType("investor");
    setActiveId(null);
    setSidebarOpen(false);
    setChatMessages([]);
    setChatPhase("idea");
    setChatQuestions([]);
    setChatAnswers({});
    setChatCurrentQ(0);
    setChatShowTone(false);
    setChatShowDeck(false);
    setUndoStack([]);
    if (user) localStorage.removeItem(`inProgress_${user.uid}`);
  };




  const deleteChat = async (id) => {
    if (user) {
      try {
        await axios.delete(`http://127.0.0.1:8000/decks/${user.uid}/${id}`);
      } catch (err) { console.error("Delete failed:", err); }
    }
    setHistory(prev => prev.filter(h => h.id !== id));
    if (activeId === id) startNewChat();
    setContextMenu(null);
  };

  const startRename = (item) => {
    setRenamingId(item.id);
    setRenameValue(item.title);
    setContextMenu(null);
  };

  const confirmRename = async (id) => {
    const newTitle = renameValue.trim();
    if (!newTitle) { setRenamingId(null); return; }
    if (user) {
      try {
        await axios.put("http://127.0.0.1:8000/decks/rename", {
          user_id: user.uid,
          deck_id: id,
          title: newTitle,
        });
      } catch (err) { console.error("Rename failed:", err); }
    }
    setHistory(prev => prev.map(h => h.id === id ? { ...h, title: newTitle } : h));
    setRenamingId(null);
  };

  const shareChat = (item) => {
    const summary = `${item.title}\n\nProblem: ${item.data.problem}\nSolution: ${item.data.solution}\n\nGenerated by PitchForge AI`;
    navigator.clipboard.writeText(summary);
    setContextMenu(null);
    alert("Pitch deck summary copied to clipboard!");
  };

  const openContextMenu = (e, id) => {
    e.preventDefault();
    const menuW = 170; const menuH = 130;
    let x = e.clientX; let y = e.clientY;
    if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 10;
    if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 10;
    setContextMenu({ id, x, y });
  };

  let pressTimer = null;
  const handleTouchStart = (e, id) => {
    const touch = e.touches[0];
    pressTimer = setTimeout(() => {
      openContextMenu({ preventDefault: () => { }, clientX: touch.clientX, clientY: touch.clientY }, id);
    }, 500);
  };
  const handleTouchEnd = () => { if (pressTimer) clearTimeout(pressTimer); };

  useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Save in-progress chat to localStorage
  useEffect(() => {
    if (!user) return;
    if (chatPhase === "generating" && !loading && result) {
      localStorage.removeItem(`inProgress_${user.uid}`);
      return;
    }
    if (chatMessages.length > 0) {
      const state = {
        chatMessages,
        chatPhase,
        chatAnswers,
        chatCurrentQ,
        chatQuestions,
        chatShowTone,
        chatShowDeck,
        idea,
        tone,
        deckType,
      };
      localStorage.setItem(`inProgress_${user.uid}`, JSON.stringify(state));
    }
  }, [chatMessages, chatPhase, chatAnswers, chatCurrentQ, chatQuestions, chatShowTone, chatShowDeck]);

  // ── ADD NEW AUTOSAVE BLOCK HERE ──
  useEffect(() => {
    if (!result || !user || !activeId || result._streaming) return;
    const timer = setTimeout(() => {
      saveToHistory(result, idea, tone, deckType, activeId);
    }, 2000);
    return () => clearTimeout(timer);
  }, [result, chatMessages, chatAnswers]);


  // ── PASTE THESE TWO FUNCTIONS INTO YOUR App.jsx ──────────────────────────────
  // Replace your existing exportPDF and exportPPTX functions with these two

  const exportPPTX = () => {
    if (!result) return;
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    const W = 13.33; const H = 7.5;

    // Theme colors
    const hex = theme.primary.replace("#", "");
    const PCLR = hex;
    const PDARK = (() => {
      const r = parseInt(hex.slice(0, 2), 16); const g = parseInt(hex.slice(2, 4), 16); const b = parseInt(hex.slice(4, 6), 16);
      return [Math.max(0, r - 40), Math.max(0, g - 40), Math.max(0, b - 40)].map(v => v.toString(16).padStart(2, "0")).join("");
    })();
    const PLIGHT = (() => {
      const r = parseInt(hex.slice(0, 2), 16); const g = parseInt(hex.slice(2, 4), 16); const b = parseInt(hex.slice(4, 6), 16);
      return [Math.min(255, r + 180), Math.min(255, g + 180), Math.min(255, b + 180)].map(v => v.toString(16).padStart(2, "0")).join("");
    })();
    const WHITE = "FFFFFF"; const DARK = "1E1E2E"; const GRAY = "6B7280"; const LGRAY = "F3F4F6";

    const addSlide = (bg = WHITE) => {
      const s = pptx.addSlide();
      s.background = { color: bg };
      return s;
    };

    const slideTitle = (s, title, light = false) => {
      s.addText(title, { x: 0.5, y: 0.25, w: W - 1, h: 0.65, fontSize: 28, bold: true, color: light ? WHITE : DARK, fontFace: "Calibri" });
    };

    const wm = (s, light = false) => {
      s.addText("PitchForge AI", { x: W - 1.8, y: H - 0.35, w: 1.6, h: 0.28, fontSize: 8, color: light ? "rgba(255,255,255,0.4)" : "CCCCCC", italic: true, fontFace: "Calibri", align: "right" });
    };

    // ── SLIDE 1 — COVER ──────────────────────────────────────────
    const s1 = addSlide(PDARK);
    // Big decorative circle
    s1.addShape(pptx.ShapeType.ellipse, { x: 8.5, y: -1.5, w: 6, h: 6, fill: { color: PCLR }, line: { color: PCLR }, transparency: 70 });
    s1.addShape(pptx.ShapeType.ellipse, { x: 9.5, y: -0.5, w: 4, h: 4, fill: { color: PCLR }, line: { color: PCLR }, transparency: 50 });
    // Deck type badge
    s1.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 1.0, w: 2.2, h: 0.38, fill: { color: PCLR }, line: { color: PCLR }, rectRadius: 0.08 });
    s1.addText(deckType.toUpperCase() + " PITCH DECK", { x: 0.6, y: 1.0, w: 2.2, h: 0.38, fontSize: 9, bold: true, color: WHITE, align: "center", fontFace: "Calibri" });
    // Title
    s1.addText(result.title, { x: 0.6, y: 1.6, w: 8.0, h: 2.2, fontSize: 42, bold: true, color: WHITE, fontFace: "Calibri", valign: "middle" });
    // Tagline
    if (result.tagline) {
      s1.addText(`"${result.tagline}"`, { x: 0.6, y: 3.9, w: 7.5, h: 0.5, fontSize: 16, italic: true, color: PLIGHT, fontFace: "Calibri" });
    }
    // Meta
    s1.addText(`Theme: ${theme.name}  ·  Tone: ${tone}`, { x: 0.6, y: 4.6, w: 7.0, h: 0.3, fontSize: 11, color: "AAAAAA", fontFace: "Calibri" });
    // Logo placeholder
    s1.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 5.2, w: 1.4, h: 1.4, fill: { color: PCLR }, line: { color: PCLR }, rectRadius: 0.15 });
    s1.addText("LOGO", { x: 0.6, y: 5.2, w: 1.4, h: 1.4, fontSize: 12, bold: true, color: WHITE, align: "center", valign: "middle", fontFace: "Calibri" });
    // Bottom bar
    s1.addShape(pptx.ShapeType.rect, { x: 0, y: H - 0.4, w: W, h: 0.4, fill: { color: PCLR }, line: { color: PCLR } });
    s1.addText("Generated by PitchForge AI  ·  Powered by Groq × LLaMA 3.3 70B", { x: 0.5, y: H - 0.38, w: W - 1, h: 0.34, fontSize: 9, color: WHITE, align: "center", fontFace: "Calibri" });

    // ── SLIDE 2 — PROBLEM ────────────────────────────────────────
    const s2 = addSlide();
    s2.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.1, fill: { color: PDARK }, line: { color: PDARK } });
    slideTitle(s2, "🎯  The Problem", true);
    wm(s2);
    // Split problem into bullet points
    const problemPoints = result.problem.split(/[.!?]+/).filter(s => s.trim().length > 10).slice(0, 5);
    const icons = ["⚠️", "📉", "❌", "🔴", "⛔"];
    problemPoints.forEach((point, i) => {
      const y = 1.3 + i * 1.1;
      s2.addShape(pptx.ShapeType.roundRect, { x: 0.5, y, w: W - 1, h: 0.9, fill: { color: LGRAY }, line: { color: "E5E7EB" }, rectRadius: 0.1 });
      s2.addText(icons[i] || "•", { x: 0.7, y: y + 0.15, w: 0.6, h: 0.6, fontSize: 20, align: "center", fontFace: "Calibri" });
      s2.addText(point.trim(), { x: 1.5, y: y + 0.18, w: W - 2.2, h: 0.55, fontSize: 14, color: DARK, fontFace: "Calibri", valign: "middle" });
    });

    // ── SLIDE 3 — SOLUTION ───────────────────────────────────────
    const s3 = addSlide();
    s3.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.1, fill: { color: PDARK }, line: { color: PDARK } });
    slideTitle(s3, "💡  Our Solution", true);
    wm(s3);
    // Left column — features
    const solPoints = result.solution.split(/[.!?]+/).filter(s => s.trim().length > 8).slice(0, 4);
    const checkIcons = ["✅", "✅", "✅", "✅"];
    solPoints.forEach((point, i) => {
      const y = 1.3 + i * 1.3;
      s3.addShape(pptx.ShapeType.roundRect, { x: 0.5, y, w: 7.0, h: 1.1, fill: { color: LGRAY }, line: { color: "E5E7EB" }, rectRadius: 0.12 });
      s3.addText(checkIcons[i], { x: 0.7, y: y + 0.2, w: 0.7, h: 0.7, fontSize: 22, align: "center", fontFace: "Calibri" });
      s3.addText(point.trim(), { x: 1.6, y: y + 0.22, w: 5.7, h: 0.65, fontSize: 13, color: DARK, fontFace: "Calibri", valign: "middle" });
    });
    // Right column — value prop box
    s3.addShape(pptx.ShapeType.roundRect, { x: 7.8, y: 1.3, w: 5.0, h: 5.5, fill: { color: PCLR }, line: { color: PCLR }, rectRadius: 0.15 });
    s3.addText("Value\nProposition", { x: 7.8, y: 1.5, w: 5.0, h: 1.0, fontSize: 18, bold: true, color: WHITE, align: "center", fontFace: "Calibri" });
    s3.addText(result.solution.slice(0, 200), { x: 8.0, y: 2.7, w: 4.6, h: 3.8, fontSize: 12, color: WHITE, fontFace: "Calibri", valign: "top", wrap: true });

    // ── SLIDE 4 — MARKET OPPORTUNITY ────────────────────────────
    const s4 = addSlide();
    s4.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.1, fill: { color: PDARK }, line: { color: PDARK } });
    slideTitle(s4, "📊  Market Opportunity", true);
    wm(s4);
    // TAM SAM SOM funnel
    const mktText = result.market_size;
    const tamMatch = mktText.match(/Total potential customers[:\s]+([^.]+)/i);
    const samMatch = mktText.match(/realistically reach[:\s]+([^.]+)/i);
    const somMatch = mktText.match(/year 1[:\s]+([^.]+)/i);
    const tam = tamMatch ? tamMatch[1].trim() : "Total potential customers";
    const sam = samMatch ? samMatch[1].trim() : "Customers you can reach";
    const som = somMatch ? somMatch[1].trim() : "Year 1 target";

    // Funnel boxes
    [
      { label: "TAM", sub: "Total Addressable Market", value: tam, w: 8.0, x: 2.65, y: 1.3, color: PDARK },
      { label: "SAM", sub: "Serviceable Addressable Market", value: sam, w: 6.0, x: 3.65, y: 3.0, color: PCLR },
      { label: "SOM", sub: "Serviceable Obtainable Market", value: som, w: 4.0, x: 4.65, y: 4.7, color: "22C55E" },
    ].forEach(({ label, sub, value, w: bw, x, y, color }) => {
      s4.addShape(pptx.ShapeType.roundRect, { x, y, w: bw, h: 1.4, fill: { color }, line: { color }, rectRadius: 0.1 });
      s4.addText(label, { x, y: y + 0.1, w: bw, h: 0.45, fontSize: 18, bold: true, color: WHITE, align: "center", fontFace: "Calibri" });
      s4.addText(value, { x, y: y + 0.55, w: bw, h: 0.4, fontSize: 13, color: WHITE, align: "center", fontFace: "Calibri" });
      s4.addText(sub, { x, y: y + 0.95, w: bw, h: 0.3, fontSize: 9, color: "DDDDDD", align: "center", fontFace: "Calibri" });
    });
    // Audience box
    s4.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.3, w: 2.0, h: 4.8, fill: { color: LGRAY }, line: { color: "E5E7EB" }, rectRadius: 0.1 });
    s4.addText("TARGET\nAUDIENCE", { x: 0.5, y: 1.5, w: 2.0, h: 0.6, fontSize: 9, bold: true, color: GRAY, align: "center", fontFace: "Calibri" });
    s4.addText(result.target_audience.slice(0, 150), { x: 0.6, y: 2.2, w: 1.8, h: 3.5, fontSize: 10, color: DARK, fontFace: "Calibri", valign: "top", wrap: true });

    // ── SLIDE 5 — BUSINESS MODEL ─────────────────────────────────
    const s5 = addSlide();
    s5.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.1, fill: { color: PDARK }, line: { color: PDARK } });
    slideTitle(s5, "💼  Business Model", true);
    wm(s5);
    const bmPoints = result.business_model.split(/[.!?]+/).filter(s => s.trim().length > 8).slice(0, 6);
    const bmColors = [PCLR, PDARK, "16A34A", "D97706", "2563EB", "9333EA"];
    const bmIcons = ["💰", "📱", "🚚", "📣", "🤝", "⭐"];
    bmPoints.forEach((point, i) => {
      const col = i % 3; const row = Math.floor(i / 3);
      const x = 0.5 + col * 4.3; const y = 1.3 + row * 2.8;
      s5.addShape(pptx.ShapeType.roundRect, { x, y, w: 4.0, h: 2.5, fill: { color: LGRAY }, line: { color: "E5E7EB" }, rectRadius: 0.15 });
      s5.addShape(pptx.ShapeType.ellipse, { x: x + 1.5, y: y + 0.15, w: 1.0, h: 1.0, fill: { color: bmColors[i] }, line: { color: bmColors[i] } });
      s5.addText(bmIcons[i], { x: x + 1.5, y: y + 0.2, w: 1.0, h: 0.9, fontSize: 22, align: "center", fontFace: "Calibri" });
      s5.addText(point.trim().slice(0, 80), { x: x + 0.15, y: y + 1.3, w: 3.7, h: 1.0, fontSize: 11, color: DARK, fontFace: "Calibri", valign: "top", wrap: true, align: "center" });
    });

    // ── SLIDE 6 — COMPETITIVE ANALYSIS ──────────────────────────
    const s6 = addSlide();
    s6.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.1, fill: { color: PDARK }, line: { color: PDARK } });
    slideTitle(s6, "⚔️  Competitive Analysis", true);
    wm(s6);
    const competitors = result.competitors.slice(0, 3);
    const features = ["Direct Selling", "AI Features", "Local Focus", "Low Commission", "User Friendly"];
    const colW = 2.2; const startX = 3.2;
    // Header row
    s6.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.2, w: 2.5, h: 0.55, fill: { color: LGRAY }, line: { color: "E5E7EB" }, rectRadius: 0.05 });
    s6.addText("FEATURE", { x: 0.5, y: 1.2, w: 2.5, h: 0.55, fontSize: 10, bold: true, color: GRAY, align: "center", fontFace: "Calibri" });
    // Our product header
    s6.addShape(pptx.ShapeType.roundRect, { x: startX, y: 1.2, w: colW, h: 0.55, fill: { color: PCLR }, line: { color: PCLR }, rectRadius: 0.05 });
    s6.addText("OUR PRODUCT", { x: startX, y: 1.2, w: colW, h: 0.55, fontSize: 10, bold: true, color: WHITE, align: "center", fontFace: "Calibri" });
    // Competitor headers
    competitors.forEach((comp, i) => {
      const x = startX + colW + 0.1 + i * (colW + 0.1);
      s6.addShape(pptx.ShapeType.roundRect, { x, y: 1.2, w: colW, h: 0.55, fill: { color: LGRAY }, line: { color: "E5E7EB" }, rectRadius: 0.05 });
      s6.addText(comp.slice(0, 12), { x, y: 1.2, w: colW, h: 0.55, fontSize: 10, bold: true, color: GRAY, align: "center", fontFace: "Calibri" });
    });
    // Feature rows
    features.forEach((feat, fi) => {
      const y = 1.9 + fi * 0.95;
      const rowBg = fi % 2 === 0 ? WHITE : LGRAY;
      s6.addShape(pptx.ShapeType.rect, { x: 0.5, y, w: 2.5, h: 0.85, fill: { color: rowBg }, line: { color: "E5E7EB" } });
      s6.addText(feat, { x: 0.6, y, w: 2.3, h: 0.85, fontSize: 12, color: DARK, fontFace: "Calibri", valign: "middle" });
      // Our product — always check
      s6.addShape(pptx.ShapeType.rect, { x: startX, y, w: colW, h: 0.85, fill: { color: rowBg }, line: { color: "E5E7EB" } });
      s6.addText("✅", { x: startX, y, w: colW, h: 0.85, fontSize: 18, align: "center", fontFace: "Calibri", valign: "middle" });
      // Competitors — alternate checks
      competitors.forEach((_, ci) => {
        const x = startX + colW + 0.1 + ci * (colW + 0.1);
        const hasIt = (fi + ci) % 3 !== 0;
        s6.addShape(pptx.ShapeType.rect, { x, y, w: colW, h: 0.85, fill: { color: rowBg }, line: { color: "E5E7EB" } });
        s6.addText(hasIt ? "✅" : "❌", { x, y, w: colW, h: 0.85, fontSize: 18, align: "center", fontFace: "Calibri", valign: "middle" });
      });
    });

    // ── SLIDE 7 — SWOT ───────────────────────────────────────────
    const s7 = addSlide();
    s7.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.1, fill: { color: PDARK }, line: { color: PDARK } });
    slideTitle(s7, "🔍  SWOT Analysis", true);
    wm(s7);
    [
      { label: "STRENGTHS", key: "strengths", color: "16A34A", bg: "F0FDF4", x: 0.4, y: 1.2 },
      { label: "WEAKNESSES", key: "weaknesses", color: "DC2626", bg: "FEF2F2", x: 7.0, y: 1.2 },
      { label: "OPPORTUNITIES", key: "opportunities", color: "2563EB", bg: "EFF6FF", x: 0.4, y: 4.3 },
      { label: "THREATS", key: "threats", color: "D97706", bg: "FFFBEB", x: 7.0, y: 4.3 },
    ].forEach(({ label, key, color, bg, x, y }) => {
      s7.addShape(pptx.ShapeType.roundRect, { x, y, w: 6.2, h: 2.8, fill: { color: bg }, line: { color: "E5E7EB" }, rectRadius: 0.12 });
      s7.addText(label, { x: x + 0.2, y: y + 0.15, w: 5.8, h: 0.4, fontSize: 12, bold: true, color, fontFace: "Calibri" });
      s7.addText(result.swot[key].map(i => `• ${i}`).join("\n"), { x: x + 0.2, y: y + 0.6, w: 5.8, h: 2.0, fontSize: 12, color: DARK, fontFace: "Calibri", valign: "top" });
    });

    // ── SLIDE 8 — FINANCIALS ─────────────────────────────────────
    const s8 = addSlide();
    s8.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.1, fill: { color: PDARK }, line: { color: PDARK } });
    slideTitle(s8, "💰  Financial Projection", true);
    wm(s8);
    const fins = [
      { label: "Startup Cost", value: result.financials.startup_cost, color: "DC2626" },
      { label: "Monthly Revenue", value: result.financials.monthly_revenue, color: "16A34A" },
      { label: "Monthly Expenses", value: result.financials.monthly_expenses, color: "D97706" },
      { label: "Profit / Loss", value: result.financials.profit_loss, color: "2563EB" },
      { label: "Break Even", value: result.financials.break_even, color: PCLR },
    ];
    // Bar chart (visual)
    const maxBarH = 3.5; const barW = 1.6; const barGap = 0.4; const barStartX = 0.8; const barBaseY = 5.8;
    fins.forEach((fin, i) => {
      const barH = maxBarH * (0.4 + i * 0.12);
      const x = barStartX + i * (barW + barGap);
      const y = barBaseY - barH;
      s8.addShape(pptx.ShapeType.roundRect, { x, y, w: barW, h: barH, fill: { color: fin.color }, line: { color: fin.color }, rectRadius: 0.08 });
      s8.addText(fin.value.toString().slice(0, 14), { x: x - 0.1, y: y - 0.35, w: barW + 0.2, h: 0.32, fontSize: 9, bold: true, color: fin.color, align: "center", fontFace: "Calibri" });
      s8.addText(fin.label, { x: x - 0.1, y: barBaseY + 0.05, w: barW + 0.2, h: 0.5, fontSize: 9, color: GRAY, align: "center", fontFace: "Calibri", wrap: true });
    });
    // Funding required box
    s8.addShape(pptx.ShapeType.roundRect, { x: 10.0, y: 1.3, w: 2.8, h: 4.5, fill: { color: PCLR }, line: { color: PCLR }, rectRadius: 0.15 });
    s8.addText("FUNDING\nREQUIRED", { x: 10.0, y: 1.5, w: 2.8, h: 0.8, fontSize: 13, bold: true, color: WHITE, align: "center", fontFace: "Calibri" });
    s8.addText("Estimated based\non projections", { x: 10.1, y: 2.5, w: 2.6, h: 0.6, fontSize: 10, color: "DDDDDD", align: "center", fontFace: "Calibri", italic: true });
    // Funding allocation donuts (visual circles)
    [
      { label: "Product Dev", pct: "40%", color: "16A34A", y: 3.3 },
      { label: "Marketing", pct: "30%", color: "D97706", y: 4.1 },
      { label: "Operations", pct: "20%", color: "2563EB", y: 4.9 },
      { label: "Hiring", pct: "10%", color: "9333EA", y: 5.7 },
    ].forEach(({ label, pct, color, y }) => {
      s8.addShape(pptx.ShapeType.ellipse, { x: 10.15, y, w: 0.45, h: 0.45, fill: { color }, line: { color } });
      s8.addText(`${pct} ${label}`, { x: 10.7, y: y + 0.05, w: 2.0, h: 0.35, fontSize: 10, color: WHITE, fontFace: "Calibri" });
    });

    // ── SLIDE 9 — GO-TO-MARKET ───────────────────────────────────
    const s9 = addSlide();
    s9.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.1, fill: { color: PDARK }, line: { color: PDARK } });
    slideTitle(s9, "🚀  Go-To-Market Strategy", true);
    wm(s9);
    // Timeline
    const quarters = [
      { q: "Q1", label: "Prototype & Testing", color: PCLR },
      { q: "Q2", label: "Pilot Launch", color: PDARK },
      { q: "Q3", label: "Regional Expansion", color: "16A34A" },
      { q: "Q4", label: "Scale Nationwide", color: "2563EB" },
    ];
    quarters.forEach((q, i) => {
      const x = 0.5 + i * 3.2;
      s9.addShape(pptx.ShapeType.ellipse, { x, y: 1.5, w: 1.0, h: 1.0, fill: { color: q.color }, line: { color: q.color } });
      s9.addText(q.q, { x, y: 1.55, w: 1.0, h: 0.9, fontSize: 16, bold: true, color: WHITE, align: "center", fontFace: "Calibri" });
      if (i < 3) s9.addShape(pptx.ShapeType.rect, { x: x + 1.0, y: 1.92, w: 2.2, h: 0.15, fill: { color: "D1D5DB" }, line: { color: "D1D5DB" } });
      s9.addText(q.label, { x: x - 0.15, y: 2.65, w: 1.3, h: 0.7, fontSize: 11, color: DARK, align: "center", fontFace: "Calibri", wrap: true });
    });
    // GTM details
    const gtmPoints = result.go_to_market.split(/[.!?]+/).filter(s => s.trim().length > 8).slice(0, 4);
    const channels = ["📱 Social Media", "🤝 Partnerships", "📣 Ads", "👥 Community"];
    s9.addText("Marketing Channels", { x: 0.5, y: 3.6, w: 5.0, h: 0.4, fontSize: 13, bold: true, color: DARK, fontFace: "Calibri" });
    channels.forEach((ch, i) => {
      const col = i % 2; const row = Math.floor(i / 2);
      const x = 0.5 + col * 3.0; const y = 4.1 + row * 0.9;
      s9.addShape(pptx.ShapeType.roundRect, { x, y, w: 2.7, h: 0.75, fill: { color: LGRAY }, line: { color: "E5E7EB" }, rectRadius: 0.08 });
      s9.addText(ch, { x, y, w: 2.7, h: 0.75, fontSize: 12, color: DARK, align: "center", valign: "middle", fontFace: "Calibri" });
    });
    // Strategy text
    s9.addShape(pptx.ShapeType.roundRect, { x: 6.8, y: 3.6, w: 6.0, h: 3.3, fill: { color: LGRAY }, line: { color: "E5E7EB" }, rectRadius: 0.12 });
    s9.addText("Strategy Details", { x: 7.0, y: 3.75, w: 5.6, h: 0.4, fontSize: 12, bold: true, color: DARK, fontFace: "Calibri" });
    s9.addText(result.go_to_market.slice(0, 300), { x: 7.0, y: 4.2, w: 5.6, h: 2.5, fontSize: 11, color: DARK, fontFace: "Calibri", valign: "top", wrap: true });

    // ── SLIDE 10 — FUNDING ASK / THANK YOU ──────────────────────
    const s10 = addSlide(PDARK);
    s10.addShape(pptx.ShapeType.ellipse, { x: -1, y: -1, w: 5, h: 5, fill: { color: PCLR }, line: { color: PCLR }, transparency: 70 });
    s10.addShape(pptx.ShapeType.ellipse, { x: 10, y: 4, w: 5, h: 5, fill: { color: PCLR }, line: { color: PCLR }, transparency: 60 });
    s10.addText("Funding Ask", { x: 0.8, y: 0.6, w: W - 1.6, h: 0.7, fontSize: 14, bold: true, color: PLIGHT, align: "center", fontFace: "Calibri" });
    s10.addText(result.call_to_action, { x: 0.8, y: 1.4, w: W - 1.6, h: 1.8, fontSize: 18, color: WHITE, align: "center", fontFace: "Calibri", valign: "middle", wrap: true });
    // Allocation boxes
    const allocs = [
      { label: "Product Dev", pct: "40%", color: "16A34A" },
      { label: "Marketing", pct: "30%", color: "D97706" },
      { label: "Operations", pct: "20%", color: "2563EB" },
      { label: "Hiring", pct: "10%", color: "9333EA" },
    ];
    allocs.forEach((a, i) => {
      const x = 0.8 + i * 3.1;
      s10.addShape(pptx.ShapeType.roundRect, { x, y: 3.4, w: 2.8, h: 1.5, fill: { color: a.color }, line: { color: a.color }, rectRadius: 0.12 });
      s10.addText(a.pct, { x, y: 3.55, w: 2.8, h: 0.7, fontSize: 24, bold: true, color: WHITE, align: "center", fontFace: "Calibri" });
      s10.addText(a.label, { x, y: 4.25, w: 2.8, h: 0.4, fontSize: 11, color: WHITE, align: "center", fontFace: "Calibri" });
    });
    // Thank you + QR placeholder
    s10.addText("Thank You!", { x: 0.8, y: 5.2, w: W - 1.6, h: 0.7, fontSize: 30, bold: true, color: WHITE, align: "center", fontFace: "Calibri" });
    s10.addText("📧 pitchforge.ai@gmail.com   |   🌐 pitchforge.ai", { x: 0.8, y: 5.9, w: W - 3.0, h: 0.4, fontSize: 12, color: "AAAAAA", align: "center", fontFace: "Calibri" });
    // QR placeholder
    s10.addShape(pptx.ShapeType.roundRect, { x: 11.5, y: 5.0, w: 1.4, h: 1.4, fill: { color: WHITE }, line: { color: WHITE }, rectRadius: 0.08 });
    s10.addText("QR\nCODE", { x: 11.5, y: 5.0, w: 1.4, h: 1.4, fontSize: 11, bold: true, color: PDARK, align: "center", valign: "middle", fontFace: "Calibri" });
    // Bottom
    s10.addShape(pptx.ShapeType.rect, { x: 0, y: H - 0.4, w: W, h: 0.4, fill: { color: PCLR }, line: { color: PCLR } });
    s10.addText("Generated by PitchForge AI  ·  Powered by Groq × LLaMA 3.3 70B", { x: 0.5, y: H - 0.38, w: W - 1, h: 0.34, fontSize: 9, color: WHITE, align: "center", fontFace: "Calibri" });

    pptx.write("blob").then(pptxBlob => {
      uploadExportToCloud(pptxBlob, "pptx");
      return pptx.writeFile({ fileName: `${result.title.replace(/[^a-z0-9]/gi, "_")}_pitch.pptx` });
    });
  };

  const shareLink = async () => {
    if (!result) return;
    if (!user) { setShowAuth("login"); return; }

    try {
      const res = await axios.post("http://127.0.0.1:8000/decks/share", {
        user_id: user.uid,
        title: result.title,
        idea: idea,
        tone: tone,
        deck_type: deckType,
        data: result,
      });
      const url = res.data.share_url;
      await navigator.clipboard.writeText(url);
      alert(`Share link copied!\n\n${url}\n\nAnyone with this link can view your pitch deck!`);
    } catch (err) {
      console.error(err);
      alert("Failed to generate share link. Please try again.");
    }
  };


  // ── PDF EXPORT ───────────────────────────────────────────────────────────────
  // Replace your existing exportPDF function in App.jsx with this

  const exportPDF = () => {
    if (!result) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "in", format: [13.33, 7.5] });
    const W = 13.33; const H = 7.5;

    const hexToRgb = hex => {
      const h = hex.replace("#", "");
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    };
    const PRIMARY = hexToRgb(theme.primary);
    const PDARK = PRIMARY.map(v => Math.max(0, v - 40));
    const PLIGHT = PRIMARY.map(v => Math.min(255, v + 150));
    const WHITE = [255, 255, 255]; const DARK = [30, 30, 46]; const GRAY = [107, 114, 128]; const LGRAY = [243, 244, 246];
    const GREEN = [22, 163, 74]; const RED = [220, 38, 38]; const BLUE = [37, 99, 235]; const AMBER = [217, 119, 6];

    const newPage = () => doc.addPage([13.33, 7.5], "landscape");

    const rect = (x, y, w, h, fill, radius = 0) => {
      doc.setFillColor(...fill);
      if (radius > 0) doc.roundedRect(x, y, w, h, radius, radius, "F");
      else doc.rect(x, y, w, h, "F");
    };

    const txt = (str, x, y, opts = {}) => {
      const { size = 12, color = DARK, bold = false, italic = false, align = "left", maxW = null } = opts;
      doc.setFontSize(size);
      doc.setTextColor(...color);
      doc.setFont("helvetica", bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal");
      const s = String(str).replace(/[^\x00-\x7F]/g, ""); // strip non-ASCII (emojis)
      if (maxW) {
        const lines = doc.splitTextToSize(s, maxW);
        lines.forEach((line, i) => doc.text(line, x, y + i * size * 0.016, { align }));
      } else {
        doc.text(s, x, y, { align });
      }
    };

    const hdr = (title) => {
      rect(0, 0, W, 0.9, PDARK);
      txt(title, 0.5, 0.6, { size: 22, color: WHITE, bold: true });
      txt("PitchForge AI", W - 0.15, H - 0.1, { size: 7, color: [180, 180, 180], italic: true, align: "right" });
    };

    // ── PAGE 1 — COVER ──────────────────────────────────────────
    rect(0, 0, W, H, PDARK);
    rect(0.4, 0.9, W - 0.8, H - 1.3, PRIMARY, 0.15);
    // Badge
    rect(0.7, 0.95, 2.6, 0.35, PDARK, 0.06);
    txt(deckType.toUpperCase() + " PITCH DECK", 2.0, 1.2, { size: 9, color: WHITE, bold: true, align: "center" });
    // Title
    txt(result.title, W / 2, 2.5, { size: 34, color: WHITE, bold: true, align: "center" });
    if (result.tagline) txt(`"${result.tagline}"`, W / 2, 3.15, { size: 13, color: PLIGHT, italic: true, align: "center" });
    txt(`Theme: ${theme.name}  |  Tone: ${tone}`, W / 2, 3.75, { size: 10, color: [180, 180, 180], align: "center" });
    // Logo box
    rect(0.7, 5.1, 1.3, 1.3, PDARK, 0.1);
    txt("LOGO", 1.35, 5.82, { size: 12, color: WHITE, bold: true, align: "center" });
    // Footer
    rect(0, H - 0.38, W, 0.38, PRIMARY);
    txt("Generated by PitchForge AI  |  Powered by Groq x LLaMA 3.3 70B", W / 2, H - 0.12, { size: 9, color: WHITE, align: "center" });

    // ── PAGE 2 — PROBLEM ────────────────────────────────────────
    newPage();
    hdr("The Problem");
    const pPoints = result.problem.split(/[.!?]+/).filter(s => s.trim().length > 10).slice(0, 5);
    const pLabels = ["[!]", "[--]", "[X]", "[*]", "[!!]"];
    pPoints.forEach((point, i) => {
      const y = 1.1 + i * 1.1;
      rect(0.5, y, W - 1.0, 0.9, LGRAY, 0.08);
      rect(0.5, y, 0.06, 0.9, PRIMARY);
      txt(pLabels[i], 0.85, y + 0.56, { size: 11, color: PRIMARY, bold: true });
      txt(point.trim(), 1.35, y + 0.3, { size: 12, color: DARK, maxW: W - 2.0 });
    });

    // ── PAGE 3 — SOLUTION ───────────────────────────────────────
    newPage();
    hdr("Our Solution");
    const sPoints = result.solution.split(/[.!?]+/).filter(s => s.trim().length > 8).slice(0, 4);
    sPoints.forEach((point, i) => {
      const y = 1.1 + i * 1.35;
      rect(0.5, y, 7.5, 1.1, LGRAY, 0.1);
      rect(0.5, y, 0.06, 1.1, GREEN);
      rect(0.75, y + 0.3, 0.5, 0.5, GREEN, 0.25);
      txt("OK", 1.0, y + 0.63, { size: 10, color: WHITE, bold: true, align: "center" });
      txt(point.trim(), 1.45, y + 0.35, { size: 12, color: DARK, maxW: 6.3 });
    });
    // Right box
    rect(8.3, 1.1, 4.5, 5.7, PRIMARY, 0.12);
    txt("Value Proposition", 10.55, 1.55, { size: 13, color: WHITE, bold: true, align: "center" });
    txt(result.solution.slice(0, 280), 8.5, 2.1, { size: 10, color: WHITE, maxW: 4.1 });

    // ── PAGE 4 — MARKET ─────────────────────────────────────────
    newPage();
    hdr("Market Opportunity");
    const mkt = result.market_size;
    const totalV = (mkt.match(/Total potential customers[:\s]+([^.]+)/i) || ["", ""])[1].trim().slice(0, 40);
    const reachV = (mkt.match(/realistically reach[:\s]+([^.]+)/i) || ["", ""])[1].trim().slice(0, 40);
    const year1V = (mkt.match(/year 1[:\s]+([^.]+)/i) || ["", ""])[1].trim().slice(0, 40);
    [[totalV || "All customers in your market", "TOTAL MARKET", "Total potential customers", PDARK, 8.0, 2.65, 1.1], [reachV || "Customers you can reach", "REACHABLE", "Customers you can realistically reach", PRIMARY, 6.0, 3.65, 2.9], [year1V || "Year 1 target", "YEAR 1 GOAL", "Customers you will get in year 1", GREEN, 4.0, 4.65, 4.7]].forEach(([val, label, sub, clr, bw, bx, y]) => {
      rect(bx, y, bw, 1.2, clr, 0.08);
      txt(label, bx + bw / 2, y + 0.42, { size: 15, color: WHITE, bold: true, align: "center" });
      txt(val, bx + bw / 2, y + 0.78, { size: 9, color: WHITE, align: "center", maxW: bw - 0.3 });
      txt(sub, bx + bw / 2, y + 1.02, { size: 8, color: [220, 220, 220], align: "center" });
    });
    // Arrow connectors
    [[3.5, 2.38], [4.0, 4.18]].forEach(([x, y]) => {
      rect(x, y, 0.2, 0.45, [180, 180, 180]);
      txt("v", x + 0.1, y + 0.55, { size: 10, color: GRAY, align: "center" });
    });
    // Target audience
    rect(0.4, 1.1, 2.0, 5.3, LGRAY, 0.08);
    txt("TARGET", 1.4, 1.5, { size: 8, color: GRAY, bold: true, align: "center" });
    txt("AUDIENCE", 1.4, 1.68, { size: 8, color: GRAY, bold: true, align: "center" });
    txt(result.target_audience.slice(0, 180), 0.55, 2.0, { size: 9, color: DARK, maxW: 1.65 });

    // ── PAGE 5 — BUSINESS MODEL ─────────────────────────────────
    newPage();
    hdr("Business Model");
    const bmPoints = result.business_model.split(/[.!?]+/).filter(s => s.trim().length > 8).slice(0, 6);
    const bmColors = [PRIMARY, PDARK, GREEN, AMBER, BLUE, [147, 51, 234]];
    const bmTitles = ["Revenue", "Mobile", "Delivery", "Marketing", "Partnership", "Premium"];
    bmPoints.forEach((point, i) => {
      const col = i % 3; const row = Math.floor(i / 3);
      const x = 0.5 + col * 4.3; const y = 1.1 + row * 2.85;
      rect(x, y, 4.0, 2.6, LGRAY, 0.12);
      rect(x + 1.5, y + 0.15, 1.0, 0.85, bmColors[i], 0.1);
      txt(bmTitles[i], x + 2.0, y + 0.68, { size: 9, color: WHITE, bold: true, align: "center" });
      txt(point.trim().slice(0, 90), x + 0.2, y + 1.2, { size: 10, color: DARK, maxW: 3.6 });
    });

    // ── PAGE 6 — COMPETITIVE ANALYSIS ───────────────────────────
    newPage();
    hdr("Competitive Analysis");
    const comps = result.competitors.slice(0, 3);
    const feats = ["Direct Selling", "AI Features", "Local Focus", "Low Commission", "User Friendly"];
    const cW = 2.2; const sx = 3.1;
    // Headers
    rect(0.4, 1.0, 2.5, 0.5, LGRAY, 0.04);
    txt("FEATURE", 1.65, 1.34, { size: 9, color: GRAY, bold: true, align: "center" });
    rect(sx, 1.0, cW, 0.5, PRIMARY, 0.04);
    txt("OUR PRODUCT", sx + cW / 2, 1.34, { size: 9, color: WHITE, bold: true, align: "center" });
    comps.forEach((comp, ci) => {
      const x = sx + cW + 0.1 + ci * (cW + 0.1);
      rect(x, 1.0, cW, 0.5, LGRAY, 0.04);
      txt(comp.slice(0, 12), x + cW / 2, 1.34, { size: 9, color: GRAY, bold: true, align: "center" });
    });
    feats.forEach((feat, fi) => {
      const y = 1.6 + fi * 0.88;
      const bg = fi % 2 === 0 ? WHITE : LGRAY;
      rect(0.4, y, 2.5, 0.8, bg);
      doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.01);
      doc.rect(0.4, y, 2.5, 0.8);
      txt(feat, 0.6, y + 0.47, { size: 11, color: DARK });
      rect(sx, y, cW, 0.8, bg);
      doc.rect(sx, y, cW, 0.8);
      txt("[YES]", sx + cW / 2, y + 0.47, { size: 11, color: GREEN, bold: true, align: "center" });
      comps.forEach((_, ci) => {
        const x = sx + cW + 0.1 + ci * (cW + 0.1);
        const has = (fi + ci) % 3 !== 0;
        rect(x, y, cW, 0.8, bg);
        doc.rect(x, y, cW, 0.8);
        txt(has ? "[YES]" : "[NO]", x + cW / 2, y + 0.47, { size: 11, color: has ? GREEN : RED, bold: true, align: "center" });
      });
    });
    txt("PitchForge AI", W - 0.15, H - 0.1, { size: 7, color: [180, 180, 180], italic: true, align: "right" });

    // ── PAGE 7 — SWOT ────────────────────────────────────────────
    newPage();
    hdr("SWOT Analysis");
    [
      { label: "STRENGTHS", key: "strengths", clr: GREEN, bg: [240, 253, 244], x: 0.4, y: 1.0 },
      { label: "WEAKNESSES", key: "weaknesses", clr: RED, bg: [254, 242, 242], x: 7.0, y: 1.0 },
      { label: "OPPORTUNITIES", key: "opportunities", clr: BLUE, bg: [239, 246, 255], x: 0.4, y: 4.1 },
      { label: "THREATS", key: "threats", clr: AMBER, bg: [255, 251, 235], x: 7.0, y: 4.1 },
    ].forEach(({ label, key, clr, bg, x, y }) => {
      rect(x, y, 6.2, 2.8, bg, 0.1);
      rect(x, y, 6.2, 0.42, clr, 0.1);
      txt(label, x + 0.2, y + 0.3, { size: 11, color: WHITE, bold: true });
      result.swot[key].forEach((item, i) => {
        txt(`- ${item}`, x + 0.2, y + 0.72 + i * 0.52, { size: 10, color: DARK, maxW: 5.8 });
      });
    });

    // ── PAGE 8 — FINANCIALS ──────────────────────────────────────
    newPage();
    hdr("Financial Projection");
    const finData = [
      { label: "Startup Cost", value: result.financials.startup_cost, clr: RED },
      { label: "Monthly Revenue", value: result.financials.monthly_revenue, clr: GREEN },
      { label: "Monthly Expenses", value: result.financials.monthly_expenses, clr: AMBER },
      { label: "Profit/Loss", value: result.financials.profit_loss, clr: BLUE },
      { label: "Break Even", value: result.financials.break_even, clr: PRIMARY },
    ];
    const maxBH = 4.2; const bW2 = 1.6; const bGap = 0.45; const bSX = 0.7; const bBase = 6.5;
    finData.forEach((fin, i) => {
      const bh = maxBH * (0.32 + i * 0.14);
      const x = bSX + i * (bW2 + bGap);
      rect(x, bBase - bh, bW2, bh, fin.clr, 0.06);
      txt(fin.value.toString().slice(0, 16), x + bW2 / 2, bBase - bh - 0.13, { size: 8, color: DARK, bold: true, align: "center" });
      txt(fin.label, x + bW2 / 2, bBase + 0.22, { size: 8, color: GRAY, align: "center" });
    });
    // Funding box
    rect(10.0, 1.0, 2.9, 5.2, PRIMARY, 0.12);
    txt("FUNDING", 11.45, 1.45, { size: 12, color: WHITE, bold: true, align: "center" });
    txt("REQUIRED", 11.45, 1.7, { size: 12, color: WHITE, bold: true, align: "center" });
    [{ label: "Product Dev", pct: "40%", clr: GREEN }, { label: "Marketing", pct: "30%", clr: AMBER }, { label: "Operations", pct: "20%", clr: BLUE }, { label: "Hiring", pct: "10%", clr: [147, 51, 234] }].forEach(({ label, pct, clr }, i) => {
      const y = 2.3 + i * 0.95;
      rect(10.15, y, 0.4, 0.4, clr, 0.2);
      txt(`${pct} - ${label}`, 10.65, y + 0.28, { size: 10, color: WHITE });
    });
    txt("PitchForge AI", W - 0.15, H - 0.1, { size: 7, color: [180, 180, 180], italic: true, align: "right" });

    // ── PAGE 9 — GO-TO-MARKET ────────────────────────────────────
    newPage();
    hdr("Go-To-Market Strategy");
    const qs = [
      { q: "Q1", label: "Prototype & Testing", clr: PRIMARY },
      { q: "Q2", label: "Pilot Launch", clr: PDARK },
      { q: "Q3", label: "Regional Expansion", clr: GREEN },
      { q: "Q4", label: "Scale Nationwide", clr: BLUE },
    ];
    qs.forEach(({ q, label, clr }, i) => {
      const x = 0.5 + i * 3.2;
      rect(x, 1.1, 1.0, 0.9, clr, 0.45);
      txt(q, x + 0.5, 1.63, { size: 13, color: WHITE, bold: true, align: "center" });
      if (i < 3) rect(x + 1.0, 1.48, 2.2, 0.14, [209, 213, 219]);
      txt(label, x + 0.5, 2.3, { size: 9, color: DARK, align: "center", maxW: 1.3 });
    });
    txt("Marketing Channels", 0.5, 3.1, { size: 13, color: DARK, bold: true });
    [["[Social] Social Media", "[Deal] Partnerships"], ["[Ad] Advertising", "[Group] Community"]].forEach((row, ri) => {
      row.forEach((ch, ci) => {
        const x = 0.5 + ci * 3.0; const y = 3.5 + ri * 0.9;
        rect(x, y, 2.7, 0.75, LGRAY, 0.06);
        txt(ch, x + 1.35, y + 0.43, { size: 10, color: DARK, align: "center" });
      });
    });
    rect(6.8, 3.0, 6.1, 4.1, LGRAY, 0.1);
    txt("Strategy Details", 7.0, 3.42, { size: 12, color: DARK, bold: true });
    txt(result.go_to_market.slice(0, 380), 7.0, 3.85, { size: 10, color: DARK, maxW: 5.8 });
    txt("PitchForge AI", W - 0.15, H - 0.1, { size: 7, color: [180, 180, 180], italic: true, align: "right" });

    // ── PAGE 10 — FUNDING ASK ────────────────────────────────────
    newPage();
    rect(0, 0, W, H, PDARK);
    rect(0.4, 0.5, W - 0.8, 2.2, PRIMARY, 0.12);
    txt("Funding Ask", W / 2, 1.1, { size: 14, color: PLIGHT, bold: true, align: "center" });
    txt(result.call_to_action, W / 2, 1.65, { size: 13, color: WHITE, align: "center", maxW: W - 1.8 });
    [{ label: "Product Dev", pct: "40%", clr: GREEN }, { label: "Marketing", pct: "30%", clr: AMBER }, { label: "Operations", pct: "20%", clr: BLUE }, { label: "Hiring", pct: "10%", clr: [147, 51, 234] }].forEach(({ label, pct, clr }, i) => {
      const x = 0.8 + i * 3.1;
      rect(x, 3.1, 2.8, 1.6, clr, 0.1);
      txt(pct, x + 1.4, 3.82, { size: 22, color: WHITE, bold: true, align: "center" });
      txt(label, x + 1.4, 4.25, { size: 10, color: WHITE, align: "center" });
    });
    txt("Thank You!", W / 2, 5.4, { size: 26, color: WHITE, bold: true, align: "center" });
    txt("pitchforge.ai@gmail.com   |   pitchforge.ai", W / 2, 5.95, { size: 11, color: [170, 170, 170], align: "center" });
    rect(11.5, 5.0, 1.3, 1.3, WHITE, 0.08);
    txt("QR CODE", 12.15, 5.72, { size: 9, color: PDARK, bold: true, align: "center" });
    rect(0, H - 0.38, W, 0.38, PRIMARY);
    txt("Generated by PitchForge AI  |  Powered by Groq x LLaMA 3.3 70B", W / 2, H - 0.12, { size: 9, color: WHITE, align: "center" });

    doc.save(`${result.title.replace(/[^a-z0-9]/gi, "_")}_pitch.pdf`);
    const pdfBlob = doc.output("blob");
    uploadExportToCloud(pdfBlob, "pdf");
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "'Poppins',system-ui,sans-serif", display: "flex" }}>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 90, display: "none" }} className="sidebar-overlay" />
      )}

      {/* Sidebar */}
      <aside className={sidebarOpen ? "sidebar-open" : ""} style={{ width: desktopSidebar ? "260px" : "0px", background: "#e4e9dc", borderRight: desktopSidebar ? "1px solid #d4dcc4" : "none", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, flexShrink: 0, zIndex: 95, overflow: "hidden", transition: "width 0.25s ease" }}>
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", padding: "0 4px" }}>
            <img src={logo} alt="PitchForge" style={{ width: "36px", height: "36px", borderRadius: "9px", objectFit: "contain" }} />
            <span style={{ fontWeight: "700", fontSize: "15px", color: "#2d3a1a" }}>PitchForge</span>
          </div>
          <button onClick={startNewChat} title="Start a new pitch deck"
            style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "none", background: "#1a4606", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", boxShadow: `3px 3px 8px rgba(0,0,0,0.2)`, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            + New Chat
          </button>
          <button onClick={() => { setShowExports(true); fetchMyExports(); setSidebarOpen(false); }} title="View and download your previously exported files"
            style={{ width: "calc(100% - 24px)", margin: "12px 12px 8px", padding: "10px", borderRadius: "10px", border: "none", background: G, color: BG, fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", boxShadow: SHADOW_BTN }}>
            📁 My Exports
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 16px" }}>
          <p style={{ fontSize: "10px", color: "#7a9a50", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", margin: "8px 8px 8px" }}>Recents</p>
          {!user && <p style={{ fontSize: "12px", color: "#9aab84", padding: "8px", textAlign: "center" }}>Login to see history</p>}
          {user && history.length === 0 && <p style={{ fontSize: "12px", color: "#9aab84", padding: "8px", textAlign: "center" }}>No pitch decks yet</p>}
          {user && history.map(item => (
            <div key={item.id}
              onClick={() => renamingId !== item.id && loadChat(item)}
              onContextMenu={(e) => openContextMenu(e, item.id)}
              onTouchStart={(e) => handleTouchStart(e, item.id)}
              onTouchEnd={handleTouchEnd} onTouchMove={handleTouchEnd}
              style={{ padding: "10px", borderRadius: "8px", cursor: "pointer", marginBottom: "4px", background: activeId === item.id ? "#d4dcc4" : "transparent", display: "flex", alignItems: "center", gap: "6px", transition: "background 0.15s" }}
              onMouseEnter={e => { if (activeId !== item.id) e.currentTarget.style.background = "#dde4d2"; }}
              onMouseLeave={e => { if (activeId !== item.id) e.currentTarget.style.background = "transparent"; }}>
              {renamingId === item.id ? (
                <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => { if (e.key === "Enter") confirmRename(item.id); if (e.key === "Escape") setRenamingId(null); }}
                  onBlur={() => confirmRename(item.id)}
                  style={{ flex: 1, fontSize: "12.5px", color: "#3a4a28", background: "#fff", border: `1px solid ${G}`, borderRadius: "5px", padding: "3px 6px", outline: "none", fontFamily: "'Poppins',system-ui,sans-serif" }} />
              ) : (
                <>
                  <span style={{ fontSize: "12.5px", color: "#3a4a28", fontWeight: activeId === item.id ? "600" : "400", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{item.title}</span>
                  <button onClick={(e) => { e.stopPropagation(); openContextMenu({ preventDefault: () => { }, clientX: e.clientX, clientY: e.clientY }, item.id); }}
                    className="menu-dots-btn"
                    style={{ background: "none", border: "none", color: "#9aab84", cursor: "pointer", fontSize: "15px", padding: "2px 6px", flexShrink: 0, lineHeight: 1, opacity: 0, transition: "opacity 0.15s" }}>⋮</button>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Context menu */}
      {contextMenu && (
        <div onMouseDown={e => e.stopPropagation()}
          style={{ position: "fixed", top: Math.min(contextMenu.y, window.innerHeight - 150), left: Math.min(contextMenu.x, window.innerWidth - 180), background: "#fff", borderRadius: "10px", boxShadow: "0 6px 24px rgba(0,0,0,0.18)", padding: "6px", zIndex: 200, minWidth: "160px", border: "1px solid #e0e0e0" }}>
          {(() => {
            const item = history.find(h => h.id === contextMenu.id);
            if (!item) return null;
            return (
              <>
                <button onClick={() => startRename(item)} style={menuBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "#f1f1ee"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>✎ Rename</button>
                <button onClick={() => shareLink(item)} style={menuBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "#f1f1ee"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>↗ Share</button>
                <button onClick={() => deleteChat(item.id)} style={{ ...menuBtnStyle, color: "#C0392B" }} onMouseEnter={e => e.currentTarget.style.background = "#fdf0ee"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>🗑 Delete</button>
              </>
            );
          })()}
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <nav style={{ background: BG, boxShadow: "0 4px 12px #c8d4b8, 0 -2px 6px #ffffff", padding: "0 20px", height: "56px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 50 }}>
          <button onClick={() => setSidebarOpen(true)} className="hamburger-btn" style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: "6px", fontSize: "20px", color: "#2d3a1a" }}>☰</button>
          <button onClick={() => setDesktopSidebar(p => !p)} className="desktop-toggle" style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 8px", fontSize: "18px", color: "#2d3a1a", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }} title={desktopSidebar ? "Hide sidebar" : "Show sidebar"}>
            {desktopSidebar ? "◀" : "▶"}
          </button>
          <span style={{ fontWeight: "700", fontSize: "16px", color: "#2d3a1a" }}>PitchForge</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
            {user ? (
              <>
                <div style={{ position: "relative" }}>
                  <div onClick={(e) => { e.stopPropagation(); openUserPopup(); }}
                    style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "4px 8px", borderRadius: "10px", boxShadow: SHADOW_BTN, background: BG }}>
                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || "U")}`} alt="profile"
                      style={{ width: "28px", height: "28px", borderRadius: "50%" }} />
                    <span style={{ fontSize: "12px", color: "#2d3a1a", fontWeight: "600" }} className="hide-mobile">
                      {user.displayName?.split(" ")[0] || user.email?.split("@")[0]}
                    </span>
                  </div>

                  {showUserPopup && (
                    <div onClick={e => e.stopPropagation()}
                      style={{ position: "absolute", top: "44px", right: 0, background: "#fff", borderRadius: "14px", boxShadow: "0 6px 24px rgba(0,0,0,0.15)", padding: "16px", minWidth: "220px", zIndex: 200, border: "1px solid #e0e0e0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                        <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || "U")}`} alt="profile"
                          style={{ width: "40px", height: "40px", borderRadius: "50%" }} />
                        <div>
                          <p style={{ fontSize: "13px", fontWeight: "600", color: "#2d3a1a", margin: "0 0 2px" }}>{user.displayName || "User"}</p>
                          <p style={{ fontSize: "11px", color: "#7a9a50", margin: "0" }}>{user.email}</p>
                        </div>
                      </div>
                      {userProfile && (
                        <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "10px", marginBottom: "10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontSize: "11px", color: "#7a9a50" }}>Plan</span>
                            <span style={{ fontSize: "11px", fontWeight: "600", color: "#2d3a1a", textTransform: "capitalize" }}>{userProfile.plan || "Free"}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontSize: "11px", color: "#7a9a50" }}>Decks Generated</span>
                            <span style={{ fontSize: "11px", fontWeight: "600", color: "#2d3a1a" }}>{userProfile.decks_generated || 0}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "11px", color: "#7a9a50" }}>Member Since</span>
                            <span style={{ fontSize: "11px", fontWeight: "600", color: "#2d3a1a" }}>{new Date(userProfile.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                          </div>
                        </div>
                      )}
                      <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "10px" }}>
                        <button onClick={() => {
                          if (window.confirm("Are you sure you want to logout?")) {
                            if (user) localStorage.removeItem(`inProgress_${user.uid}`);
                            onLogout();
                            setShowUserPopup(false);
                            setResult(null);
                            setIdea("");
                            setTone("persuasive");
                            setDeckType("investor");
                            setActiveId(null);
                            setHistory([]);
                            setError("");
                            setChatMessages([]);
                            setChatPhase("idea");
                            setChatQuestions([]);
                            setChatAnswers({});
                            setChatCurrentQ(0);
                            setChatShowTone(false);
                            setChatShowDeck(false);
                            setUserProfile(null);
                          }
                        }}
                          style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "none", background: "#C0392B", color: "#fff", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif" }}>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button onClick={() => setShowAuth("login")} style={{ fontSize: "12px", padding: "6px 14px", borderRadius: "8px", border: "none", background: BG, color: "#2d3a1a", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", fontWeight: "600", boxShadow: SHADOW_BTN }}>Login</button>
                <button onClick={() => setShowAuth("signup")} style={{ fontSize: "12px", padding: "6px 14px", borderRadius: "8px", border: "none", background: G, color: "#fff", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", fontWeight: "600" }}>Sign Up</button>
              </>
            )}
          </div>
        </nav>

        <div className="main-content" style={{ maxWidth: "760px", margin: "0 auto", padding: "48px 20px 80px" }}>
          {!result && !loading && (
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: BG, borderRadius: "20px", padding: "6px 16px", marginBottom: "28px", fontSize: "12px", color: G, fontWeight: "600", boxShadow: SHADOW_OUT }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: G, display: "inline-block" }} />
                AI-powered · Free to use
              </div>
              <h1 style={{ fontSize: "clamp(28px,5vw,46px)", fontWeight: "700", color: "#2d3a1a", lineHeight: "1.2", margin: "0 0 16px", letterSpacing: "-1.5px" }}>
                From idea to<br /><span style={{ color: G }}>investor-ready deck</span>
              </h1>
              <p style={{ fontSize: "15px", color: "#7a9a50", lineHeight: "1.8", maxWidth: "440px", margin: "0 auto" }}>
                Describe your business in plain words. Get SWOT, financials, competitor analysis — exported as PDF or PPTX.
              </p>
            </div>
          )}

          <div style={{ display: result ? "none" : "block" }}>
            <InputFlow
              idea={idea} setIdea={setIdea}
              tone={tone} setTone={setTone}
              deckType={deckType} setDeckType={setDeckType}
              theme={theme} setTheme={setTheme}
              THEMES={THEMES}
              loading={loading}
              onGenerate={handleGenerate}
              error={error}
              SHADOW_OUT={SHADOW_OUT}
              SHADOW_IN={SHADOW_IN}
              SHADOW_BTN={SHADOW_BTN}
              G={G} BG={BG}
              activeId={activeId}
              messages={chatMessages} setMessages={setChatMessages}
              phase={chatPhase} setPhase={setChatPhase}
              questions={chatQuestions} setQuestions={setChatQuestions}
              answers={chatAnswers} setAnswers={setChatAnswers}
              currentQ={chatCurrentQ} setCurrentQ={setChatCurrentQ}
              showTone={chatShowTone} setShowTone={setChatShowTone}
              showDeck={chatShowDeck} setShowDeck={setChatShowDeck}
            />
          </div>

          {loading && !chatMessages.length && (
            <div style={{ textAlign: "center", padding: "72px 0" }}>
              <div style={{ width: "64px", height: "64px", background: BG, borderRadius: "20px", boxShadow: SHADOW_OUT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: "26px" }}>⚡</div>
              <p style={{ fontSize: "16px", fontWeight: "600", color: "#2d3a1a", margin: "0 0 6px" }}>{STEPS[step]}</p>
              <p style={{ fontSize: "13px", color: "#7a9a50", margin: "0 0 28px" }}>Usually takes 5–10 seconds</p>
              <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                {STEPS.map((_, i) => (
                  <div key={i} style={{ height: "4px", borderRadius: "4px", transition: "all 0.4s", background: i <= step ? G : "#c8d4b8", width: i <= step ? "32px" : "10px" }} />
                ))}
              </div>
            </div>
          )}

          {result && (
            <div>
              <div className="result-topbar" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "24px" }}>
                <button onClick={() => { setResult(null); }} title="Go back to chat" style={{ fontSize: "12px", color: "#fff", background: "#3d5a1e", border: "none", borderRadius: "10px", padding: "8px 10px", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", fontWeight: "600", boxShadow: SHADOW_BTN, whiteSpace: "nowrap", flexShrink: 0 }}>← Back</button>
                <div className="result-topbar-buttons" style={{ display: "flex", gap: "6px", flexShrink: 0, flexWrap: "wrap" }}>
                  {undoStack.length > 0 && (
                    <button onClick={handleUndo} className="topbar-export-btn" title="Undo last edit"
                      style={{ padding: "8px 12px", background: "#7a5200", color: "#fff", border: "none", borderRadius: "10px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", whiteSpace: "nowrap" }}>
                      ↩ Undo
                    </button>
                  )}
                  <button onClick={exportPDF} title="Download as PDF presentation (10 pages)" className="topbar-export-btn" style={{ padding: "8px 12px", background: "#C0392B", color: "#fff", border: "none", borderRadius: "10px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", whiteSpace: "nowrap" }}>↓ PDF</button>
                  <button onClick={exportPPTX} title="Download as PowerPoint presentation" className="topbar-export-btn" style={{ padding: "8px 12px", background: "#2980B9", color: "#fff", border: "none", borderRadius: "10px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", whiteSpace: "nowrap" }}>↓ PPTX</button>
                  <button onClick={shareLink} title="Generate a public link anyone can view" className="topbar-export-btn"
                    style={{ padding: "8px 12px", background: "#1a73e8", color: "#fff", border: "none", borderRadius: "10px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", whiteSpace: "nowrap" }}>
                    🔗 Share
                  </button>
                </div>
              </div>

              {/* Cover */}
              <div className="cover-card" style={{ background: `linear-gradient(135deg, ${theme.primary}dd 0%, ${theme.primary} 100%)`, borderRadius: "20px", padding: "48px 32px", textAlign: "center", marginBottom: "16px", boxShadow: `0 8px 32px ${theme.primary}44` }}>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontWeight: "600", letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 14px" }}>{deckType} pitch deck · {theme.name} theme</p>
                <h2 style={{ fontSize: "clamp(20px,4vw,30px)", fontWeight: "700", color: "#fff", margin: "0 0 10px", letterSpacing: "-0.8px", lineHeight: "1.3" }}>{result.title}</h2>
                {result.tagline && <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.85)", margin: "0 0 10px", fontStyle: "italic" }}>"{result.tagline}"</p>}
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", margin: "0" }}>Generated by PitchForge AI · Drag ⠿ to reorder · Click ✎ to edit</p>
                {result._verified && (
                  <p style={{ fontSize: "11px", color: "#a8e6a3", margin: "6px 0 0", fontWeight: "600" }}>
                    ✓ All sections verified complete
                  </p>
                )}
              </div>

              {/* Editable + Draggable sections */}
              <EditableResult
                result={result}
                setResult={setResultWithUndo}
                G={G}
                BG={BG}
                SHADOW_OUT={SHADOW_OUT}
                SHADOW_IN={SHADOW_IN}
                SHADOW_BTN={SHADOW_BTN}
              />
              <div className="bottom-btn-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <button onClick={exportPDF} title="Download as PDF presentation (10 pages)" className="topbar-export-btn" style={{ padding: "14px", background: "#C0392B", color: "#fff", border: "none", borderRadius: "12px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif" }}>↓ PDF</button>
                <button onClick={exportPPTX} title="Download as PowerPoint presentation" className="topbar-export-btn" style={{ padding: "14px", background: "#2980B9", color: "#fff", border: "none", borderRadius: "12px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif" }}>↓ PPTX</button>
                <button onClick={shareLink} title="Generate a public link anyone can view" className="topbar-export-btn" style={{ padding: "14px", background: "#1a73e8", color: "#fff", border: "none", borderRadius: "12px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif" }}>🔗 Share</button>
                <button onClick={startNewChat} title="Start a new pitch deck" style={{ padding: "14px", background: G, color: "#fff", border: "none", borderRadius: "12px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", boxShadow: SHADOW_BTN }}>New deck</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* My Exports Modal */}
      {showExports && (
        <div onClick={() => setShowExports(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: BG, borderRadius: "20px", boxShadow: SHADOW_OUT, padding: "24px", width: "480px", maxWidth: "calc(100vw - 32px)", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#2d3a1a", margin: 0 }}>📁 My Exports</h3>
              <button onClick={() => setShowExports(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#999" }}>✕</button>
            </div>
            {myExports.length === 0 && (
              <p style={{ fontSize: "13px", color: "#7a9a50", textAlign: "center", padding: "20px 0" }}>
                No exports yet. Export a PDF or PPTX and it will be saved here automatically!
              </p>
            )}
            {myExports.map((exp) => (
              <div key={exp._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "12px", borderRadius: "12px", boxShadow: SHADOW_IN, marginBottom: "8px", background: BG }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: "13px", fontWeight: "600", color: "#2d3a1a", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.title}</p>
                  <p style={{ fontSize: "11px", color: "#7a9a50", margin: 0 }}>
                    {exp.file_type.toUpperCase()} · {new Date(exp.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <a href={exp.url} target="_blank" rel="noreferrer"
                  style={{ padding: "7px 14px", borderRadius: "8px", background: exp.file_type === "pdf" ? "#C0392B" : "#2980B9", color: "#fff", fontSize: "11px", fontWeight: "700", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                  ↓ Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuth && (
        <div onClick={() => setShowAuth(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            className="auth-modal-box"
            style={{ background: BG, borderRadius: "20px", boxShadow: SHADOW_OUT, padding: "40px 32px", textAlign: "center", width: "340px", maxWidth: "calc(100vw - 32px)" }}>

            <div style={{ width: "48px", height: "48px", background: G, borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#fff", fontWeight: "700", fontSize: "20px", boxShadow: SHADOW_BTN }}>P</div>

            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#2d3a1a", margin: "0 0 6px", letterSpacing: "-0.5px" }}>
              {showAuth === "login" ? "Welcome back!" : "Create account"}
            </h2>
            <p style={{ fontSize: "13px", color: "#7a9a50", margin: "0 0 28px", lineHeight: "1.6" }}>
              {showAuth === "login" ? "Login to access your saved pitch decks across all devices." : "Sign up to save and sync your pitch decks across devices."}
            </p>

            <button onClick={async () => {
              try {
                const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
                const { googleProvider } = await import("./firebase");
                const res = await signInWithPopup(auth, googleProvider);
                // Get access token properly
                onLogin(res.user);
                setShowAuth(null);
              } catch (err) {
                if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
                  alert("Login failed: " + err.message);
                }
              }
            }}
              style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: BG, color: "#2d3a1a", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", boxShadow: SHADOW_BTN, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "16px" }}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.2 29.2 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5 13 5 4 14 4 25s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5 16.3 5 9.7 9.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 45c4.9 0 9.3-1.8 12.7-4.8l-5.9-5c-1.8 1.3-4.1 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2l-6.5 5C9.5 40.5 16.2 45 24 45z" />
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l5.9 5C40.6 36 44 31 44 25c0-1.3-.1-2.6-.4-3.9z" />
              </svg>
              Continue with Google
            </button>

            <p style={{ fontSize: "12px", color: "#7a9a50", margin: "0" }}>
              {showAuth === "login" ? "New user? " : "Already have an account? "}
              <span onClick={() => setShowAuth(showAuth === "login" ? "signup" : "login")}
                style={{ color: G, fontWeight: "600", cursor: "pointer", textDecoration: "underline" }}>
                {showAuth === "login" ? "Sign Up" : "Login"}
              </span>
            </p>

            <button onClick={() => setShowAuth(null)}
              style={{ marginTop: "12px", fontSize: "12px", color: "#aaa", background: "none", border: "none", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif" }}>
              Continue without login
            </button>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        @media (max-width: 768px) {
          aside { position: fixed !important; left: -260px; width: 260px !important; transition: left 0.25s ease; }
          aside.sidebar-open { left: 0 !important; box-shadow: 4px 0 20px rgba(0,0,0,0.2); }
          .sidebar-overlay { display: block !important; }
          .hamburger-btn { display: block !important; }
          .desktop-toggle { display: none !important; }
          .chip-grid { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; }
          .chip-grid button { width: 100% !important; }
          .bottom-btn-grid { grid-template-columns: 1fr 1fr !important; }
          .menu-dots-btn { opacity: 1 !important; }
          .hide-mobile { display: none !important; }
          .edit-ans-btn { opacity: 1 !important; }
          /* Auth modal full width on mobile */
          .auth-modal-box { width: calc(100vw - 32px) !important; padding: 28px 20px !important; }
          /* Top bar buttons smaller on mobile */
          .topbar-export-btn { padding: 6px 8px !important; font-size: 11px !important; }
          /* Cover card less padding on mobile */
          .cover-card { padding: 32px 16px !important; }
          /* Hero section less padding */
          .hero-section { margin-bottom: 28px !important; }
          /* User popup responsive */
          .user-popup { right: -8px !important; min-width: 200px !important; }
          /* Main content padding */
          .main-content { padding: 24px 14px 60px !important; }
          /* Result topbar wrap on mobile */
          .result-topbar { flex-wrap: wrap !important; gap: 6px !important; }
          .result-topbar-buttons { flex-wrap: wrap !important; gap: 4px !important; }
        }
        @media (max-width: 400px) {
          .chip-grid { grid-template-columns: 1fr 1fr !important; }
          .bottom-btn-grid { grid-template-columns: 1fr 1fr !important; }
          .topbar-export-btn { padding: 5px 6px !important; font-size: 10px !important; }
        }
        @media (min-width: 769px) {
          .hamburger-btn { display: none !important; }
          .desktop-toggle { display: flex !important; }
          .desktop-toggle:hover { background: #e4e9dc !important; }
          div:hover > .menu-dots-btn { opacity: 1 !important; }
        }
      `}</style>
    </div >
  );
}

function NmCard({ label, value, bg, shadow, G, mb = "0" }) {
  return (
    <div style={{ background: bg, borderRadius: "16px", boxShadow: shadow, padding: "22px", marginBottom: mb }}>
      <p style={{ fontSize: "11px", fontWeight: "600", color: G, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px" }}>{label}</p>
      <p style={{ fontSize: "13.5px", color: "#2d3a1a", lineHeight: "1.7", margin: "0", fontWeight: "400" }}>{value}</p>
    </div>
  );
}