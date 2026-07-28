import { db } from "../database/mysql.js";

// =====================================================
// OBTENER ZONA DEL OPERADOR
// =====================================================

export async function obtenerZonaOperador(telefono){

    const [rows] = await db.execute(
        `
        SELECT
            c.departamento,
            c.distrito
        FROM operadores o
        INNER JOIN candidatos c
            ON c.id = o.candidato_id
        WHERE o.telefono = ?
        LIMIT 1
        `,
        [telefono]
    );

    if(rows.length === 0){
        return null;
    }

    return rows[0];
}

// =====================================================
// OBTENER ROL DEL OPERADOR
// =====================================================

export async function obtenerRol(telefono){

    const [rows] = await db.execute(
        `
        SELECT
            rol,
            candidato_id,
            nombre
        FROM operadores
        WHERE telefono = ?
        LIMIT 1
        `,
        [telefono]
    );

    if(rows.length === 0){
        return null;
    }

    return rows[0];
}