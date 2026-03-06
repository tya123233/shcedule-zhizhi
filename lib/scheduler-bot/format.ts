export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatFullDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function formatDurationMs(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "未记录";
  }

  if (value < 1000) {
    return `${value.toFixed(0)}ms`;
  }

  return `${(value / 1000).toFixed(1)}s`;
}
