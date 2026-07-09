import { useState } from "react";
import { RecordCard } from "../../components/RecordCard";
import { StatusBadge } from "../../components/StatusBadge";
import { Phase0JudgementCard } from "./Phase0JudgementCard";
import { createPhase0Judgement } from "./phase0-heuristics";
import type { Phase0JudgementDraft, Phase0MessyRecord } from "./phase0-types";

const kindOptions: Array<Phase0JudgementDraft["possibleKind"]> = [
  "help_request_candidate",
  "site_status_candidate",
  "task_candidate",
  "assignment_candidate",
  "announcement_candidate",
  "unknown",
];

const confidenceOptions: Array<Phase0JudgementDraft["confidence"]> = [
  "low",
  "medium",
  "high",
];

const nextStepOptions: Array<Phase0JudgementDraft["suggestedNextStep"]> = [
  "keep_raw",
  "ask_for_more_info",
  "send_to_human_review",
  "create_candidate_report",
  "create_site_update_suggestion",
  "do_not_use_yet",
];

const nextStepLabels: Record<
  Phase0JudgementDraft["suggestedNextStep"],
  string
> = {
  keep_raw: "保留原始資訊",
  ask_for_more_info: "補充資訊",
  send_to_human_review: "送交人工確認",
  create_candidate_report: "建立候選回報",
  create_site_update_suggestion: "建立現場更新建議",
  do_not_use_yet: "暫時不要使用",
};

const confidenceLabels: Record<Phase0JudgementDraft["confidence"], string> = {
  low: "低",
  medium: "中",
  high: "高",
};

function createSeedDraft(
  record: Phase0MessyRecord,
  index: number,
): Phase0JudgementDraft {
  const baseDraft = createPhase0Judgement(record);
  const recordIndex = index + 1;

  const possibleKind =
    recordIndex === 1
      ? "help_request_candidate"
      : recordIndex === 2
        ? "announcement_candidate"
        : recordIndex === 3
          ? "site_status_candidate"
          : recordIndex === 4
            ? "task_candidate"
            : recordIndex === 5
              ? "site_status_candidate"
              : "unknown";

  const confidence: Phase0JudgementDraft["confidence"] =
    recordIndex <= 3 ? "medium" : "low";

  const suggestedNextStep: Phase0JudgementDraft["suggestedNextStep"] =
    recordIndex === 1
      ? "ask_for_more_info"
      : recordIndex === 2
        ? "send_to_human_review"
        : recordIndex === 3
          ? "create_site_update_suggestion"
          : recordIndex === 4
            ? "send_to_human_review"
            : recordIndex === 5
              ? "do_not_use_yet"
              : "send_to_human_review";

  const evidence = [
    `原文提到：${record.rawText}`.slice(0, 140),
    "這筆內容看起來像候選資訊，但仍缺少確認來源與時間。",
  ];

  const blockers = [
    "原文不足以確認是否為正式任務或官方狀態。",
    "資料尚未經過現場確認，不能直接轉成行動。",
  ];

  const humanReviewNote =
    recordIndex === 1 || recordIndex === 5
      ? "人類建議先請現場志工或負責單位確認這筆資訊的真實性與地點。"
      : undefined;

  return {
    ...baseDraft,
    possibleKind,
    confidence,
    evidence,
    blockers,
    suggestedNextStep,
    unsafeToActDirectly: true,
    humanReviewNote,
  };
}

function buildInitialDrafts(records: Phase0MessyRecord[]) {
  return Object.fromEntries(
    records
      .slice(0, 6)
      .map((record, index) => [record.id, createSeedDraft(record, index)]),
  ) as Record<string, Phase0JudgementDraft>;
}

