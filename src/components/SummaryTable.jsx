// src/components/SummaryTable.jsx
import React from "react";

/**
 * SummaryTable
 * Props:
 *  - teams: [{ teamId, name, totalPoints, starts, pointsPerStart }]
 *
 * Renders a small table of top five teams with placement, name, total points,
 * starts (out of 30) and points/start (calculated).
 */
export default function SummaryTable({ teams = [] }) {
  return (
    <div className="summary-card" style={{
      marginTop: 12,
      padding: 12,
      background: "white",
      borderRadius: 10,
      boxShadow: "0 8px 20px rgba(0,0,0,0.06)"
    }}>
      <h3 style={{ marginTop: 0 }}>Top 5 Summary</h3>

      <div className='table-wrapper'>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={{ padding: "8px 6px" }}>Placement</th>
              <th style={{ padding: "8px 6px" }}>Team</th>
              <th style={{ padding: "8px 6px" }}>Points</th>
              <th style={{ padding: "8px 6px" }}>Starts (of 30)</th>
              <th style={{ padding: "8px 6px" }}>Points / Start</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t, i) => (
              <tr key={t.teamId ?? `placeholder-${i}`} style={{ borderBottom: "1px solid #fafafa" }}>
                <td style={{ padding: "10px 6px", fontWeight: 700 }}>{i + 1}</td>
                <td style={{ padding: "10px 6px" }}>{t.name || "—"}</td>
                <td style={{ padding: "10px 6px" }}>{t.totalPoints ?? 0}</td>
                <td style={{ padding: "10px 6px" }}>{t.starts ?? 0} / 30</td>
                <td style={{ padding: "10px 6px" }}>{t.pointsPerStart ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}