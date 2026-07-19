import { useState, useEffect } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function EditableText({ value, onSave, multiline = false, textColor = "#2d3a1a" }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);


  useEffect(() => {
    if (!editing) setVal(value);
  }, [value]);

  const handleSave = () => { onSave(val); setEditing(false); };

  if (editing) {
    return (
      <div>
        {multiline ? (
          <textarea autoFocus value={val} onChange={e => setVal(e.target.value)}
            style={{ width: "100%", minHeight: "80px", padding: "8px", borderRadius: "8px", border: "2px solid #26851d", outline: "none", fontFamily: "'Poppins',system-ui,sans-serif", fontSize: "13px", lineHeight: "1.7", resize: "vertical", boxSizing: "border-box" }} />
        ) : (
          <input autoFocus value={val} onChange={e => setVal(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "2px solid #26851d", outline: "none", fontFamily: "'Poppins',system-ui,sans-serif", fontSize: "13px", boxSizing: "border-box" }} />
        )}
        <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
          <button onClick={handleSave} style={{ padding: "4px 12px", background: "#26851d", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif" }}>Save</button>
          <button onClick={() => { setVal(value); setEditing(false); }} style={{ padding: "4px 12px", background: "#f1f1ee", color: "#666", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif" }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}
      onMouseEnter={e => { const b = e.currentTarget.querySelector(".edit-btn"); if (b) b.style.opacity = "1"; }}
      onMouseLeave={e => { const b = e.currentTarget.querySelector(".edit-btn"); if (b) b.style.opacity = "0"; }}>
      <p style={{ fontSize: "13.5px", color: textColor, lineHeight: "1.7", margin: "0", paddingRight: "40px" }}>{val}</p>
      <button className="edit-btn" onClick={() => setEditing(true)}
        style={{ position: "absolute", top: 0, right: 0, background: "#26851d", color: "#fff", border: "none", borderRadius: "6px", fontSize: "10px", fontWeight: "600", cursor: "pointer", padding: "2px 8px", opacity: 0, transition: "opacity 0.15s", fontFamily: "'Poppins',system-ui,sans-serif", whiteSpace: "nowrap" }}>
        ✎ Edit
      </button>
    </div>
  );
}

function SortableCard({ id, label, children, G, BG, SHADOW_OUT }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, background: BG, borderRadius: "16px", boxShadow: isDragging ? `0 8px 24px rgba(0,0,0,0.15)` : SHADOW_OUT, padding: "22px", marginBottom: "14px", position: "relative" }}>
      <div {...attributes} {...listeners}
        style={{ position: "absolute", top: "14px", right: "14px", cursor: "grab", color: "#bbb", fontSize: "16px", userSelect: "none", padding: "4px", touchAction: "none" }}
        title="Drag to reorder">⠿</div>
      <p style={{ fontSize: "11px", fontWeight: "600", color: G, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px", paddingRight: "28px" }}>{label}</p>
      {children}
    </div>
  );
}

export default function EditableResult({ result, setResult, G, BG, SHADOW_OUT, SHADOW_IN, SHADOW_BTN }) {
  const [sections, setSections] = useState([
    { id: "problem", label: "Problem" },
    { id: "solution", label: "Solution" },
    { id: "target_audience", label: "Target Audience" },
    { id: "market_size", label: "Market Size" },
    { id: "business_model", label: "Business Model" },
    { id: "competitors", label: "Competitors" },
    { id: "swot", label: "SWOT Analysis" },
    { id: "financials", label: "Financials" },
    { id: "go_to_market", label: "Go-to-Market Strategy" },
    { id: "call_to_action", label: "Call to Action" },
    { id: "validation", label: "Business Concept Validation" },
    { id: "improvements", label: "Improvement Suggestions" },
    { id: "similar_startups", label: "Similar Successful Startups" },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }) => {
    if (active.id !== over?.id) {
      setSections(items => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const update = (field, value) => setResult(prev => ({ ...prev, [field]: value }));

  const renderSection = ({ id, label }) => {
    switch (id) {
      case "problem": case "solution": case "target_audience":
      case "market_size": case "business_model": case "go_to_market":
        return (
          <SortableCard key={id} id={id} label={label} G={G} BG={BG} SHADOW_OUT={SHADOW_OUT}>
            <EditableText value={result[id]} onSave={val => update(id, val)} multiline />
          </SortableCard>
        );

      case "call_to_action":
        return (
          <SortableCard key={id} id={id} label={label} G={G} BG={BG} SHADOW_OUT={SHADOW_OUT}>
            <div style={{ background: `linear-gradient(135deg, #2d3a1a 0%, #4a6329 100%)`, borderRadius: "12px", padding: "20px" }}>
              <EditableText value={result.call_to_action} onSave={val => update("call_to_action", val)} multiline textColor="#cde88a" />
            </div>
          </SortableCard>
        );

      case "competitors":
        if (!result.competitors?.length) return null;
        return (
          <SortableCard key={id} id={id} label={label} G={G} BG={BG} SHADOW_OUT={SHADOW_OUT}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {result.competitors.map((c, i) => (
                <div key={i} style={{ position: "relative" }}
                  onMouseEnter={e => { const b = e.currentTarget.querySelector(".comp-edit"); if (b) b.style.display = "block"; }}
                  onMouseLeave={e => { const b = e.currentTarget.querySelector(".comp-edit"); if (b) b.style.display = "none"; }}>
                  <span style={{ background: BG, color: "#2d3a1a", borderRadius: "20px", padding: "5px 14px", fontSize: "12px", fontWeight: "600", boxShadow: SHADOW_BTN, display: "block" }}>{c}</span>
                  <button className="comp-edit" onClick={() => {
                    const newVal = prompt("Edit competitor:", c);
                    if (newVal !== null) { const u = [...result.competitors]; u[i] = newVal; update("competitors", u); }
                  }} style={{ display: "none", position: "absolute", top: "-6px", right: "-6px", width: "16px", height: "16px", background: G, color: "#fff", border: "none", borderRadius: "50%", fontSize: "8px", cursor: "pointer", lineHeight: "16px", textAlign: "center" }}>✎</button>
                </div>
              ))}
            </div>
          </SortableCard>
        );

      case "swot":
        if (!result.swot?.strengths?.length) return null;
        return (
          <SortableCard key={id} id={id} label={label} G={G} BG={BG} SHADOW_OUT={SHADOW_OUT}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "10px" }}>
              {[["Strengths", "#2d6a2d"], ["Weaknesses", "#8b1a1a"], ["Opportunities", "#1a3d8b"], ["Threats", "#7a5200"]].map(([l, tc]) => {
                const key2 = l.toLowerCase();
                return (
                  <div key={l} style={{ background: BG, borderRadius: "12px", padding: "16px", boxShadow: SHADOW_IN }}>
                    <p style={{ fontSize: "10px", fontWeight: "700", color: tc, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 10px" }}>{l}</p>
                    {result.swot[key2].map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <p style={{ fontSize: "12px", color: "#2d3a1a", margin: "0", lineHeight: "1.6", flex: 1 }}>· {item}</p>
                        <button onClick={() => {
                          const newVal = prompt("Edit:", item);
                          if (newVal !== null) { const u = { ...result.swot }; u[key2] = [...u[key2]]; u[key2][i] = newVal; update("swot", u); }
                        }} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: "10px", padding: "0 2px", flexShrink: 0 }}>✎</button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </SortableCard>
        );

      case "financials":
        if (!result.financials?.startup_cost) return null;
        return (
          <SortableCard key={id} id={id} label={label} G={G} BG={BG} SHADOW_OUT={SHADOW_OUT}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: "10px" }}>
              {[["Startup cost", "startup_cost"], ["Monthly revenue", "monthly_revenue"], ["Monthly expenses", "monthly_expenses"], ["Profit / loss", "profit_loss"], ["Break even", "break_even"]].map(([l, k]) => (
                <div key={l} style={{ background: BG, borderRadius: "12px", padding: "14px", textAlign: "center", boxShadow: SHADOW_IN, position: "relative" }}
                  onMouseEnter={e => { const b = e.currentTarget.querySelector(".fin-edit"); if (b) b.style.display = "block"; }}
                  onMouseLeave={e => { const b = e.currentTarget.querySelector(".fin-edit"); if (b) b.style.display = "none"; }}>
                  <p style={{ fontSize: "10px", color: "#7a9a50", margin: "0 0 6px", fontWeight: "500" }}>{l}</p>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#2d3a1a", margin: "0" }}>{result.financials[k]}</p>
                  <button className="fin-edit" onClick={() => {
                    const newVal = prompt(`Edit ${l}:`, result.financials[k]);
                    if (newVal !== null) update("financials", { ...result.financials, [k]: newVal });
                  }} style={{ display: "none", position: "absolute", top: "4px", right: "4px", background: G, color: "#fff", border: "none", borderRadius: "4px", fontSize: "9px", cursor: "pointer", padding: "2px 5px" }}>✎</button>
                </div>
              ))}
            </div>
          </SortableCard>
        );

      case "validation":
        if (!result.validation) return null;
        return (
          <SortableCard key={id} id={id} label={label} G={G} BG={BG} SHADOW_OUT={SHADOW_OUT}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "10px", marginBottom: "14px" }}>
              {[["Viability Score", "viability_score"], ["Market Readiness", "market_readiness"], ["Competition Level", "competition_level"]].map(([l, k]) => (
                <div key={l} style={{ background: BG, borderRadius: "12px", padding: "14px", textAlign: "center", boxShadow: SHADOW_IN }}>
                  <p style={{ fontSize: "10px", color: "#7a9a50", margin: "0 0 6px", fontWeight: "500" }}>{l}</p>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#2d3a1a", margin: "0" }}>{result.validation[k]}</p>
                </div>
              ))}
            </div>
            <div style={{ background: BG, borderRadius: "12px", padding: "14px", boxShadow: SHADOW_IN }}>
              <p style={{ fontSize: "10px", color: "#7a9a50", margin: "0 0 6px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em" }}>Overall Verdict</p>
              <p style={{ fontSize: "13px", color: "#2d3a1a", lineHeight: "1.7", margin: "0" }}>{result.validation.overall_verdict}</p>
            </div>
          </SortableCard>
        );

      case "improvements":
        if (!result.improvements?.length) return null;
        return (
          <SortableCard key={id} id={id} label={label} G={G} BG={BG} SHADOW_OUT={SHADOW_OUT}>
            {result.improvements.map((imp, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "10px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: G, color: "#fff", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                <p style={{ fontSize: "13px", color: "#2d3a1a", lineHeight: "1.6", margin: "0" }}>{imp}</p>
              </div>
            ))}
          </SortableCard>
        );

      case "similar_startups":
        if (!result.similar_startups?.length) return null;
        return (
          <SortableCard key={id} id={id} label={label} G={G} BG={BG} SHADOW_OUT={SHADOW_OUT}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "10px" }}>
              {result.similar_startups.map((s, i) => (
                <div key={i} style={{ background: BG, borderRadius: "12px", padding: "16px", boxShadow: SHADOW_IN }}>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#2d3a1a", margin: "0 0 6px" }}>{s.name}</p>
                  <p style={{ fontSize: "11px", color: "#7a9a50", margin: "0 0 8px", lineHeight: "1.5" }}>{s.description}</p>
                  <p style={{ fontSize: "11px", color: "#2d3a1a", margin: "0", lineHeight: "1.5", background: "#e8f0e0", padding: "6px 10px", borderRadius: "8px" }}>💡 {s.relevance}</p>
                </div>
              ))}
            </div>
          </SortableCard>
        );

      default: return null;
    }
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map(section => renderSection(section))}
        </SortableContext>
      </DndContext>
      <style>{`
        .edit-btn { opacity: 0; }
        @media (max-width: 768px) {
          .edit-btn { opacity: 1 !important; }
          .comp-edit { display: block !important; }
          .fin-edit { display: block !important; }
        }
        @media (min-width: 769px) {
          div:hover > div > .edit-btn { opacity: 1 !important; }
        }
      `}</style>
    </>
  );
}