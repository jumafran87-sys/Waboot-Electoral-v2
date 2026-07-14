import { db } from "../database/mysql.js";

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

        console.log("⚠️ No existe config_bot. Usando modo CONSULTA");

        return "CONSULTA";
    }

}

export async function cambiarModoBot(modo) {

    await db.execute(
        `UPDATE config_bot
            SET modo = ?
          WHERE id = 1`,
        [modo.toUpperCase()]
    );

}