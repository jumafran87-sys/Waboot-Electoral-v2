import { db } from "../database/mysql.js";


// ===================================================
// OBTENER MODO GLOBAL DEL BOT
// ===================================================

export async function obtenerModoBot() {

    try {

        const [rows] = await db.execute(
            "SELECT modo FROM config_bot WHERE id = 1"
        );

        if (rows.length > 0) {
            return rows[0].modo;
        }

        return "CONSULTA";

    } catch (err) {

        console.log(
            "⚠️ No existe config_bot. Usando modo CONSULTA"
        );

        return "CONSULTA";
    }

}


// ===================================================
// CAMBIAR MODO GLOBAL DEL BOT
// ===================================================

export async function cambiarModoBot(modo) {

    await db.execute(
        `
        UPDATE config_bot
           SET modo = ?
         WHERE id = 1
        `,
        [
            modo.toUpperCase()
        ]
    );

}


// ===================================================
// OBTENER MODO SEGÚN CANDIDATO
// ===================================================

export async function obtenerModoBotPorCandidato(candidatoId) {

    const id = Number(candidatoId);

    // =================================================
    // CANDIDATO 2 - OSCAR CUENCA
    // SIEMPRE VOTACION
    // =================================================

    if (id === 2) {

        return "VOTACION";

    }


    // =================================================
    // RESTO DE CANDIDATOS
    // USA EL MODO GLOBAL
    // =================================================

    return await obtenerModoBot();

}