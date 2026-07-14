export function formatearWaMe(num) {
  if (!num) return "-";
  let n = num.toString().replace(/\D/g, "");
  n = n.replace(/^0+/, "");
  if (n.startsWith("595")) return `wa.me/${n}`;
  if (n.startsWith("9")) return `wa.me/595${n}`;
  return `wa.me/595${n}`;
}
export async function obtenerModoBot() {

    const [rows] = await db.execute(
        "SELECT modo FROM config_bot WHERE id=1"
    );

    return rows.length
        ? rows[0].modo
        : "CONSULTA";
}
