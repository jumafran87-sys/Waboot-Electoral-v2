export function formatearWaMe(num) {
  if (!num) return "-";
  let n = num.toString().replace(/\D/g, "");
  n = n.replace(/^0+/, "");
  if (n.startsWith("595")) return `wa.me/${n}`;
  if (n.startsWith("9")) return `wa.me/595${n}`;
  return `wa.me/595${n}`;
}