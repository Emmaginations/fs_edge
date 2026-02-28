// src/components/AddResultForm.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

/**
 * AddResultForm
 * Props:
 *  - competition: competition object
 *  - teamId: team id for which to add result (may be null -> disables form)
 *  - onAdded: callback to parent to refresh
 *
 * Behavior:
 *  - Select Event (from Event table)
 *  - Select Skater (Skater records tied to team)
 *  - Input placement and group size (numbers)
 *  - On Add: look up Point table for points matching placement & group_size, then insert Result
 *  - Refresh parent via onAdded
 */

export default function AddResultForm({ competition, teamId, onAdded }) {
  const [events, setEvents] = useState([]);
  const [skaters, setSkaters] = useState([]);
  const [eventId, setEventId] = useState("");
  const [skaterId, setSkaterId] = useState("");
  const [placement, setPlacement] = useState("");
  const [resultsUrl, setresultsUrl] = useState("");
  const [groupSize, setGroupSize] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMeta = async () => {
      // events (global)
      const { data: evData } = await supabase
        .from("Event") // 🔴 Replace if needed
        .select("id, name, event_order")
        .order("event_order", { ascending: true });
      setEvents(evData || []);

      if (teamId) {
        const { data: skData } = await supabase
          .from("Skater") // 🔴 Replace if needed
          .select("id, name")
          .eq("team_id", teamId);

        setSkaters(skData || []);
      } else {
        setSkaters([]);
      }
    };

    fetchMeta();
  }, [teamId]);

  const resetForm = () => {
    setEventId("");
    setSkaterId("");
    setPlacement("");
    setGroupSize("");
  };

  const handleAdd = async () => {
    setError("");
    if (!teamId) {
      setError("No team selected for this tab.");
      return;
    }
    if (!eventId || !placement || !groupSize) {
      setError("Event, placement, and group size are required.");
      return;
    }

    setLoading(true);
    try {
      // lookup point value from Point table
      const { data: pointRec, error: pErr } = await supabase
        .from("Point") // 🔴 Replace if needed (table that maps placement+group_size -> points)
        .select("points")
        .eq("placement", Number(placement))
        .eq("group_size", Number(groupSize))
        .single();

      if (pErr) {
        console.warn("Point lookup returned error (no exact match?)", pErr);
        // If no exact match found, either handle specially or set points = 0
      }

      const pointsValue = pointRec?.points ?? 0;

      // Insert Result
      const payload = {
        competition_id: competition.id,
        team_id: teamId,
        event_id: eventId,
        skater_id: skaterId || null,
        placement: Number(placement),
        group_size: Number(groupSize),
        points: pointsValue,
      };

      const { error: insErr } = await supabase.from("Result").insert(payload);
      if (insErr) throw insErr;

      resetForm();
      if (onAdded) await onAdded();
    } catch (err) {
      console.error("AddResult error:", err);
      setError("Failed to add result.");
    } finally {
      setLoading(false);
    }
  };

  async function scrapeEvent(eventName, url) {
    const response = await fetch(
        "https://YOUR_PROJECT_ID.functions.supabase.co/scrape-results",
        {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            url: url,
            event_name: eventName
        })
        }
    )

    const data = await response.json()
    console.log(data)
  }

  return (
    <div style={{ marginBottom: 12, padding: 0, background: "white", borderRadius: 10 }}>
      <h4 style={{ marginTop: 0 }}>Add Result</h4>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={eventId} onChange={(e) => setEventId(e.target.value)} style={{ minWidth: 200 }}>
          <option value="">Select Event</option>
          {events.map((ev) => (
            <option value={ev.id} key={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>

        <select value={skaterId} onChange={(e) => setSkaterId(e.target.value)} style={{ minWidth: 180 }}>
          <option value="">(No skater)</option>
          {skaters.map((s) => (
            <option value={s.id} key={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Placement"
          value={placement}
          onChange={(e) => setPlacement(e.target.value)}
          style={{ width: 110 }}
        />

        <input
          type="number"
          placeholder="Group Size"
          value={groupSize}
          onChange={(e) => setGroupSize(e.target.value)}
          style={{ width: 110 }}
        />
        
      </div>
      <button onClick={handleAdd} disabled={loading}>
          {loading ? "Adding…" : "Add"}
      </button>
      {/* <p>Or add from URL: </p>
      <input 
        value={resultsUrl}
        onChange={(e) => setresultsUrl(e.target.value)}>
      </input> */}
      <button onClick={() => scrapeEvent(events.find(e => e.id === eventId)?.name, resultsUrl)}>
          {"Add from URL"}
      </button>

      {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
    </div>
  );
}