import { db } from "../database/mysql.js";

// =====================================
// ALTA CANDIDATO
// =====================================

export async function altaCandidato({
    nombre,
    apellido,
    cargo,
    ciudad,
    departamento,
    distrito
}){

    const [existe] = await db.execute(
        `SELECT id
         FROM candidatos
         WHERE nombre=? 
           AND apellido=?
         LIMIT 1`,
        [
            nombre,
            apellido
        ]
    );

    if(existe.length){
        return false;
    }

    await db.execute(
        `INSERT INTO candidatos
        (
            nombre,
            apellido,
            cargo,
            ciudad,
            departamento,
            distrito,
            activo
        )
        VALUES (?,?,?,?,?,?,'S')`,
        [
            nombre,
            apellido,
            cargo,
            ciudad,
            departamento,
            distrito
        ]
    );

    return true;
}

// =====================================
// LISTAR CANDIDATOS
// =====================================

export async function listarCandidatos(){

    const [rows] = await db.execute(

        `SELECT
            id,
            nombre,
            apellido,
            cargo,
            ciudad,
            activo
         FROM candidatos
         ORDER BY ciudad,nombre`

    );

    return rows;

}

// =====================================
// BUSCAR CANDIDATO
// =====================================

export async function obtenerCandidato(texto){

    const [rows]=await db.execute(

        `SELECT *
        FROM candidatos
        WHERE
            id=?
            OR nombre LIKE ?
            OR apellido LIKE ?
        LIMIT 1`,

        [
            Number(texto)||0,
            `%${texto}%`,
            `%${texto}%`
        ]

    );

    return rows[0] || null;

}

