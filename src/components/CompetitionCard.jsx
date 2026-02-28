// src/components/CompetitionCard.jsx
export default function CompetitionCard({ competition, onClick }) {
  return (
    <div className="competition-card" onClick={onClick}>
      <h3>{competition.title}</h3>
      <p>Total Score: {competition.total_score}</p> {/* 🔴 Replace */}
      <p>Placement: {competition.placement}</p> {/* 🔴 Replace */}
    </div>
  );
}