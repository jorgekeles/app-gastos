type SummaryCardProps = {
  label: string;
  value: string;
  description?: string;
  tone?: "neutral" | "primary" | "good" | "warning" | "danger";
};

export function SummaryCard({
  label,
  value,
  description,
  tone = "neutral",
}: SummaryCardProps) {
  return (
    <article className={`summary-card tone-${tone}`}>
      <span className="summary-kicker">{label}</span>
      <strong className="summary-value">{value}</strong>
      {description ? <p className="summary-description">{description}</p> : null}
    </article>
  );
}
