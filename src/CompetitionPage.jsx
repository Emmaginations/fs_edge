// src/CompetitionPage.jsx
import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import SummaryTable from "./components/SummaryTable";
import ResultsTable from "./components/ResultsTable";
import AddResultForm from "./components/AddResultForm";
import * as XLSX from "xlsx";

/**
 * 🔴 REPLACE: Set this to your university's team id (or adapt to derive from user session).
 * If you derive the "our team" id from the logged-in user, replace this logic accordingly.
 */
const OUR_TEAM_ID = "REPLACE_WITH_OUR_TEAM_ID";

export default function CompetitionPage({ competition, onBack }) {
  const [topTeams, setTopTeams] = useState([]); // [{teamId, name, totalPoints, starts}]
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // fetch all results for the competition (joined with team, event, skater)
  const fetchCompetitionResults = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // We pull full results for this competition and include related event, team and skater metadata.
      // NOTE: The select below uses foreign table selects: adjust keys if your foreign key names differ.
      // 🔴 REPLACE table/relationship names if different in your DB.
      const { data: teamsData, error: teamErr } = await supabase
        .from("Team")
        .select("id, name");

      if (teamErr) throw teamErr;
      
      const { data: results, error: fetchErr } = await supabase
        .from("Result") // 🔴 Replace if your results table has a different name
        .select(
          `
            id,
            placement,
            group_size,
            points,
            event_id,
            event:Event(id, name, event_order),
            skater_id,
            skater:Skater(id, name),
            team_id,
            team:Team(id, name)
          `
        )
        .eq("competition_id", competition.id);

      if (fetchErr) throw fetchErr;

      // Group by team to compute totals and starts
      const teamMap = new Map();

      teamsData.forEach((t) => {
      teamMap.set(t.id, {
          teamId: t.id,
          name: t.name,
          totalPoints: 0,
          starts: 0,
          results: [],
      });
      });

      // Then apply results on top
      (results || []).forEach((r) => {
      const entry = teamMap.get(r.team_id);
      if (entry) {
          entry.totalPoints += Number(r.points ?? 0);
          entry.starts += 1;
          entry.results.push(r);
      }
      });

      // Convert to array and sort descending by totalPoints
      const teamsArr = Array.from(teamMap.values()).sort(
        (a, b) => b.totalPoints - a.totalPoints
      );

      teamsArr.forEach((t) => {
        t.pointsPerStart =
          t.starts > 0 ? +(t.totalPoints / t.starts).toFixed(3) : 0;
      });

      setTopTeams(teamsArr);

      // default selected team: OUR_TEAM_ID if present else first top team
      const hasOurTeam = teamsArr.some((t) => t.teamId === OUR_TEAM_ID);
      if (hasOurTeam) {
        setSelectedTeamId(OUR_TEAM_ID);
      } else {
        setSelectedTeamId((prev) => prev ?? teamsArr[0]?.teamId ?? null);
      }
    } catch (err) {
      console.error("Error fetching competition results:", err);
      setError(err.message || "Failed to load competition data.");
    } finally {
      setLoading(false);
    }
  }, [competition.id]);

  useEffect(() => {
    fetchCompetitionResults();
  }, [fetchCompetitionResults]);

  // Refresh callback used by child components after changes (add / edit)
  const refreshAll = async () => {
    await fetchCompetitionResults();
  };

  // Download Excel report with 5 sheets (ordered by event_order)
  const generateExcel = async () => {
    setLoading(true);
    try {
      const wb = XLSX.utils.book_new();

      // For each top team, pull their results ordered by event.event_order
      for (let t of topTeams) {
        let resultsForTeam = [];
        if (t.teamId) {
          const { data: teamResults, error: rErr } = await supabase
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
            .eq("team_id", t.teamId)
            //.order("event(event_order)", { foreignTable: "Event", ascending: true }); // supabase supports .order on foreign table using this option in newer versions; if not supported, we'll sort in JS

          if (rErr) throw rErr;

          // If ordering by event via supabase not available, fallback to sorting in JS:
          resultsForTeam = (teamResults || []).sort((a, b) => {
            const ao = a.event?.event_order ?? 0;
            const bo = b.event?.event_order ?? 0;
            return ao - bo;
          });
        } else {
          // empty sheet case
          resultsForTeam = [];
        }

        // Format for sheet: include event order and human columns
        const rows = resultsForTeam.map((r) => ({
          "Event Order": r.event?.event_order ?? "",
          "Event Name": r.event?.name ?? "",
          "Skater": r.skater?.name ?? "",
          "Placement": r.placement,
          "Group Size": r.group_size,
          "Points": r.points,
        }));

        // Ensure sheet exists even if empty
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [
          { "Event Order": "", "Event Name": "", "Skater": "", "Placement": "", "Group Size": "", "Points": "" }
        ]);
        const sheetName = t.name?.slice(0, 31) || `Team ${t.teamId ?? "?"}`; // Excel sheet name max length 31
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      const filename = `${competition.title} Results.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Excel generation failed:", err);
      setError("Failed to generate Excel file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <button onClick={onBack}>← Back</button>
        <h1 style={{ margin: 0, alignItems: "center"}}>{competition.title}</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={generateExcel} disabled={loading}>
            {loading ? "Generating..." : "Generate Excel Report"}
          </button>
        </div>

      </div>

      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

      <SummaryTable teams={topTeams} />

      <div className="results-card"style={{ marginTop: 18 }}>
        <div className="tabs" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {topTeams.map((t, idx) => (
            <button
              key={idx}
              className={t.teamId === selectedTeamId ? "active-tab" : ""}
              onClick={() => setSelectedTeamId(t.teamId)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: t.teamId === selectedTeamId ? "2px solid navy" : "1px solid #ddd",
                background: t.teamId === selectedTeamId ? "#e9f2ff" : "white",
              }}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 16 }} > 
          {/* Add Result section (above the table for the selected tab) */}
          
          <AddResultForm
            competition={competition}
            teamId={selectedTeamId}
            onAdded={() => refreshAll()}
          />

          
            {/* Results table */}
            <ResultsTable
                competition={competition}
                teamId={selectedTeamId}
                onUpdated={() => refreshAll()}
            />
        </div>
      </div>
    </div>
  );
}