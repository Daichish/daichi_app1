export function formatYen(amount) {
  return `¥${amount.toLocaleString("ja-JP")}`;
}