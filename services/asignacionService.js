import { db } from "../database/mysql.js";


// ======================================
// GUARDAR ASIGNACIÓN
// ======================================

export async function guardarAsignacion(
    datos
) {

    const {
        operador,
        cedula,
        nombre,
        apellido,
        local,
        mesa,
        orden,
        celular,
        ciudad,
        candidato_id
    } = datos;


    await db.execute(
        `INSERT INTO asignaciones
        (
            operador_telefono,
            cedula,
            nombre,
            apellido,
            local,
            mesa,
            orden,
            celular,
            ciudad,
            candidato_id
        )
        VALUES (?,?,?,?,?,?,?,?,?,?)

        ON DUPLICATE KEY UPDATE

            nombre=VALUES(nombre),
            apellido=VALUES(apellido),
            local=VALUES(local),
            mesa=VALUES(mesa),
            orden=VALUES(orden),
            celular=VALUES(celular),
            ciudad=VALUES(ciudad),
            candidato_id=VALUES(candidato_id),
            fechahora=CURRENT_TIMESTAMP
        `,
        [
            operador,
            cedula,
            nombre,
            apellido,
            local,
            mesa,
            orden,
            celular,
            ciudad,
            candidato_id
        ]
    );

}