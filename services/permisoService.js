import { db } from "../database/mysql.js";


export async function obtenerRol(telefono){

    const [rows] = await db.execute(
        `
        SELECT
            rol,
            candidato_id,
            nombre
        FROM operadores
        WHERE telefono=?
        LIMIT 1
        `,
        [
            telefono
        ]
    );


    if(rows.length===0){
        return null;
    }


    return rows[0];

}