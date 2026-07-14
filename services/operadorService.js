import { db } from "../database/mysql.js";

export async function validarOperador(telefono) {

    const [rows] = await db.execute(
        `SELECT *
           FROM operadores
          WHERE telefono = ?
            AND activo = 1
          LIMIT 1`,
        [telefono]
    );

    if (rows.length === 0) {
        return null;
    }

    return rows[0];
}

export async function altaOperador(
    telefono,
    nombre
) {

    await db.execute(
        `INSERT INTO operadores
            (telefono,nombre,activo)
         VALUES
            (?, ?,1)
         ON DUPLICATE KEY UPDATE
            nombre=VALUES(nombre),
            activo=1`,
        [
            telefono,
            nombre
        ]
    );

}

export async function obtenerOperador(
    telefono
) {

    const [rows] = await db.execute(
        `SELECT *
           FROM operadores
          WHERE telefono=?
          LIMIT 1`,
        [telefono]
    );

    return rows[0] || null;

}