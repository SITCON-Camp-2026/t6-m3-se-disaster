const labels: Record<string, string> = {
  field_report: "現場回報",
  phone_call: "電話",
  social_post: "社群轉錄",
  official_notice: "官方公告",
  volunteer_update: "志工更新",
  mock: "模擬資料",
};

const sourceColors: Record<string, string> = {
  field_report: "source-field",
  phone_call: "source-phone",
  social_post: "source-social",
  official_notice: "source-official",
  volunteer_update: "source-volunteer",
  mock: "source-mock",
};

export function SourceLabel({ sourceType }: { sourceType: string }) {
  const colorClass = sourceColors[sourceType] ?? "source-default";

  return (
    <span className={`source-label ${colorClass}`}>
      來源：{labels[sourceType] ?? sourceType}
    </span>
  );
}
