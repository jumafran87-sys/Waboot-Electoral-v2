import {
    obtenerListadoAsignaciones
} from "../services/reporteService.js";

import {
    generarPdfAsignaciones
} from "../services/pdfService.js";

import {
    obtenerOperadorPorNumero
} from "../services/operadorService.js";


// =====================================================
// FORMATEAR WHATSAPP
// =====================================================

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


// =====================================================
// MANEJAR LISTAR
// =====================================================

export async function manejarListar(
    sock,
    from,
    cleanLower,
    usuario,
    telefono
) {

    // =================================================
    // VALIDAR COMANDO
    // =================================================

    if (!cleanLower.startsWith("listar")) {
        return false;
    }


    // =================================================
    // LISTAR PDF
    //
    // IMPORTANTE:
    // Este bloque debe estar ANTES del listar normal.
    // =================================================

    const partesPdf =
    cleanLower
        .split(/\s+/)
        .filter(Boolean);

	if (
    partesPdf[0] === "listar" &&
    partesPdf[1] === "pdf"
	) {

        try {

            console.log(
                "📄 ENTRÓ A LISTAR PDF:",
                {
                    telefono,
                    rol: usuario?.rol,
                    candidato_id: usuario?.candidato_id
                }
            );


            let rows = [];


// =================================================
// NÚMERO DE OPERADOR
// =================================================

const numeroOperador = partesPdf[2] || null;

let telefonoPdf = telefono;


// =================================================
// SI SE INDICA OPERADOR
// =================================================

if (numeroOperador) {

    // Solamente ADMIN puede elegir otro operador
    if (usuario?.rol !== "ADMIN") {

        await sock.sendMessage(from, {
            text:
`⛔ Solo un ADMIN puede generar el PDF de otro operador.

Ejemplo:

📄 listar pdf 1`
        });

        return true;
    }


    // Validar que sea número
    if (!/^\d+$/.test(numeroOperador)) {

        await sock.sendMessage(from, {
            text:
`❌ Número de operador inválido.

Ejemplo:

📄 listar pdf 1`
        });

        return true;
    }


    const operador =
        await obtenerOperadorPorNumero(
            Number(numeroOperador)
        );


    if (!operador) {

        await sock.sendMessage(from, {
            text:
`❌ No encontré el operador número ${numeroOperador}.

Verificá el número en:

👥 LISTADO DE OPERADORES`
        });

        return true;
    }


    telefonoPdf =
        operador.telefono;


    console.log(
        "📄 OPERADOR SELECCIONADO:",
        {
            numero: numeroOperador,
            id: operador.id,
            nombre: operador.nombre,
            telefono: operador.telefono
        }
    );
}



    // =================================================
// ADMIN
// =================================================

if (usuario?.rol === "ADMIN") {

    // =============================================
    // ADMIN PIDIÓ UN OPERADOR ESPECÍFICO
    // =============================================

    if (numeroOperador) {

        rows =
            await obtenerListadoAsignaciones(
                telefonoPdf,
                null,
                null
            );

        console.log(
            "📄 ADMIN - OPERADOR:",
            numeroOperador,
            "TEL:",
            telefonoPdf,
            "REGISTROS:",
            rows.length
        );

    }

    // =============================================
    // ADMIN SIN NÚMERO
    // MANTIENE COMPORTAMIENTO ACTUAL
    // =============================================

    else {

        if (!usuario?.candidato_id) {

            await sock.sendMessage(from, {
                text:
`⚠️ Tu usuario ADMIN no tiene candidato asignado.

No se puede determinar qué lista generar.`
            });

            return true;
        }


        rows =
            await obtenerListadoAsignaciones(
                null,
                null,
                usuario.candidato_id
            );


        console.log(
            "📄 ADMIN - REGISTROS:",
            rows.length
        );
    }
}

            // =================================================
            // CANDIDATO
            // =================================================

            else if (
                usuario?.rol === "CANDIDATO"
            ) {

                if (!usuario?.candidato_id) {

                    await sock.sendMessage(from, {
                        text:
                            "⚠️ Tu usuario no tiene un candidato asignado."
                    });

                    return true;
                }


                /*
                 * El candidato mantiene el mismo criterio
                 * que tu listar actual:
                 *
                 * solamente sus cargas directas.
                 */

                rows =
                    await obtenerListadoAsignaciones(
                        telefono,
                        null,
                        null
                    );


                console.log(
                    "📄 CANDIDATO - REGISTROS:",
                    rows.length
                );
            }


            // =================================================
            // OPERADOR
            // =================================================

            else if (
                usuario?.rol === "OPERADOR"
            ) {

                /*
                 * El operador solamente ve
                 * sus propias asignaciones.
                 */

                rows =
                    await obtenerListadoAsignaciones(
                        telefono,
                        null,
                        null
                    );


                console.log(
                    "📄 OPERADOR - REGISTROS:",
                    rows.length
                );
            }


            // =================================================
            // OTRO ROL
            // =================================================

            else {

                await sock.sendMessage(from, {
                    text:
                        "⛔ No tenés permisos para generar esta planilla."
                });

                return true;
            }


            // =================================================
            // SIN REGISTROS
            // =================================================

            if (
                !rows ||
                rows.length === 0
            ) {

                await sock.sendMessage(from, {
                    text:
                        "📋 No hay personas para generar la planilla."
                });

                return true;
            }


            // =================================================
            // MOSTRAR INFORMACIÓN RECIBIDA
            // =================================================

            console.log(
                "📄 REGISTROS PARA PDF:",
                rows.length
            );


            console.log(
                "📄 PRIMER REGISTRO:",
                {
                    cedula:
                        rows[0]?.cedula,

                    nombre:
                        rows[0]?.nombre,

                    apellido:
                        rows[0]?.apellido,

                    candidato_id:
                        rows[0]?.candidato_id,

                    candidato_nombre:
                        rows[0]?.candidato_nombre,

                    candidato_apellido:
                        rows[0]?.candidato_apellido,

                    candidato_cargo:
                        rows[0]?.candidato_cargo,

                    candidato_lista_numero:
                        rows[0]?.candidato_lista_numero,

                    candidato_opcion:
                        rows[0]?.candidato_opcion,

                    intendente_id:
                        rows[0]?.intendente_id,

                    intendente_nombre:
                        rows[0]?.intendente_nombre,

                    intendente_apellido:
                        rows[0]?.intendente_apellido,

                    intendente_cargo:
                        rows[0]?.intendente_cargo,

                    intendente_lista_numero:
                        rows[0]?.intendente_lista_numero,

                    intendente_opcion:
                        rows[0]?.intendente_opcion,

                    intendente_ciudad:
                        rows[0]?.intendente_ciudad
                }
            );


            // =================================================
            // AVISO
            // =================================================

            await sock.sendMessage(from, {
                text:
                    "📄 Generando planilla A4 horizontal..."
            });


            // =================================================
            // GENERAR PDF
            //
            // Le pasamos SOLAMENTE rows.
            //
            // El pdfService será responsable de tomar:
            //
            // candidato
            // intendente
            // lista
            // opción
            // ciudad
            //
            // desde los datos obtenidos del reporteService.
            // =================================================

            const pdf =
                await generarPdfAsignaciones(
                    rows
                );


            console.log(
                "✅ PDF GENERADO:",
                pdf
            );


            // =================================================
            // ENVIAR PDF
            // =================================================

            await sock.sendMessage(
                from,
                {
                    document: {
                        url: pdf.ruta
                    },

                    mimetype:
                        "application/pdf",

                    fileName:
                        "lista_asignaciones_A4.pdf",

                    caption:
`📋 *LISTA DE ASIGNACIONES*

👥 Total: ${rows.length}

📄 Planilla A4 horizontal`
                }
            );


            // =================================================
            // ELIMINAR TEMPORAL
            // =================================================

            try {

                const fs =
                    await import("fs/promises");


                await fs.unlink(
                    pdf.ruta
                );


            } catch (err) {

                console.warn(
                    "⚠️ No se pudo eliminar PDF temporal:",
                    err.message
                );
            }


            return true;


        } catch (err) {

            console.error(
                "❌ ERROR GENERANDO LISTAR PDF:",
                err
            );


            await sock.sendMessage(from, {
                text:
                    "❌ No se pudo generar la planilla PDF."
            });


            return true;
        }
    }


    // =================================================
    // DESDE ACÁ:
    // TU LISTAR NORMAL
    // =================================================

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

    let telefonoBusqueda =
        telefono;


    // =================================================
    // ADMIN PUEDE CONSULTAR OTRO OPERADOR
    // =================================================

    if (
        usuario.rol === "ADMIN" &&
        filtro &&
        /^595\d{9}$/.test(filtro)
    ) {

        telefonoBusqueda =
            filtro;
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

        telefonoBusqueda =
            null;
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
⏳ listar pendientes
📄 listar pdf`
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
                    r.celunew ||
                    r.celular
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
            ) || [];


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