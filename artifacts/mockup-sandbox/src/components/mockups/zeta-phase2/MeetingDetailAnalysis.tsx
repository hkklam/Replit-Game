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

const tabs = ["Summary", "Action Items", "Decisions", "Open Questions", "Transcript"] as const;
type Tab = (typeof tabs)[number];

export function MeetingDetailAnalysis() {
  const [activeTab, setActiveTab] = useState<Tab>("Action Items");

  const tabContent: Record<Tab, React.ReactNode> = {
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
        </p>
      </div>
    ),
    "Action Items": (
      <div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: green.muted }}>
              {["Owner", "Task", "Due Date", "Priority", "Status"].map((h) => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: green.mutedFg, fontWeight: 600, borderBottom: `1px solid ${green.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { owner: "Harry", task: "Confirm tank vendor", due: "May 9", priority: "High", pColor: "#c0392b", status: "Open", sColor: "#e67e22" },
              { owner: "Sarah", task: "Follow up on freight quote", due: "May 7", priority: "High", pColor: "#c0392b", status: "In Progress", sColor: "#2980b9" },
              { owner: "Mike", task: "Update engineering drawings", due: "May 12", priority: "Medium", pColor: "#d68910", status: "Open", sColor: "#e67e22" },
              { owner: "Harry", task: "Send revised P&ID to client", due: "May 14", priority: "Low", pColor: "#27ae60", status: "Done", sColor: "#27ae60" },
            ].map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${green.border}`, background: i % 2 === 0 ? "#fff" : green.muted + "55" }}>
                <td style={{ padding: "9px 12px", color: green.fg, fontWeight: 500 }}>{row.owner}</td>
                <td style={{ padding: "9px 12px", color: green.fg }}>{row.task}</td>
                <td style={{ padding: "9px 12px", color: green.mutedFg }}>{row.due}</td>
                <td style={{ padding: "9px 12px" }}>
                  <span style={{ background: row.pColor + "18", color: row.pColor, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{row.priority}</span>
                </td>
                <td style={{ padding: "9px 12px" }}>
                  <span style={{ background: row.sColor + "18", color: row.sColor, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{row.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
    Decisions: (
      <ol style={{ paddingLeft: 20, color: green.fg, fontSize: 14, lineHeight: 1.9 }}>
        <li>Proceed with 250 psig design pressure for the blowdown tank.</li>
        <li>Use Superior Transport as the primary freight carrier, pending final quote.</li>
        <li>Engineering drawings will be submitted to the client after the May 14 call.</li>
      </ol>
    ),
    "Open Questions": (
      <ol style={{ paddingLeft: 20, color: green.fg, fontSize: 14, lineHeight: 1.9 }}>
        <li>Final freight quote from Superior Transport — still outstanding.</li>
        <li>Client sign-off on revised P&ID — awaiting confirmation from project manager.</li>
        <li>Long lead time for pressure relief valves — vendor lead time unknown.</li>
      </ol>
    ),
    Transcript: (
      <div style={{ fontFamily: "monospace", fontSize: 13, color: green.fg, lineHeight: 1.8 }}>
        {[
          ["0:00", "Harry: Alright let's get started. Today we're reviewing the blowdown tank spec for McMaster."],
          ["0:14", "Sarah: I've got the sizing calc ready. Based on the boiler HP it comes out to a 200 gallon tank."],
          ["0:31", "Harry: That works. Design pressure is 250 psig, confirmed with the site engineer last week."],
          ["1:02", "Mike: I still need the final P&ID revision from the client before I can update the drawings."],
          ["1:18", "Harry: I'll chase that. Also Sarah, can you follow up on the freight quote? We need it by May 7."],
          ["1:35", "Sarah: Will do. Superior Transport said they'd have it by end of week."],
        ].map(([ts, text]) => (
          <div key={ts} style={{ display: "flex", gap: 12, marginBottom: 8 }}>
            <span style={{ color: green.mutedFg, flexShrink: 0, minWidth: 36 }}>{ts}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    ),
  };

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
            { label: "Record", active: false },
            { label: "History", active: true },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 6, background: item.active ? green.primary : "transparent", color: item.active ? green.primaryFg : green.mutedFg, fontWeight: item.active ? 600 : 400, fontSize: 14, cursor: "pointer" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={item.label === "Record" ? "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2" : "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"}/></svg>
              {item.label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", padding: "36px 48px" }}>
        <div style={{ maxWidth: 800 }}>
          {/* Back */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: green.mutedFg, fontSize: 13, marginBottom: 20, cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back to History
          </div>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${green.border}` }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: green.fg, marginBottom: 6 }}>McMaster Project Call</h1>
              <div style={{ display: "flex", gap: 16, fontSize: 13, color: green.mutedFg }}>
                <span>May 2, 2025 &nbsp;2:30 PM</span>
                <span>·</span>
                <span>34 min 12 sec</span>
                <span>·</span>
                <span style={{ color: green.primary, fontWeight: 600 }}>$0.22 total</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: green.card, color: green.fg, border: `1px solid ${green.border}`, borderRadius: 6, fontWeight: 500, fontSize: 13, cursor: "pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Transcript
              </button>
              <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: green.primary, color: green.primaryFg, border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Excel
              </button>
              <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", background: green.card, color: "#c0392b", border: `1px solid ${green.border}`, borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            </div>
          </div>

          {/* Analysis tabs card */}
          <div style={{ background: green.card, border: `1px solid ${green.border}`, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ display: "flex", borderBottom: `1px solid ${green.border}`, background: green.muted, overflowX: "auto" }}>
              {tabs.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ whiteSpace: "nowrap", padding: "11px 18px", fontSize: 13, fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? green.primary : green.mutedFg, background: activeTab === tab ? green.card : "transparent", border: "none", borderBottom: activeTab === tab ? `2px solid ${green.primary}` : "2px solid transparent", cursor: "pointer", marginBottom: -1 }}>
                  {tab}
                  {tab === "Action Items" && <span style={{ marginLeft: 6, background: green.primary, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 11 }}>4</span>}
                </button>
              ))}
            </div>
            <div style={{ padding: 20 }}>
              {tabContent[activeTab]}
            </div>
            <div style={{ padding: "10px 20px", borderTop: `1px solid ${green.border}`, background: green.muted, fontSize: 12, color: green.mutedFg }}>
              Whisper: <strong style={{ color: green.fg }}>$0.18</strong> &nbsp;|&nbsp; Analysis: <strong style={{ color: green.fg }}>$0.04</strong> &nbsp;|&nbsp; Total: <strong style={{ color: green.primary }}>$0.22</strong>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