function textToList(raw: string) {
  return raw
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function Phase0Workbench({
  records,
  selectedRecordId,
  onSelect,
}: {
  records: Phase0MessyRecord[];
  selectedRecordId: string;
  onSelect: (recordId: string) => void;
}) {
  const selectedRecord =
    records.find((record) => record.id === selectedRecordId) ?? records[0];
  const safetyBoundary = createPhase0Judgement(selectedRecord);
  const [drafts, setDrafts] = useState<Record<string, Phase0JudgementDraft>>(
    () => buildInitialDrafts(records),
  );

  if (!selectedRecord) {
    return <div className="workbench">目前沒有可整理的原始資訊。</div>;
  }

  const activeDraft = drafts[selectedRecord.id];
  const displayDraft = activeDraft ?? createPhase0Judgement(selectedRecord);
  const reviewNotes = Object.values(drafts).filter(
    (draft) => draft.humanReviewNote,
  );

  function updateDraft(recordId: string, patch: Partial<Phase0JudgementDraft>) {
    setDrafts((current) => ({
      ...current,
      [recordId]: {
        ...(current[recordId] ?? createSeedDraft(selectedRecord, 0)),
        ...patch,
      },
    }));
  }

  function createDraft(record: Phase0MessyRecord) {
    const index = records.findIndex((item) => item.id === record.id);
    setDrafts((current) => ({
      ...current,
      [record.id]: createSeedDraft(record, index >= 0 ? index : 0),
    }));
  }

  function resetDraft(record: Phase0MessyRecord) {
    const index = records.findIndex((item) => item.id === record.id);
    setDrafts((current) => ({
      ...current,
      [record.id]: createSeedDraft(record, index >= 0 ? index : 0),
    }));
  }

  function deleteDraft(recordId: string) {
    setDrafts((current) => {
      const next = { ...current };
      delete next[recordId];
      return next;
    });
  }

  return (
    <div className="workbench">
      <div className="workbench__intro">
        <p className="eyebrow">整理工作台</p>
        <h2>第一階段的成功不是分類正確，而是把為什麼現在還不能判斷說清楚。</h2>
        <p>
          這裡先把草稿做成可編輯的候選判斷，讓小組能在不把原始資訊當成已確認事實的前提下，記錄疑點與下一步。
        </p>
        <p className="workbench__summary">
          已建立 {Object.keys(drafts).length} 筆整理草稿
        </p>
      </div>

      <div className="workbench__layout">
        <aside className="workbench__queue" aria-label="選擇原始資訊">
          {records.map((record) => {
            const draftForRecord = drafts[record.id];
            const confidence = draftForRecord?.confidence ?? "low";
            const queueClassName = [
              record.id === selectedRecord.id ? "active" : "",
              `confidence-${confidence}`,
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                className={queueClassName}
                key={record.id}
                type="button"
                onClick={() => onSelect(record.id)}
              >
                <span className="workbench__queue-title">{record.id}</span>
                <span className="workbench__queue-meta">
                  {drafts[record.id] ? "已建草稿" : "未建草稿"}
                </span>
                <StatusBadge status={record.verificationStatus} />
                <span className="confidence-pill confidence-pill--queue">
                  <span className="confidence-icon" aria-hidden="true">
                    {confidence === "high"
                      ? "●"
                      : confidence === "medium"
                        ? "◐"
                        : "◌"}
                  </span>
                  {
                    confidenceLabels[
                      confidence as Phase0JudgementDraft["confidence"]
                    ]
                  }
                </span>
              </button>
            );
          })}
        </aside>

        <div className="workbench__main">
          <RecordCard
            record={selectedRecord}
            confidence={displayDraft.confidence}
            confidenceLabel={confidenceLabels[displayDraft.confidence]}
          />

          {activeDraft ? (
            <article
              className={`judgement-card confidence-${displayDraft.confidence}`}
            >
              <div className="judgement-card__header">
                <div>
                  <p className="eyebrow">整理草稿</p>
                  <h3>{selectedRecord.id} 的候選判斷</h3>
                </div>
                <div className="workbench__header-actions">
                  <span
                    className={`confidence-pill confidence-${displayDraft.confidence}`}
                  >
                    <span className="confidence-icon" aria-hidden="true">
                      {displayDraft.confidence === "high"
                        ? "●"
                        : displayDraft.confidence === "medium"
                          ? "◐"
                          : "◌"}
                    </span>
                    信心：{confidenceLabels[displayDraft.confidence]}
                  </span>
                  <div className="workbench__draft-actions">
                    <button
                      type="button"
                      onClick={() => resetDraft(selectedRecord)}
                    >
                      重設草稿
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDraft(selectedRecord.id)}
                    >
                      刪除草稿
                    </button>
                  </div>
                </div>
              </div>

              <div className="workbench__summary-grid">
                <div>
                  <dt>候選類型</dt>
                  <dd>{activeDraft.possibleKind}</dd>
                </div>
                <div>
                  <dt>建議下一步</dt>
                  <dd>{nextStepLabels[activeDraft.suggestedNextStep]}</dd>
                </div>
                <div>
                  <dt>是否不可直接行動</dt>
                  <dd>{activeDraft.unsafeToActDirectly ? "是" : "否"}</dd>
                </div>
              </div>

              <div className="workbench__draft-form">
                <label>
                  候選類型
                  <select
                    value={activeDraft.possibleKind}
                    onChange={(event) =>
                      updateDraft(selectedRecord.id, {
                        possibleKind: event.target
                          .value as Phase0JudgementDraft["possibleKind"],
                      })
                    }
                  >
                    {kindOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  信心程度
                  <select
                    value={activeDraft.confidence}
                    onChange={(event) =>
                      updateDraft(selectedRecord.id, {
                        confidence: event.target
                          .value as Phase0JudgementDraft["confidence"],
                      })
                    }
                  >
                    {confidenceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  下一步
                  <select
                    value={activeDraft.suggestedNextStep}
                    onChange={(event) =>
                      updateDraft(selectedRecord.id, {
                        suggestedNextStep: event.target
                          .value as Phase0JudgementDraft["suggestedNextStep"],
                      })
                    }
                  >
                    {nextStepOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                證據
                <textarea
                  value={activeDraft.evidence.join("\n")}
                  onChange={(event) =>
                    updateDraft(selectedRecord.id, {
                      evidence: textToList(event.target.value),
                    })
                  }
                />
              </label>

              <label>
                卡住的地方
                <textarea
                  value={activeDraft.blockers.join("\n")}
                  onChange={(event) =>
                    updateDraft(selectedRecord.id, {
                      blockers: textToList(event.target.value),
                    })
                  }
                />
              </label>

              <label className="workbench__checkbox">
                <input
                  checked={activeDraft.unsafeToActDirectly}
                  type="checkbox"
                  onChange={(event) =>
                    updateDraft(selectedRecord.id, {
                      unsafeToActDirectly: event.target.checked,
                    })
                  }
                />
                是否不可直接行動
              </label>

              <label>
                人類修正 / 質疑
                <textarea
                  value={activeDraft.humanReviewNote ?? ""}
                  onChange={(event) =>
                    updateDraft(selectedRecord.id, {
                      humanReviewNote: event.target.value || undefined,
                    })
                  }
                />
              </label>
            </article>
          ) : (
            <article className="judgement-card">
              <p>尚未建立整理草稿。</p>
              <button type="button" onClick={() => createDraft(selectedRecord)}>
                建立草稿
              </button>
            </article>
          )}

          <Phase0JudgementCard
            judgement={safetyBoundary}
            record={selectedRecord}
          />
        </div>

        <aside className="workbench__checklist">
          <h3>第一階段完成檢查</h3>
          <ul>
            <li>Starter 已載入 {records.length} 筆原始資訊</li>
            <li>已建立編輯與重設整理草稿的互動</li>
            <li>至少讓 6 筆原始資訊被嘗試整理成可編輯草稿</li>
            <li>至少挑 2 個候選判斷由人類質疑或修正</li>
            <li>
              把資料品質問題寫進 observations，並記錄 agent 哪裡不能直接相信
            </li>
          </ul>

          <section className="workbench__review-list">
            <h4>人工質疑摘要</h4>
            {reviewNotes.length === 0 ? (
              <p>目前沒有人工質疑內容。</p>
            ) : (
              reviewNotes.map((draft) => (
                <div className="review-note" key={draft.messyRecordId}>
                  <strong>{draft.messyRecordId}</strong>
                  <p>{draft.humanReviewNote}</p>
                </div>
              ))
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
