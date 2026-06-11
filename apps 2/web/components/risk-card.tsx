import type { RiskScore } from "@sentinel/shared";

interface RiskCardProps {
  risk: RiskScore;
}

export function RiskCard({ risk }: RiskCardProps) {
  return (
    <section className={`risk-card risk-${risk.color.toLowerCase()}`}>
      <p className="eyebrow">Live Risk Score</p>
      <div className="risk-main">
        <strong>{risk.score}</strong>
        <span>{risk.color}</span>
      </div>
      <ul>
        {risk.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </section>
  );
}
