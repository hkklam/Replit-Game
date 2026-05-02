import { useState } from "react";

const green = {
  bg: "#f8f7f5",
  card: "#ffffff",
  border: "#d6e4dc",
  primary: "#3a6b52",
  primaryFg: "#ffffff",
  fg: "#1a3327",
  muted: "#f1f5f2",
  mutedFg: "#6b8f7a",
  sidebar: "#ffffff",
};

const tabs = ["Summary", "Action Items", "Decisions", "Open Questions"] as const;
type Tab = (typeof tabs)[number];

const mockData = {
  Summary: (
    <div className="space-y-3">
      <p style={{ color: green.fg, lineHeight: 1.7, fontSize: 14 }}>
        The team reviewed the blowdown tank sizing specifications for the McMaster boiler
        project. Harry confirmed the 250 psig design pressure is appropriate given site
        constraints. The freight quote from Superior Transport remains outstanding and is
        blocking the final procurement decision.
      </p>
      <p style={{ color: green.fg, lineHeight: 1.7, fontSize: 14 }}>
        Action was assigned to Harry to confirm the tank vendor by May 9. The team agreed
        to proceed with the current engineering drawings pending the freight quote resolution.
        Next call scheduled for May 14.
      </p>
    </div>
  ),
  "Action Items": (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ background: green.muted }}>
          {["Owner", "Task", "Due Date", "Priority"].map((h) => (
            <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: green.mutedFg, fontWeight: 600, borderBottom: `1px solid ${green.border}` }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[
          { owner: "Harry", task: "Confirm tank vendor", due: "May 9", priority: "High", priorityColor: "#c0392b" },
          { owner: "Sarah", task: "Follow up on freight quote", due: "May 7", priority: "High", priorityColor: "#c0392b" },
          { owner: "Mike", task: "Update engineering drawings", due: "May 12", priority: "Medium", priorityColor: "#d68910" },
          { owner: "Harry", task: "Send revised P&ID to client", due: "May 14", priority: "Low", priorityColor: "#27ae60" },
        ].map((row, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${green.border}` }}>
            <td style={{ padding: "9px 12px", color: green.fg, fontWeight: 500 }}>{row.owner}</td>
            <td style={{ padding: "9px 12px", color: green.fg }}>{row.task}</td>
            <td style={{ padding: "9px 12px", color: green.mutedFg }}>{row.due}</td>
            <td style={{ padding: "9px 12px" }}>
              <span style={{ background: row.priorityColor + "18", color: row.priorityColor, padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{row.priority}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
  Decisions: (
    <ol style={{ paddingLeft: 20, color: green.fg, fontSize: 14, lineHeight: 1.8 }}>
      <li>Proceed with 250 psig design pressure for the blowdown tank.</li>
      <li>Use Superior Transport as the primary freight carrier, pending final quote.</li>
      <li>Engineering drawings will be submitted to the client after the May 14 call.</li>
    </ol>
  ),
  "Open Questions": (
    <ol style={{ paddingLeft: 20, color: green.fg, fontSize: 14, lineHeight: 1.8 }}>
      <li>Final freight quote from Superior Transport — still outstanding.</li>
      <li>Client sign-off on revised P&ID — awaiting confirmation from project manager.</li>
      <li>Long lead time for pressure relief valves — vendor lead time unknown.</li>
    </ol>
  ),
};

export function RecordResult() {
  const [activeTab, setActiveTab] = useState<Tab>("Summary");

  return (
    <div style={{ display: "flex", height: "100vh", background: green.bg, fontFamily: "system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: green.sidebar, borderRight: `1px solid ${green.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "24px 20px 16px", fontWeight: 700, fontSize: 16, color: green.primary, display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          ZETA Notes
        </div>
        <nav style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { label: "Record", active: true, icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2" },
            { label: "History", active: false, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 6, background: item.active ? green.primary : "transparent", color: item.active ? green.primaryFg : green.mutedFg, fontWeight: item.active ? 600 : 400, fontSize: 14, cursor: "pointer" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={item.icon}/></svg>
              {item.label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", padding: "40px 48px" }}>
        <div style={{ maxWidth: 720 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: green.fg, marginBottom: 4 }}>New Meeting</h1>
          <p style={{ color: green.mutedFg, fontSize: 14, marginBottom: 28 }}>Record your meeting and get a clean transcript instantly.</p>

          {/* Recording card */}
          <div style={{ background: green.card, border: `1px solid ${green.border}`, borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: green.fg, marginBottom: 6 }}>Meeting Name</label>
              <div style={{ padding: "9px 14px", border: `1px solid ${green.border}`, borderRadius: 7, fontSize: 14, color: green.fg, background: green.bg }}>McMaster Project Call</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#c0392b", color: "#fff", border: "none", borderRadius: 7, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                Stop Recording
              </button>
              <span style={{ fontSize: 13, color: "#c0392b", fontWeight: 600 }}>● 14:32</span>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${green.border}`, fontSize: 13, color: green.mutedFg }}>
              Recording in progress… Speak clearly for best transcription results.
            </div>
          </div>

          {/* Analysis results */}
          <div style={{ background: green.card, border: `1px solid ${green.border}`, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: `1px solid ${green.border}`, background: green.muted }}>
              {tabs.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "11px 18px", fontSize: 13, fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? green.primary : green.mutedFg, background: activeTab === tab ? green.card : "transparent", border: "none", borderBottom: activeTab === tab ? `2px solid ${green.primary}` : "2px solid transparent", cursor: "pointer", marginBottom: -1 }}>
                  {tab}
                  {tab === "Action Items" && <span style={{ marginLeft: 6, background: green.primary, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 11 }}>4</span>}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ padding: 20 }}>
              {mockData[activeTab]}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${green.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: green.muted }}>
              <div style={{ fontSize: 12, color: green.mutedFg }}>
                Whisper: <strong style={{ color: green.fg }}>$0.18</strong> &nbsp;|&nbsp; Analysis: <strong style={{ color: green.fg }}>$0.04</strong> &nbsp;|&nbsp; Total: <strong style={{ color: green.primary }}>$0.22</strong>
              </div>
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: green.primary, color: green.primaryFg, border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Excel
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
