import { db } from "../database/mysql.js";


export async function guardarRechazo({

    cedula,
    operador,
    candidato_id,
    distrito_persona,
    distrito_permitido

}) {


    await db.execute(

        `
        INSERT INTO historial_rechazos
        (
            cedula,
            operador_telefono,
            candidato_id,
            distrito_persona,
            distrito_permitido
        )
        VALUES (?,?,?,?,?)
        `,

        [
            cedula,
            operador,
            candidato_id,
            distrito_persona,
            distrito_permitido
        ]

    );

}