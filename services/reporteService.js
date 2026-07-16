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

            SUM(voto='S') votos,

            SUM(celunew IS NOT NULL 
                AND celunew<>'') celulares,

            SUM(ubi IS NOT NULL 
                AND ubi<>'') ubicaciones,

            SUM(observacion IS NOT NULL 
                AND observacion<>'') observaciones

        FROM asignaciones

        WHERE candidato_id=?

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