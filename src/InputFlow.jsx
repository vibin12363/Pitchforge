import { useRef, useEffect, useState } from "react";
import axios from "axios";
import logo from "./assets/ChatGPT_Genearted.png";

const TONES = ["persuasive", "formal", "visionary", "technical"];
const DECK_TYPES = ["investor", "academic", "internal", "partnership"];
const TONE_DESC = {
  persuasive: "Convincing and compelling",
  formal: "Professional and structured",
  visionary: "Inspiring and future-focused",
  technical: "Data-driven and detailed"
};
const DECK_DESC = {
  investor: "For angel investors and VCs",
  academic: "For college projects",
  internal: "For team leads",
  partnership: "For co-founders"
};

export default function InputFlow({
  idea, setIdea, tone, setTone, deckType, setDeckType,
  theme, setTheme, THEMES, loading, onGenerate, error,
  SHADOW_OUT, SHADOW_IN, SHADOW_BTN, G, BG,
  messages, setMessages,
  phase, setPhase,
  questions, setQuestions,
  answers, setAnswers,
  currentQ, setCurrentQ,
  showTone, setShowTone,
  showDeck, setShowDeck,
}) {
  const [input, setInput] = useState("");
  const [loadingQ, setLoadingQ] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editVal, setEditVal] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showTone, showDeck, loading]);

  // Focus input when phase changes to idea or questions
  useEffect(() => {
    if ((phase === "idea" || phase === "questions") && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  const addMsg = (text, sender, fixedId) => {
    const id = fixedId || `${sender}_${Date.now()}_${Math.random()}`;
    setMessages(prev => [...prev, { text, sender, id }]);
    return id;
  };

  const handleSend = async () => {
    const val = input.trim();
    if (!val || loading || loadingQ) return;
    setInput("");

    if (phase === "idea") {
      // Validate minimum input
      if (val.length < 20) {
        addMsg("Please describe your business idea in more detail (at least 20 characters).", "ai-error");
        return;
      }
      const wordCount = val.trim().split(/\s+/).length;
      if (wordCount < 4) {
        addMsg("Please describe your idea with at least 4 words for better results!", "ai-error");
        return;
      }

      setIdea(val);
      addMsg(val, "user");
      setLoadingQ(true);
      const loadId = `loading_${Date.now()}`;
      addMsg("Analyzing your idea and preparing questions…", "ai-loading", loadId);
      try {
        const res = await axios.post("https://pitchforge-backend-wqez.onrender.com/questions", { idea: val });
        const qs = res.data.questions;
        setQuestions(qs);
        setMessages(prev => prev.filter(m => m.id !== loadId));
        addMsg("Great idea! Answer these questions to get a more accurate pitch deck:", "ai");
        setTimeout(() => {
          addMsg(qs[0].question, "ai-question");
          setCurrentQ(0);
          setPhase("questions");
        }, 300);
      } catch (err) {
        setMessages(prev => prev.filter(m => m.id !== loadId));
        const msg = err.response?.data?.detail || "Backend not running. Please start the server.";
        addMsg(msg, "ai-error");
      } finally {
        setLoadingQ(false);
      }

    } else if (phase === "questions") {
      const q = questions[currentQ];
      addMsg(val, "user-answer", `ans_${currentQ}`);
      const newAnswers = { ...answers, [q.question]: val };
      setAnswers(newAnswers);
      if (currentQ < questions.length - 1) {
        setTimeout(() => {
          addMsg(questions[currentQ + 1].question, "ai-question");
          setCurrentQ(currentQ + 1);
        }, 300);
      } else {
        setTimeout(() => {
          addMsg("What tone should the pitch deck have?", "ai-question");
          setShowTone(true);
          setPhase("tone");
        }, 300);
      }
    }
  };

  const startEditAnswer = (idx, currentVal) => {
    setEditingIdx(idx);
    setEditVal(currentVal);
  };

  const saveEditAnswer = () => {
    if (!editVal.trim() || editingIdx === null) return;
    const q = questions[editingIdx];
    if (!q) {
      addMsg("This chat is from an older version — answers can't be edited here. Please start a new chat.", "ai-error");
      setEditingIdx(null);
      setEditVal("");
      return;
    }
    const newAnswers = { ...answers, [q.question]: editVal.trim() };
    setAnswers(newAnswers);
    setMessages(prev => prev.map(m =>
      m.id === `ans_${editingIdx}` ? { ...m, text: editVal.trim() } : m
    ));
    setEditingIdx(null);
    setEditVal("");
    addMsg("Answer updated! Click ⚡ Regenerate to get a new pitch deck.", "ai");
  };

  const cancelEdit = () => {
    setEditingIdx(null);
    setEditVal("");
  };

  const handleToneSelect = (t) => {
    setTone(t);
    setShowTone(false);
    addMsg(`Tone: ${t}`, "user");
    setTimeout(() => {
      addMsg("What type of pitch deck do you need?", "ai-question");
      setShowDeck(true);
      setPhase("deck");
    }, 300);
  };

  const handleDeckSelect = (d) => {
    setDeckType(d);
    setShowDeck(false);
    addMsg(`Deck type: ${d}`, "user");
    setTimeout(() => {
      addMsg("Perfect! Generating your personalized pitch deck now…", "ai");
      setPhase("generating");
      onGenerate(answers);
    }, 300);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEditIdea = () => {
    // Put original idea back in input box, clear rest
    setInput(idea);
    setIdea("");
    setMessages([]);
    setQuestions([]);
    setAnswers({});
    setCurrentQ(0);
    setShowTone(false);
    setShowDeck(false);
    setPhase("idea");
    setEditingIdx(null);
    setEditVal("");
    // Focus input after state update
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const canSend = !loading && !loadingQ && editingIdx === null &&
    (phase === "idea" ? input.trim().length > 19 : phase === "questions" ? input.trim().length > 0 : false);

  const placeholder = phase === "idea"
    ? "Describe your business idea in detail (min 4 words)…"
    : phase === "questions" && questions[currentQ]
      ? questions[currentQ].placeholder || "Type your answer…"
      : "";

  const showInputBox = (phase === "idea" || phase === "questions") && editingIdx === null;
  const showEditPanel = phase === "generating" && !loading;

  return (
    <div style={{ background: BG, borderRadius: "16px", boxShadow: SHADOW_OUT, overflow: "hidden" }}>

      {/* Theme selector — only before first message */}
      {phase === "idea" && messages.length === 0 && (
        <div style={{ padding: "16px 20px 0" }}>
          <p style={{ fontSize: "11px", color: G, fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px" }}>Design theme</p>
          <div className="chip-grid" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
            {THEMES.map(t => (
              <button key={t.id} onClick={() => setTheme(t)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "6px 14px", borderRadius: "20px", border: "none", background: theme.id === t.id ? t.primary : BG, color: theme.id === t.id ? "#fff" : "#555", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", boxShadow: theme.id === t.id ? "inset 2px 2px 5px rgba(0,0,0,0.2)" : SHADOW_BTN, transition: "all 0.2s" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: t.primary, display: "inline-block", border: "2px solid rgba(255,255,255,0.6)" }} />
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat messages */}
      {messages.length > 0 && (
        <div style={{ padding: "20px 20px 8px", maxHeight: "450px", overflowY: "auto" }}>
          {messages.map((msg) => {
            const isUserAnswer = msg.sender === "user-answer";
            let ansIdx = null;
            if (isUserAnswer && msg.id && msg.id.startsWith("ans_")) {
              const parsed = parseInt(msg.id.replace("ans_", ""));
              if (!isNaN(parsed)) ansIdx = parsed;
            }
            const isThisEditing = ansIdx !== null && editingIdx === ansIdx;
            const isRight = msg.sender === "user" || isUserAnswer;

            return (
              <div key={msg.id} style={{ marginBottom: "12px", display: "flex", justifyContent: isRight ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "8px" }}>
                {!isRight && (
                  <img src={logo} alt="P" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                )}

                <div style={{ maxWidth: "85%" }}>
                  {isThisEditing ? (
                    <div>
                      <input
                        autoFocus
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEditAnswer(); if (e.key === "Escape") cancelEdit(); }}
                        style={{ padding: "8px 12px", borderRadius: "10px", border: `2px solid ${G}`, outline: "none", fontFamily: "'Poppins',system-ui,sans-serif", fontSize: "13px", width: "min(220px, 60vw)", display: "block", boxSizing: "border-box" }}
                      />
                      <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                        <button onClick={saveEditAnswer}
                          style={{ padding: "4px 12px", background: G, color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", fontWeight: "600" }}>
                          Save
                        </button>
                        <button onClick={cancelEdit}
                          style={{ padding: "4px 12px", background: BG, color: "#666", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", fontWeight: "600" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ position: "relative" }}>
                      <div style={{
                        background: isRight ? G : msg.sender === "ai-error" ? "#fee2e2" : msg.sender === "ai-loading" ? BG : "#fff",
                        color: isRight ? "#fff" : msg.sender === "ai-error" ? "#991b1b" : msg.sender === "ai-loading" ? "#7a9a50" : msg.sender === "ai-question" ? "#2d3a1a" : "#555",
                        borderRadius: isRight ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        padding: "10px 14px",
                        fontSize: "13px",
                        lineHeight: "1.6",
                        boxShadow: !isRight ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                        fontStyle: msg.sender === "ai-loading" ? "italic" : "normal",
                        fontWeight: msg.sender === "ai-question" ? "600" : "400",
                      }}>
                        {msg.text}
                      </div>
                      {/* Edit pencil for user answers — always visible on mobile, hover on desktop */}
                      {isUserAnswer && ansIdx !== null && editingIdx === null && (
                        <button
                          className="edit-ans-btn"
                          onClick={() => startEditAnswer(ansIdx, msg.text)}
                          title="Edit this answer"
                          style={{
                            position: "absolute",
                            top: "-8px",
                            left: "-8px",
                            background: G,
                            color: "#fff",
                            border: "2px solid #fff",
                            borderRadius: "50%",
                            width: "22px",
                            height: "22px",
                            fontSize: "11px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 2,
                            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                          }}>
                          ✎
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Tone buttons */}
          {showTone && (
            <div style={{ marginBottom: "12px", display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <img src={logo} alt="P" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "contain", background: "#fff", flexShrink: 0 }} />
              <div className="tone-deck-btns" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {TONES.map(t => (
                  <button key={t} onClick={() => handleToneSelect(t)}
                    style={{ padding: "8px 14px", borderRadius: "10px", border: `2px solid ${tone === t ? G : "#e0e0e0"}`, background: tone === t ? G : BG, color: tone === t ? "#fff" : "#2d3a1a", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", textAlign: "left", transition: "all 0.15s" }}>
                    <span style={{ display: "block", fontWeight: "700", textTransform: "capitalize" }}>{t}</span>
                    <span style={{ fontSize: "10px", opacity: 0.7 }}>{TONE_DESC[t]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Deck type buttons */}
          {showDeck && (
            <div style={{ marginBottom: "12px", display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <img src={logo} alt="P" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "contain", background: "#fff", flexShrink: 0 }} />
              <div className="tone-deck-btns" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {DECK_TYPES.map(d => (
                  <button key={d} onClick={() => handleDeckSelect(d)}
                    style={{ padding: "8px 14px", borderRadius: "10px", border: `2px solid ${deckType === d ? G : "#e0e0e0"}`, background: deckType === d ? G : BG, color: deckType === d ? "#fff" : "#2d3a1a", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", textAlign: "left", transition: "all 0.15s" }}>
                    <span style={{ display: "block", fontWeight: "700", textTransform: "capitalize" }}>{d}</span>
                    <span style={{ fontSize: "10px", opacity: 0.7 }}>{DECK_DESC[d]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generating indicator */}
          {phase === "generating" && loading && (
            <div style={{ marginBottom: "12px", display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <img src={logo} alt="P" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "contain", background: "#fff", flexShrink: 0 }} />
              <div style={{ background: "#fff", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", fontSize: "13px", color: "#7a9a50", fontStyle: "italic", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                ⚡ Generating your personalized pitch deck…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Edit & Regenerate panel */}
      {showEditPanel && (
        <div style={{ padding: "14px 20px", borderTop: "1px solid #e8e8e8" }}>
          <p style={{ fontSize: "12px", color: "#7a9a50", margin: "0 0 10px", fontWeight: "600" }}>Want to make changes?</p>
          <div className="edit-panel-btns" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={handleEditIdea}  title="Start over with a new idea" 
              style={{ padding: "7px 14px", borderRadius: "10px", border: "none", background: BG, color: "#2d3a1a", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", boxShadow: SHADOW_BTN }}>
              ✎ Edit idea
            </button>
            <button onClick={() => { addMsg("Choose a different tone:", "ai-question"); setShowTone(true); setPhase("tone"); }} title="Pick a different presentation tone"
              style={{ padding: "7px 14px", borderRadius: "10px", border: "none", background: BG, color: "#2d3a1a", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", boxShadow: SHADOW_BTN }}>
              🎯 Change tone
            </button>
            <button onClick={() => { addMsg("Choose a different deck type:", "ai-question"); setShowDeck(true); setPhase("deck"); }} title="Select a different deck type"
              style={{ padding: "7px 14px", borderRadius: "10px", border: "none", background: BG, color: "#2d3a1a", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", boxShadow: SHADOW_BTN }}>
              📋 Change deck type
            </button>
            <button onClick={() => addMsg("Click the ✎ pencil button on any of your answers above to edit them.", "ai")} title="Edit any of your previous answers"
              style={{ padding: "7px 14px", borderRadius: "10px", border: "none", background: BG, color: "#2d3a1a", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", boxShadow: SHADOW_BTN }}>
              ✏️ Edit answers
            </button>
            <button onClick={() => { addMsg("Regenerating with your latest answers…", "ai"); setPhase("generating"); onGenerate(answers); }} title="Generate a fresh deck with current answers"
              style={{ padding: "7px 14px", borderRadius: "10px", border: "none", background: G, color: "#fff", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif", boxShadow: `3px 3px 8px rgba(0,0,0,0.2)` }}>
              ⚡ Regenerate
            </button>
          </div>
        </div>
      )}

      {/* Input box */}
      {showInputBox && (
        <div style={{ padding: "12px 16px 16px", borderTop: messages.length > 0 ? "1px solid #e8e8e8" : "none", display: "flex", alignItems: "flex-end", gap: "10px" }}>
          <div style={{ flex: 1, borderRadius: "12px", boxShadow: SHADOW_IN, background: BG, padding: "10px 14px" }}>
            <textarea ref={inputRef} rows={1}
              style={{ width: "100%", border: "none", outline: "none", resize: "none", fontFamily: "'Poppins',system-ui,sans-serif", fontSize: "14px", color: "#2d3a1a", lineHeight: "1.6", background: "transparent", minHeight: "24px", maxHeight: "120px", overflowY: "auto", display: "block", boxSizing: "border-box" }}
              placeholder={placeholder}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              disabled={loading || loadingQ}
            />
          </div>
          <button onClick={handleSend} disabled={!canSend} title="Send (or press Enter)"
            style={{ width: "42px", height: "42px", borderRadius: "12px", border: "none", background: canSend ? G : "#d4dcc4", color: "#fff", fontSize: "18px", cursor: canSend ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
            ↑
          </button>
        </div>
      )}

      {error && <p style={{ color: "#e53e3e", fontSize: "13px", padding: "0 20px 16px", textAlign: "center", fontWeight: "500" }}>{error}</p>}

      {/* CSS for pencil button visibility and responsive fixes */}
      <style>{`
        .edit-ans-btn { opacity: 1 !important; }
        @media (min-width: 769px) {
          .edit-ans-btn { opacity: 0 !important; transition: opacity 0.15s; }
          .edit-ans-btn:hover,
          div:hover > div > .edit-ans-btn { opacity: 1 !important; }
        }
        @media (max-width: 768px) {
          .edit-ans-btn { opacity: 1 !important; }
          .chat-msg-bubble { max-width: 88% !important; }
          .tone-deck-btns { gap: 6px !important; }
          .tone-deck-btns button { padding: 6px 10px !important; font-size: 11px !important; }
          .edit-panel-btns { gap: 6px !important; }
          .edit-panel-btns button { padding: 6px 10px !important; font-size: 11px !important; }
        }
        @media (max-width: 400px) {
          .tone-deck-btns button { padding: 5px 8px !important; font-size: 10px !important; }
        }
      `}</style>
    </div>
  );
}