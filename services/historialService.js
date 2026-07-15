import { db } from "../database/mysql.js";

export async function guardarHistorial({

    asignacion_id,
    operador,
    accion,
    anterior,
    nuevo

}) {

    await db.execute(

        `INSERT INTO historial_asignaciones
        (
            asignacion_id,
            operador,
            accion,
            valor_anterior,
            valor_nuevo
        )
        VALUES (?,?,?,?,?)`,

        [
            asignacion_id,
            operador,
            accion,
            anterior,
            nuevo
        ]

    );

}