import { db } from "../database/mysql.js";

import {
    consultarPadron
} from "../services/padronService.js";


export async function manejarVotacion(
    sock,
    from,
    cleanText,
    telefono,
    userState,
    modo
) {


    // ===================================================
    // CONSULTAR CEDULA EN MODO VOTACION
    // ===================================================

    if (modo === "VOTACION" && /^\d+$/.test(cleanText)) {

        try {

            const ciudadano =
                await consultarPadron(cleanText);


            if (!ciudadano) {

                await sock.sendMessage(from,{
                    text:
                    `❌ No se encontró la C.I. ${cleanText}`
                });

                return true;
            }


            const [votoRegistrado] =
            await db.execute(
                `SELECT
                    voto,
                    voto_fecha,
                    voto_operador
                 FROM asignaciones
                 WHERE cedula = ?
                 AND voto = 'S'
                 LIMIT 1`,
                [
                    ciudadano.CEDULA
                ]
            );


            if (votoRegistrado.length > 0) {

                const registro =
                    votoRegistrado[0];


                await sock.sendMessage(from,{
                    text:
`⚠️ *PERSONA YA REGISTRADA COMO VOTANTE*

👤 ${ciudadano.NOMBRE} ${ciudadano.APELLIDO}

🆔 C.I.
${ciudadano.CEDULA}

✅ Voto registrado

🕒 ${new Date(registro.voto_fecha)
.toLocaleString("es-PY")}

👤 Operador:
${registro.voto_operador}`
                });


                return true;
            }



            userState[from] = {

                action:"preguntar_voto",

                cedula: ciudadano.CEDULA,

                datos:{
                    nombre: ciudadano.NOMBRE,
                    apellido: ciudadano.APELLIDO,
                    local: ciudadano.local,
                    mesa: ciudadano.MESA || null,
                    orden: ciudadano.ORDEN || null
                }
            };



            await sock.sendMessage(from,{
                text:
`🗳️ *CONTROL DE VOTACIÓN*

👤 ${ciudadano.NOMBRE} ${ciudadano.APELLIDO}

🆔 C.I.
${ciudadano.CEDULA}

🏫 Local:
${ciudadano.local || "-"}

━━━━━━━━━━━━━━

¿La persona ya votó?

*S* = Sí
*N* = No`
            });


            return true;


        } catch(err) {

            console.error(err);

            await sock.sendMessage(from,{
                text:
                "❌ Error consultando votación."
            });

            return true;
        }
    }


    return false;

}