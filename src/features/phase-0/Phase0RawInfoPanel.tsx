import { useMemo, useState } from "react";
import { SourceLabel } from "../../components/SourceLabel";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDateTime } from "../../lib/date";
import type { Phase0JudgementDraft, Phase0MessyRecord } from "./phase0-types";

const confidenceLabels: Record<Phase0JudgementDraft["confidence"], string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export function inferConfidence(recordId: string) {
  const recordOrder = Number(recordId.replace(/^[^-]+-/, ""));
  if (Number.isNaN(recordOrder)) {
    return "low" as Phase0JudgementDraft["confidence"];
  }

  const highQualityIds = ["M-009", "M-010"];
  const mediumQualityIds = ["M-003", "M-006", "M-008"];
  const cautionIds = ["M-001", "M-004", "M-005", "M-007", "M-011", "M-012"];

  if (highQualityIds.includes(recordId)) {
    return "high" as Phase0JudgementDraft["confidence"];
  }

  if (mediumQualityIds.includes(recordId)) {
    return "medium" as Phase0JudgementDraft["confidence"];
  }

  if (cautionIds.includes(recordId)) {
    return "low" as Phase0JudgementDraft["confidence"];
  }

  if (recordOrder <= 3) {
    return "medium" as Phase0JudgementDraft["confidence"];
  }

  return "low" as Phase0JudgementDraft["confidence"];
}

export function buildFilterCounts(records: Phase0MessyRecord[]) {
  const sourceCounts = new Map<string, number>([["all", records.length]]);
  const confidenceCounts = {
    all: records.length,
    high: 0,
    medium: 0,
    low: 0,
  };

  records.forEach((record) => {
    const currentSourceCount = sourceCounts.get(record.sourceType) ?? 0;
    sourceCounts.set(record.sourceType, currentSourceCount + 1);

    const confidence = inferConfidence(record.id);
    confidenceCounts[confidence] += 1;
  });

  return { sourceCounts, confidenceCounts };
}

export function Phase0RawInfoPanel({
  records,
  selectedRecordId,
  onSelect,
}: {
  records: Phase0MessyRecord[];
  selectedRecordId: string;
  onSelect: (recordId: string) => void;
}) {
  const [activeSource, setActiveSource] = useState<string>("all");
  const [activeConfidence, setActiveConfidence] = useState<string>("all");
  const sourceFilters = useMemo(() => {
    const filters = new Set<string>(["all"]);
    records.forEach((record) => filters.add(record.sourceType));
    return Array.from(filters);
  }, [records]);

  const { sourceCounts, confidenceCounts } = useMemo(
    () => buildFilterCounts(records),
    [records],
  );
  const confidenceFilters = useMemo(() => ["all", "high", "medium", "low"], []);

  const visibleRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesSource =
        activeSource === "all" || record.sourceType === activeSource;
      const confidence = inferConfidence(record.id);
      const matchesConfidence =
        activeConfidence === "all" || confidence === activeConfidence;

      return matchesSource && matchesConfidence;
    });
  }, [activeConfidence, activeSource, records]);

  return (
    <div className="phase0-raw">
      <div className="panel__header">
        <div>
          <h2>原始資訊</h2>
          <p>這些還不是整理後資料，不能直接當成行動依據。</p>
        </div>
        <p>{records.length} 筆資料</p>
      </div>

      <div className="source-filters" aria-label="來源和信心篩選">
        <div className="filter-group filter-group--actions">
          <button
            type="button"
            className="filter-reset"
            onClick={() => {
              setActiveSource("all");
              setActiveConfidence("all");
            }}
          >
            清除篩選
          </button>
        </div>

        <div className="filter-group">
          <span className="filter-group__label">來源</span>
          {sourceFilters.map((source) => {
            const labelMap: Record<string, string> = {
              all: "全部",
              social_post: "社群轉錄",
              volunteer_update: "志工更新",
              field_report: "現場回報",
              official_notice: "官方公告",
              phone_call: "電話",
            };
            const label = labelMap[source] ?? source;

            const count = sourceCounts.get(source) ?? 0;

            const sourceColor =
              source === "all"
                ? "neutral"
                : source === "official_notice"
                  ? "green"
                  : source === "volunteer_update"
                    ? "red"
                    : source === "field_report"
                      ? "blue"
                      : source === "phone_call"
                        ? "purple"
                        : "orange";

            return (
              <button
                key={source}
                type="button"
                className={activeSource === source ? "active" : ""}
                data-source-color={sourceColor}
                onClick={() => setActiveSource(source)}
              >
                <span>{label}</span>
                <span className="filter-count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="filter-group">
          <span className="filter-group__label">信心</span>
          {confidenceFilters.map((confidence) => {
            const labelMap: Record<string, string> = {
              all: "全部",
              high: "高",
              medium: "中",
              low: "低",
            };
            const label = labelMap[confidence] ?? confidence;

            const count =
              confidenceCounts[confidence as keyof typeof confidenceCounts] ??
              0;

            return (
              <button
                key={confidence}
                type="button"
                className={activeConfidence === confidence ? "active" : ""}
                data-confidence={confidence}
                onClick={() => setActiveConfidence(confidence)}
              >
                <span>{label}</span>
                <span className="filter-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid">
        {visibleRecords.map((record) => {
          const confidence = inferConfidence(record.id);
          const cautionIds = [
            "M-001",
            "M-004",
            "M-005",
            "M-007",
            "M-011",
            "M-012",
          ];
          const needsCaution = cautionIds.includes(record.id);
          const className = [
            "record-card",
            `confidence-${confidence}`,
            needsCaution ? "record-card--caution" : "",
            record.id === selectedRecordId ? "record-card--selected" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <article className={className} key={record.id}>
              <div className="record-card__header">
                <h3>{record.id}</h3>
                <StatusBadge status={record.verificationStatus} />
              </div>
              <p>{record.rawText}</p>
              <div className="record-card__meta">
                <SourceLabel sourceType={record.sourceType} />
                <span className="confidence-pill confidence-pill--inline">
                  <span className="confidence-icon" aria-hidden="true">
                    {confidence === "high"
                      ? "●"
                      : confidence === "medium"
                        ? "◐"
                        : "◌"}
                  </span>
                  信心：{confidenceLabels[confidence]}
                </span>
                <span>更新：{formatDateTime(record.updatedAt)}</span>
              </div>
              <button type="button" onClick={() => onSelect(record.id)}>
                送到整理工作台
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
