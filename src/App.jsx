// src/App.jsx
import { useState } from "react";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";
import CompetitionPage from "./CompetitionPage";

function App() {
  const [user, setUser] = useState(null);
  const [selectedCompetition, setSelectedCompetition] = useState(null);

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  if (selectedCompetition) {
    return (
      <CompetitionPage
        competition={selectedCompetition}
        onBack={() => setSelectedCompetition(null)}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      onSelectCompetition={setSelectedCompetition}
    />
  );
}

export default App;