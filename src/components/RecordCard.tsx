import { SourceLabel } from "./SourceLabel";
import { StatusBadge } from "./StatusBadge";
import { formatDateTime } from "../lib/date";

type RecordLike = {
  id: string;
  title?: string;
  name?: string;
  rawText?: string;
  description?: string;
  sourceType: string;
  verificationStatus: string;
  updatedAt: string;
};

export function RecordCard({
  record,
  confidence,
  confidenceLabel,
}: {
  record: RecordLike;
  confidence?: string;
  confidenceLabel?: string;
}) {
  const title = record.title ?? record.name ?? record.id;
  const description = record.rawText ?? record.description;
  const containerClassName = confidence
    ? `record-card confidence-${confidence}`
    : "record-card";

  const confidenceIcon =
    confidence === "high" ? "●" : confidence === "medium" ? "◐" : "◌";

  return (
    <article className={containerClassName}>
      <div className="record-card__header">
        <h3>{title}</h3>
        <StatusBadge status={record.verificationStatus} />
      </div>
      {description ? <p>{description}</p> : null}
      <div className="record-card__meta">
        <SourceLabel sourceType={record.sourceType} />
        {confidenceLabel ? (
          <span
            className="confidence-pill confidence-pill--inline"
            aria-label={`信心等級 ${confidenceLabel}`}
          >
            <span className="confidence-icon" aria-hidden="true">
              {confidenceIcon}
            </span>
            信心：{confidenceLabel}
          </span>
        ) : null}
        <span>更新：{formatDateTime(record.updatedAt)}</span>
      </div>
    </article>
  );
}
