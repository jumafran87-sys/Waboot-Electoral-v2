import { db } from "../database/mysql.js";

import {
    consultarPadron
} from "../services/padronService.js";

import {
    obtenerZonaOperador
} from "../services/permisoService.js";


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

            const ciudadano = await consultarPadron(cleanText);

            // ===================================================
            // PERSONA NO ENCONTRADA
            // ===================================================

            if (!ciudadano) {

                await sock.sendMessage(from, {
                    text:
                        "No se encontro la C.I. " + cleanText
                });

                return true;
            }


            // ===================================================
            // OBTENER ZONA DEL OPERADOR
            // ===================================================

            const zonaOperador =
                await obtenerZonaOperador(telefono);


            const departamentoOperador =
                zonaOperador?.departamento ?? null;


            const distritoOperador =
                zonaOperador?.distrito ?? null;


            // ===================================================
            // DATOS DEL CIUDADANO
            // ===================================================

            const departamentoCiudadano =
                ciudadano.DEPART ?? null;


            const distritoCiudadano =
                ciudadano.DISTRITO ?? null;


            console.log(
                "VALIDACION VOTACION:",
                {
                    telefono,
                    departamentoOperador,
                    distritoOperador,
                    departamentoCiudadano,
                    distritoCiudadano
                }
            );


            // ===================================================
            // VALIDAR MUNICIPIO
            // ===================================================

            const perteneceOtroMunicipio =
                String(departamentoOperador) !==
                    String(departamentoCiudadano)
                ||
                String(distritoOperador) !==
                    String(distritoCiudadano);


            // ===================================================
            // PERSONA DE OTRO MUNICIPIO
            // ===================================================

            if (perteneceOtroMunicipio) {

                await sock.sendMessage(from, {
    text:
        "⚠️ PERSONA PERTENECE A OTRO MUNICIPIO\n\n" +

        "👤 " +
        ciudadano.NOMBRE + " " +
        ciudadano.APELLIDO + "\n\n" +

        "🆔 C.I.\n" +
        ciudadano.CEDULA + "\n\n" +

        "📍 Departamento\n" +
        (ciudadano.departamento || "-") + "\n\n" +

        "🏙️ Distrito\n" +
        (ciudadano.distrito || "-") + "\n\n" +

        "🏫 Local de votación\n" +
        (ciudadano.local || "-") + "\n\n" +

        "━━━━━━━━━━━━━━\n\n" +

        "⚠️ Esta persona pertenece a:\n" +
        (ciudadano.distrito || "-") + "\n\n" +

        "📌 Tu municipio:\n" +
        (zonaOperador?.municipio ||
         zonaOperador?.distrito ||
         "-") + "\n\n" +

        "⛔ No se puede registrar la votación desde este municipio."
});


                // IMPORTANTE:
                // No consultar asignaciones.
                // No revelar si ya voto.
                // No crear userState.

                return true;
            }


            // ===================================================
            // MISMO MUNICIPIO
            // ===================================================

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


 // ===================================================
// YA VOTÓ
// ===================================================

if (votoRegistrado.length > 0) {

    const registro = votoRegistrado[0];


    // ===================================================
    // BUSCAR NOMBRE DEL OPERADOR
    // ===================================================

    let operadorTexto = registro.voto_operador;

    try {

        const [operadorRows] = await db.execute(
            `
            SELECT nombre
            FROM operadores
            WHERE telefono = ?
            LIMIT 1
            `,
            [
                registro.voto_operador
            ]
        );


        if (operadorRows.length > 0) {

            const nombreOperador =
                operadorRows[0].nombre
                    .trim()
                    .replace(/\s+/g, " ");

            // Convertir:
            // Carlos Sotelo
            // en:
            // CarlosSotelo

            const nombreCorto =
                nombreOperador.replace(/\s+/g, "");

            // Últimos 3 dígitos del teléfono
            const ultimos3 =
                String(registro.voto_operador).slice(-3);

            operadorTexto =
                `${nombreCorto}-${ultimos3}`;
        }

    } catch (err) {

        console.log(
            "⚠️ No se pudo obtener nombre del operador:",
            err.message
        );

    }


    // ===================================================
    // MOSTRAR YA VOTÓ
    // ===================================================

    await sock.sendMessage(from, {

        text:
            "🗳️ YA VOTÓ\n\n" +

            ciudadano.NOMBRE + " " +
            ciudadano.APELLIDO + "\n" +

            "C.I. " + ciudadano.CEDULA + "\n\n" +

            "✓ Voto registrado\n" +

            "📅 " +
            new Date(registro.voto_fecha)
                .toLocaleString("es-PY") +

            "\n\n" +

            "Operador: " +
            operadorTexto
    });

    return true;
}

            // ===================================================
            // PERSONA DEL MISMO MUNICIPIO
            // TODAVIA NO VOTO
            // ===================================================

            userState[from] = {

                action: "preguntar_voto",

                cedula: ciudadano.CEDULA,

                datos: {
                    nombre: ciudadano.NOMBRE,
                    apellido: ciudadano.APELLIDO,
                    local: ciudadano.local,
                    mesa: ciudadano.MESA || null,
                    orden: ciudadano.ORDEN || null
                }
            };


       await sock.sendMessage(from, {
    text:
        "🗳️ *CONTROL DE VOTACIÓN*\n\n" +

        "👤 " +
        ciudadano.NOMBRE + " " +
        ciudadano.APELLIDO + "\n" +

        "C.I. " +
        ciudadano.CEDULA + "\n\n" +

        "📍 " +
        (ciudadano.local || "-") + "\n\n" +

        "¿La persona ya votó?\n\n" +

        "• *S* — Sí\n" +
        "• *N* — No"
});


            return true;


        } catch (err) {

            console.error(
                "Error en manejarVotacion:",
                err
            );


            await sock.sendMessage(from, {
                text:
                    "Error consultando votacion."
            });


            return true;
        }
    }


    return false;
}