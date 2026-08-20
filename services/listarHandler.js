import {
    obtenerListadoAsignaciones
} from "../services/reporteService.js";


function formatearWaMe(numero) {

    if (!numero) {
        return "-";
    }

    let limpio =
        String(numero)
            .replace(/\D/g, "");

    if (!limpio) {
        return "-";
    }

    return `https://wa.me/${limpio}`;
}


export async function manejarListar(
    sock,
    from,
    cleanLower,
    usuario,
    telefono
) {

    if (!cleanLower.startsWith("listar")) {
        return false;
    }


    const partes =
        cleanLower
            .split(/\s+/)
            .filter(Boolean);


    // =================================================
    // FILTRO
    // =================================================

    const filtro =
        partes[1] || null;


    // =================================================
    // DETERMINAR OPERADOR
    // =================================================

    let telefonoBusqueda = telefono;


    // =================================================
    // ADMIN PUEDE CONSULTAR OTRO OPERADOR
    // =================================================

    if (
        usuario.rol === "ADMIN" &&
        filtro &&
        /^595\d{9}$/.test(filtro)
    ) {

        telefonoBusqueda = filtro;

    }


    // =================================================
    // ADMIN - LISTADO GENERAL
    // =================================================

    if (
        usuario.rol === "ADMIN" &&
        (
            !filtro ||
            filtro === "voto" ||
            filtro === "pendientes"
        )
    ) {

        telefonoBusqueda = null;

    }


    // =================================================
    // VALIDAR FILTRO
    // =================================================

    const filtrosPermitidos = [
        null,
        "voto",
        "pendientes"
    ];


    if (
        filtro &&
        !filtrosPermitidos.includes(filtro) &&
        !/^595\d{9}$/.test(filtro)
    ) {

        await sock.sendMessage(from, {
            text:
`❌ Opción no válida.

Use:

📋 listar
🗳️ listar voto
⏳ listar pendientes`
        });

        return true;

    }


    try {

        const rows =
            await obtenerListadoAsignaciones(
                telefonoBusqueda,
                (
                    filtro === "voto" ||
                    filtro === "pendientes"
                )
                    ? filtro
                    : null
            );


        if (rows.length === 0) {

            await sock.sendMessage(from, {
                text:
                    "📋 No hay registros para mostrar."
            });

            return true;

        }


        // =================================================
        // TITULO
        // =================================================

        let titulo =
            "📋 *LISTADO DE ASIGNACIONES*";


        if (filtro === "voto") {

            titulo =
                "🗳️ *PERSONAS CON VOTO CONFIRMADO*";

        }


        if (filtro === "pendientes") {

            titulo =
                "⏳ *PERSONAS PENDIENTES*";

        }


        let mensaje =
`${titulo}

`;


        // =================================================
        // LISTADO
        // =================================================

        rows.forEach((r, i) => {

            const celular =
                formatearWaMe(
                    r.celunew || r.celular
                );


            const ubicacion =
                r.ubi
                    ? `https://maps.google.com/?q=${r.ubi}`
                    : "-";


            const voto =
                r.voto === "S"
                    ? "🟢 VOTO"
                    : "⚪ PENDIENTE";


            mensaje +=
`${i + 1}) *${r.cedula}* | ${r.nombre} ${r.apellido}

🏫 ${r.local || "-"} | Mesa ${r.mesa || "-"} | Ord ${r.orden || "-"}

📞 ${celular}

🗳️ ${voto}

📍 ${ubicacion}

📝 ${r.observacion || "-"}

━━━━━━━━━━━━━━

`;

        });


        mensaje +=
`📊 Total: ${rows.length}`;


        // =================================================
        // DIVIDIR MENSAJES
        // =================================================

        const partesMensaje =
            mensaje.match(
                /[\s\S]{1,3500}/g
            );


        for (
            const parte
            of partesMensaje
        ) {

            await sock.sendMessage(
                from,
                {
                    text: parte
                }
            );

        }


        return true;


    } catch (err) {

        console.error(
            "❌ Error listar:",
            err
        );


        await sock.sendMessage(
            from,
            {
                text:
                    "❌ Error al obtener el listado."
            }
        );


        return true;

    }

}