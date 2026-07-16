import { db } from "../database/mysql.js";


export async function guardarHistorialVoto({

    cedula,
    operador,
    candidato_id,
    estado,
    ciudad,
    botTelefono

}) {


    await db.execute(

        `INSERT INTO historial_votos
        (
            cedula,
            operador_telefono,
            candidato_id,
            estado,
            ciudad,
            bot_telefono
        )
        VALUES (?,?,?,?,?,?)`,

        [
            cedula,
            operador,
            candidato_id,
            estado,
            ciudad,
            botTelefono
        ]

    );

}