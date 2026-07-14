import { db } from "../database/mysql.js";


// =====================================================
// OBTENER TABLA PADRON ACTIVA
// =====================================================

async function obtenerTablaPadron() {

  let nombreTablaPadron = "regciv";

  try {

    const [config] = await db.execute(
      "SELECT tabla_padron FROM config_eleccion WHERE estado = 1 LIMIT 1"
    );


    if (config.length > 0) {

      nombreTablaPadron = config[0].tabla_padron;

    }


  } catch (err) {

    console.log(
      "⚠️ Sin tabla config_eleccion, usando:",
      nombreTablaPadron
    );

  }


  return nombreTablaPadron;
}




// =====================================================
// CONSULTA POR CÉDULA
// =====================================================

export async function consultarPadron(cedula) {

  try {


    const nombreTablaPadron =
      await obtenerTablaPadron();



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



    const [rows] =
      await db.execute(query,[cedula]);



    return rows.length > 0
      ? rows[0]
      : null;



  } catch(error) {


    console.error(
      "❌ Error al consultar padrón:",
      error
    );


    throw error;

  }

}




// =====================================================
// BUSCAR POR NOMBRE / APELLIDO
// =====================================================

export async function buscarPorNombre(nombreCompleto) {


  try {


    const nombreTablaPadron =
      await obtenerTablaPadron();



    const palabras =
      nombreCompleto
        .trim()
        .split(/\s+/);



    let query = `

    SELECT

      CEDULA,
      NOMBRE,
      APELLIDO,
      DEPART,
      DISTRITO


    FROM ${nombreTablaPadron}


    WHERE

    `;



    const params = [];



    if (palabras.length >= 2) {


      query += `

      (
        (NOMBRE LIKE ? AND APELLIDO LIKE ?)

        OR

        (NOMBRE LIKE ? AND APELLIDO LIKE ?)

      )

      `;


      params.push(

        `%${palabras[0]}%`,
        `%${palabras[1]}%`,

        `%${palabras[1]}%`,
        `%${palabras[0]}%`

      );



    } else {


      query += `

      (
        NOMBRE LIKE ?

        OR

        APELLIDO LIKE ?

      )

      `;


      params.push(

        `%${palabras[0]}%`,
        `%${palabras[0]}%`

      );

    }



    query += ` LIMIT 5;`;



    const [rows] =
      await db.execute(query,params);



    return rows;



  } catch(error) {


    console.error(
      "❌ Error búsqueda nombre:",
      error
    );


    throw error;

  }

}