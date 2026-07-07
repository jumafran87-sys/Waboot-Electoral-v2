import { db } from "../database/mysql.js";

export async function consultarPadron(cedula) {
  try {

    let nombreTablaPadron = "regciv";

    // Configuración opcional
    try {
      const [config] = await db.execute(
        "SELECT tabla_padron FROM config_eleccion WHERE estado = 1 LIMIT 1"
      );

      if (config.length > 0) {
        nombreTablaPadron = config[0].tabla_padron;
      }

    } catch (err) {
      console.log("⚠️ Sin tabla config_eleccion, usando:", nombreTablaPadron);
    }


  const query = `
  SELECT 
    r.CEDULA,
    r.NOMBRE,
    r.APELLIDO,
    r.FEC_NAC,
    r.SEXO,
    d.DESCRIP AS departamento,
    di.DESCRIP AS distrito,
    l.DESCRIP AS local
  FROM ${nombreTablaPadron} r
  LEFT JOIN dep d 
         ON d.DEPART = r.DEPART
  LEFT JOIN dis di 
         ON di.DEPART = r.DEPART
        AND di.DISTRITO = r.DISTRITO
  LEFT JOIN loc l 
         ON l.DPTO = r.DEPART
        AND l.DISTRITO = r.DISTRITO
        AND l.ZONA = r.ZONA
        AND l.LOCAL = r.LOCAL
  WHERE r.CEDULA = ?
  LIMIT 1;
`;


    const [rows] = await db.execute(query, [cedula]);

    return rows.length > 0 ? rows[0] : null;

  } catch (error) {
    console.error("❌ Error al consultar el padrón real:", error);
    throw error;
  }
}