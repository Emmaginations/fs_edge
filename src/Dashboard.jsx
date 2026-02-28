// src/Dashboard.jsx
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import CompetitionCard from "./components/CompetitionCard";

export default function Dashboard({ onSelectCompetition }) {
  const [competitions, setCompetitions] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("All");

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    const { data } = await supabase
      .from("Competition") // 🔴 Replace if needed
      .select("*");

    setCompetitions(data || []);

    const uniqueYears = [...new Set(data.map((c) => c.year))];
    setYears(uniqueYears);
  };

  const filtered =
    selectedYear === "All"
      ? competitions
      : competitions.filter((c) => c.year === selectedYear);

  return (
    <div className="page-container">
      <div className="header-row">
        <h1>Dashboard</h1>

        <div className="header-actions">
          <button>Add Competition</button>
          <br/>
          <button>Manage My Team</button>
          <br/>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option>All</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card-grid">
        {filtered.map((comp) => (
          <CompetitionCard
            key={comp.id}
            competition={comp}
            onClick={() => onSelectCompetition(comp)}
          />
        ))}
      </div>
    </div>
  );
}