import { db } from "../database/mysql.js";


// ======================================
// REPORTE GENERAL ADMIN
// ======================================

export async function obtenerReporteGeneral() {

    const [[reporte]] = await db.execute(

        `
        SELECT

            COUNT(*) total,

            SUM(voto='S') votos,

            SUM(celunew IS NOT NULL 
                AND celunew<>'') celulares,

            SUM(ubi IS NOT NULL 
                AND ubi<>'') ubicaciones,

            SUM(observacion IS NOT NULL 
                AND observacion<>'') observaciones

        FROM asignaciones
        `

    );


    return reporte;

}



// ======================================
// REPORTE CANDIDATO
// ======================================

export async function obtenerReporteCandidato(
    candidato_id
) {

    const [[reporte]] = await db.execute(

        `
        SELECT

            COUNT(*) total,

            SUM(a.voto='S') votos,

            SUM(a.celunew IS NOT NULL 
                AND a.celunew<>'') celulares,

            SUM(a.ubi IS NOT NULL 
                AND a.ubi<>'') ubicaciones,

            SUM(a.observacion IS NOT NULL 
                AND a.observacion<>'') observaciones

        FROM asignaciones a

        INNER JOIN candidatos c
        ON c.id = a.candidato_id

        WHERE a.candidato_id=?

        AND a.ciudad = c.ciudad

        `,

        [
            candidato_id
        ]

    );

    return reporte;

}



// ======================================
// REPORTE OPERADOR
// ======================================

export async function obtenerReporteOperador(
    telefono
) {


    const [[reporte]] = await db.execute(

        `
        SELECT

            COUNT(*) total,

            SUM(voto='S') votos

        FROM asignaciones

        WHERE operador_telefono=?

        `,

        [
            telefono
        ]

    );


    return reporte;

}

// ======================================
// BUSCAR CANDIDATO
// ======================================

export async function buscarCandidato(texto) {

    const [rows] = await db.execute(

        `
        SELECT
            id,
            nombre,
            apellido,
            cargo,
            ciudad

        FROM candidatos

        WHERE
            UPPER(nombre) LIKE UPPER(?)
            OR UPPER(apellido) LIKE UPPER(?)
            OR UPPER(ciudad) LIKE UPPER(?)

        ORDER BY
            nombre,
            apellido

        LIMIT 10
        `,

        [
            `%${texto}%`,
            `%${texto}%`,
            `%${texto}%`
        ]

    );

    return rows;

}

