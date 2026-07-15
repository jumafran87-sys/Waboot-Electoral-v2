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


// ======================================
// ACTUALIZAR CELULAR
// ======================================

export async function actualizarCelular(
    operador,
    cedula,
    celular
) {

    const [resultado] = await db.execute(
        `UPDATE asignaciones
            SET celunew = ?,
                fechahora = CURRENT_TIMESTAMP
          WHERE operador_telefono = ?
            AND cedula = ?`,
        [
            celular,
            operador,
            cedula
        ]
    );

    return resultado;

}


// ======================================
// ACTUALIZAR UBICACIÓN
// ======================================

export async function actualizarUbicacion(
    operador,
    cedula,
    ubicacion
) {

    const [resultado] = await db.execute(
        `UPDATE asignaciones
            SET ubi = ?,
                fechahora = CURRENT_TIMESTAMP
          WHERE operador_telefono = ?
            AND cedula = ?`,
        [
            ubicacion,
            operador,
            cedula
        ]
    );

    return resultado;

}


// ======================================
// ACTUALIZAR OBSERVACIÓN
// ======================================

export async function actualizarObservacion(
    operador,
    cedula,
    observacion
) {

    const [resultado] = await db.execute(
        `UPDATE asignaciones
            SET observacion = ?,
                fechahora = CURRENT_TIMESTAMP
          WHERE operador_telefono = ?
            AND cedula = ?`,
        [
            observacion,
            operador,
            cedula
        ]
    );

    return resultado;

}