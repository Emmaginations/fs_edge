// src/components/ResultsTable.jsx
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

/**
 * ResultsTable
 * Props:
 *  - competition: competition object
 *  - teamId: the team id for the current tab (may be null for an empty tab)
 *  - onUpdated: callback to parent to refresh aggregates after edits
 *
 * Features:
 *  - fetches results for given team & competition (includes event & skater)
 *  - filtering by event and skater
 *  - sorting by event_order or points, ascending/descending
 *  - inline editing of points via <input> that updates DB on blur
 */

export default function ResultsTable({ competition, teamId, onUpdated }) {
  const [results, setResults] = useState([]);
  const [events, setEvents] = useState([]);
  const [skaters, setSkaters] = useState([]);
  const [filterEventId, setFilterEventId] = useState("");
  const [filterSkaterId, setFilterSkaterId] = useState("");
  const [sortBy, setSortBy] = useState("event_order"); // or "points"
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchMeta = useCallback(async () => {
    // fetch all events (for dropdown)
    const { data: eventData } = await supabase
      .from("Event") // 🔴 Replace if needed
      .select("id, name, event_order");

    setEvents(eventData || []);

    // fetch skaters for this team
    if (teamId) {
      const { data: skaterData } = await supabase
        .from("Skater") // 🔴 Replace if needed
        .select("id, name")
        .eq("team_id", teamId);
      setSkaters(skaterData || []);
    } else {
      setSkaters([]);
    }
  }, [teamId]);

  const fetchResults = useCallback(async () => {
    if (!teamId) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error: rErr } = await supabase
        .from("Result")
        .select(
          `
            id,
            placement,
            group_size,
            points,
            event_id,
            event:Event(id, name, event_order),
            skater_id,
            skater:Skater(id, name)
          `
        )
        .eq("competition_id", competition.id)
        .eq("team_id", teamId);

      if (rErr) throw rErr;

      setResults(data || []);
    } catch (err) {
      console.error("fetchResults error:", err);
      setError("Failed to load results.");
    } finally {
      setLoading(false);
    }
  }, [competition.id, teamId]);

  useEffect(() => {
    fetchMeta();
    fetchResults();
  }, [fetchMeta, fetchResults]);

  // Derived filtered + sorted array
  const visible = results
    .filter((r) => (filterEventId ? r.event_id === filterEventId : true))
    .filter((r) => (filterSkaterId ? r.skater_id === filterSkaterId : true))
    .sort((a, b) => {
      if (sortBy === "event_order") {
        const ao = a.event?.event_order ?? 0;
        const bo = b.event?.event_order ?? 0;
        return sortDir === "asc" ? ao - bo : bo - ao;
      } else {
        const ap = Number(a.points ?? 0);
        const bp = Number(b.points ?? 0);
        return sortDir === "asc" ? ap - bp : bp - ap;
      }
    });

  // Update points cell
  const updatePoints = async (resultId, newPoints) => {
    // Basic validation numeric
    const parsed = Number(newPoints);
    if (Number.isNaN(parsed)) {
      alert("Points must be a number.");
      return;
    }

    try {
      const { error: updErr } = await supabase
        .from("Result")
        .update({ points: parsed })
        .eq("id", resultId);
      if (updErr) throw updErr;

      // update local UI
      setResults((prev) => prev.map((r) => (r.id === resultId ? { ...r, points: parsed } : r)));
      // signal parent to refresh aggregates
      if (onUpdated) await onUpdated();
    } catch (err) {
      console.error("updatePoints err:", err);
      setError("Failed to update points.");
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <h4 style={{ marginBottom: 8 }}>Results</h4>
        <button onClick={() => { setFilterEventId(""); setFilterSkaterId(""); setSortBy("event_order"); setSortDir("asc"); }}>
          Reset Filters
        </button>
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <select value={filterEventId} onChange={(e) => setFilterEventId(e.target.value)}>
          <option value="">All Events</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>

        <select value={filterSkaterId} onChange={(e) => setFilterSkaterId(e.target.value)}>
          <option value="">All Skaters</option>
          {skaters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="event_order">Order by Event Order</option>
          <option value="points">Order by Points</option>
        </select>

        <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      {loading ? (
        <div>Loading results…</div>
      ) : (
        <div className="table-wrapper">
          <table className="results-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                <th style={{ padding: 8 }}>Event Order</th>
                <th style={{ padding: 8 }}>Event</th>
                <th style={{ padding: 8 }}>Skater</th>
                <th style={{ padding: 8 }}>Placement</th>
                <th style={{ padding: 8 }}>Group Size</th>
                <th style={{ padding: 8 }}>Points (click to edit)</th>
              </tr>
            </thead>

            <tbody>
              {visible.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #fafafa" }}>
                  <td style={{ padding: 8 }}>{r.event?.event_order ?? ""}</td>
                  <td style={{ padding: 8 }}>{r.event?.name ?? ""}</td>
                  <td style={{ padding: 8 }}>{r.skater?.name ?? ""}</td>
                  <td style={{ padding: 8 }}>{r.placement}</td>
                  <td style={{ padding: 8 }}>{r.group_size}</td>
                  <td style={{ padding: 8 }}>
                    <InlinePointsEditor value={r.points} onSave={(newVal) => updatePoints(r.id, newVal)} />
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 12, textAlign: "center", color: "#666" }}>
                    No results to show
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
    </div>
  );
}

/**
 * InlinePointsEditor - small controlled input used inside the table to edit points.
 * Saves on blur or when Enter is pressed.
 */
function InlinePointsEditor({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");

  useEffect(() => {
    setVal(value ?? "");
  }, [value]);

  return editing ? (
    <input
      type="number"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (String(val) !== String(value)) onSave(val);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          setVal(value ?? "");
          setEditing(false);
        }
      }}
      style={{ width: 100 }}
      autoFocus
    />
  ) : (
    <div
      onClick={() => setEditing(true)}
      style={{ minWidth: 60, cursor: "pointer", padding: "6px 8px", borderRadius: 6, border: "1px dashed transparent" }}
      title="Click to edit"
    >
      {value ?? 0}
    </div>
  );
}