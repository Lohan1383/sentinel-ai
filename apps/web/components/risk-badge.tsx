import type { RiskColor } from "@sentinel/shared";
import type { CSSProperties } from "react";
import styles from "./sentinel-app.module.css";

interface RiskBadgeProps {
  score: number;
  color: RiskColor;
}

export function RiskBadge({ score, color }: RiskBadgeProps) {
  const boundedScore = Math.max(0, Math.min(100, score));
  const style = { "--risk-score": `${boundedScore}%` } as CSSProperties;

  return (
    <div className={styles.riskBadge} style={style}>
      <div className={styles.riskBadgeHeader}>
        <span className={styles.riskScoreValue}>{boundedScore}</span>
        <span className={`${styles.riskState} ${styles[color]}`}>{color.toUpperCase()}</span>
      </div>
      <div className={styles.riskTrack}>
        <div className={styles.riskFill} />
      </div>
      <div className={styles.riskMeta}>Live location risk score (0 to 100)</div>
    </div>
  );
}
