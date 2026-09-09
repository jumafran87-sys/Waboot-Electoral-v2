import {
    obtenerReporteGeneral,
    obtenerReporteCandidato,
    buscarCandidato,
    obtenerReporteOperadores,
    obtenerListadoAsignaciones,
    obtenerReporteOperador,
    obtenerOperadoresCandidato
} from "../services/reporteService.js";


// =====================================================
// MANEJAR REPORTES
// =====================================================

export async function manejarReportes(
    sock,
    from,
    cleanLower,
    usuario,
    telefono
) {

    console.log("📊 ENTRÓ A MANEJAR REPORTES:", {
        cleanLower,
        rol: usuario?.rol,
        candidato_id: usuario?.candidato_id,
        telefono
    });


    // =================================================
    // VALIDAR COMANDO
    // =================================================

    if (
        !cleanLower.startsWith("reporte") &&
        !cleanLower.startsWith("listar")
    ) {
        return false;
    }

// =====================================================
// LISTAR PDF
// Este comando pertenece a listarHandler.js
// =====================================================

if (cleanLower === "listar pdf") {

    return false;
}


    const partes = cleanLower.split(" ");

    const busqueda =
        partes.slice(1).join(" ").trim();


    console.log("📋 LISTAR/REPORTE:", {
        cleanLower,
        busqueda,
        rol: usuario?.rol,
        candidato_id: usuario?.candidato_id,
        telefono
    });


    // =====================================================
    // FUNCIÓN PORCENTAJE
    // =====================================================

    function calcularPorcentaje(total, votos) {

        total = Number(total) || 0;
        votos = Number(votos) || 0;

        if (total === 0) {
            return "0.00";
        }

        return ((votos * 100) / total).toFixed(2);
    }


    // =====================================================
    // COMANDO LISTAR
    // =====================================================

    if (cleanLower === "listar") {

        try {

            let rows = [];


            // =================================================
            // ADMIN
            // =================================================

            if (usuario?.rol === "ADMIN") {

                console.log(
                    "👑 ADMIN LISTAR:",
                    {
                        telefono,
                        candidato_id: usuario?.candidato_id
                    }
                );


                /*
                 * ADMIN:
                 *
                 * Si tiene candidato asignado,
                 * muestra las asignaciones de ese candidato.
                 *
                 * Esto puede incluir cargas de sus operadores.
                 */

                if (!usuario?.candidato_id) {

                    await sock.sendMessage(from, {
                        text:
`⚠️ Tu usuario ADMIN no tiene un candidato asignado.

No se puede determinar qué lista mostrar.`
                    });

                    return true;
                }


                rows =
                    await obtenerListadoAsignaciones(
                        null,
                        null,
                        usuario.candidato_id
                    );


                if (rows.length === 0) {

                    await sock.sendMessage(from, {
                        text:
`📋 *LISTA DE ASIGNACIONES*

👤 *${usuario.nombre || "ADMIN"}*

⚠️ Todavía no hay personas cargadas para este candidato.`
                    });

                    return true;
                }


                let mensaje =
`📋 *LISTA DE ASIGNACIONES*

👤 *${usuario.nombre || "ADMIN"}*

👥 Total: ${rows.length}

━━━━━━━━━━━━━━

`;


                rows.forEach((r, i) => {

                    const cel =
                        r.celunew ||
                        r.celular ||
                        "-";


                    const cargadoPor =
                        r.operador_nombre ||
                        r.operador_telefono ||
                        "-";


                    mensaje +=
`${i + 1}) *${r.cedula}*
👤 ${r.nombre || "-"} ${r.apellido || "-"}
🏫 ${r.local || "-"}
🪑 Mesa: ${r.mesa || "-"} | Ord: ${r.orden || "-"}
📞 ${cel}
👷 Cargado por: ${cargadoPor}
🗳️ Voto: ${r.voto || "N"}

━━━━━━━━━━━━━━

`;

                });


                const partesMensaje =
                    mensaje.match(/[\s\S]{1,3500}/g) || [];


                for (const parte of partesMensaje) {

                    await sock.sendMessage(from, {
                        text: parte
                    });

                }


                return true;
            }


            // =================================================
            // CANDIDATO
            // =================================================

            if (usuario?.rol === "CANDIDATO") {

                console.log(
                    "👤 CANDIDATO LISTAR:",
                    {
                        telefono,
                        candidato_id: usuario?.candidato_id
                    }
                );


                if (!usuario?.candidato_id) {

                    await sock.sendMessage(from, {
                        text:
                        "⚠️ Tu usuario no tiene un candidato asignado."
                    });

                    return true;
                }


                /*
                 * IMPORTANTE:
                 *
                 * El candidato NO va a consultar por candidato_id
                 * para su lista personal.
                 *
                 * Consulta exclusivamente por su teléfono.
                 *
                 * De esta manera solamente verá las cargas
                 * realizadas directamente desde su WhatsApp.
                 */

                rows =
                    await obtenerListadoAsignaciones(
                        telefono,
                        null,
                        null
                    );


                console.log(
                    "📋 CARGAS DIRECTAS DEL CANDIDATO:",
                    {
                        telefono,
                        cantidad: rows.length
                    }
                );


                if (rows.length === 0) {

                    await sock.sendMessage(from, {
                        text:
`📋 *MIS ASIGNACIONES*

👤 *${usuario.nombre || "-"}*

━━━━━━━━━━━━━━

⚠️ Todavía no tenés cargas directas.`
                    });

                    return true;
                }


                let mensaje =
`📋 *MIS ASIGNACIONES*

👤 *${usuario.nombre || "-"}*

👥 Total: ${rows.length}

━━━━━━━━━━━━━━

`;


                rows.forEach((r, i) => {

                    const cel =
                        r.celunew ||
                        r.celular ||
                        "-";


                    mensaje +=
`${i + 1}) *${r.cedula}*
👤 ${r.nombre || "-"} ${r.apellido || "-"}
🏫 ${r.local || "-"}
🪑 Mesa: ${r.mesa || "-"} | Ord: ${r.orden || "-"}
📞 ${cel}
👷 Cargado por: CARGA DIRECTA
🗳️ Voto: ${r.voto || "N"}

━━━━━━━━━━━━━━

`;

                });


                const partesMensaje =
                    mensaje.match(/[\s\S]{1,3500}/g) || [];


                for (const parte of partesMensaje) {

                    await sock.sendMessage(from, {
                        text: parte
                    });

                }


                return true;
            }


            // =================================================
            // OPERADOR
            // =================================================

            if (usuario?.rol === "OPERADOR") {

                console.log(
                    "👷 OPERADOR LISTAR:",
                    {
                        telefono,
                        nombre: usuario?.nombre,
                        candidato_id: usuario?.candidato_id
                    }
                );


                /*
                 * MUY IMPORTANTE:
                 *
                 * El operador SIEMPRE consulta solamente
                 * por su propio teléfono.
                 *
                 * NO usamos candidato_id.
                 *
                 * Esto evita que un operador vea las cargas
                 * realizadas por otro operador del mismo candidato.
                 */

                rows =
                    await obtenerListadoAsignaciones(
                        telefono,
                        null,
                        null
                    );


                console.log(
                    "📋 ASIGNACIONES PROPIAS DEL OPERADOR:",
                    {
                        telefono,
                        cantidad: rows.length
                    }
                );


                if (rows.length === 0) {

                    await sock.sendMessage(from, {
                        text:
`📋 *MIS ASIGNACIONES*

👤 *${usuario.nombre || "-"}*

━━━━━━━━━━━━━━

⚠️ Todavía no tenés personas cargadas.`
                    });

                    return true;
                }


                let mensaje =
`📋 *MIS ASIGNACIONES*

👤 *${usuario.nombre || "-"}*

👥 Total: ${rows.length}

━━━━━━━━━━━━━━

`;


                rows.forEach((r, i) => {

                    const cel =
                        r.celunew ||
                        r.celular ||
                        "-";


                    mensaje +=
`${i + 1}) *${r.cedula}*
👤 ${r.nombre || "-"} ${r.apellido || "-"}
🏫 ${r.local || "-"}
🪑 Mesa: ${r.mesa || "-"} | Ord: ${r.orden || "-"}
📞 ${cel}
🗳️ Voto: ${r.voto || "N"}

━━━━━━━━━━━━━━

`;

                });


                const partesMensaje =
                    mensaje.match(/[\s\S]{1,3500}/g) || [];


                for (const parte of partesMensaje) {

                    await sock.sendMessage(from, {
                        text: parte
                    });

                }


                return true;
            }


            return false;


        } catch (err) {

            console.error(
                "❌ ERROR COMANDO LISTAR:",
                err
            );


            await sock.sendMessage(from, {
                text:
                "❌ Error al obtener el listado."
            });


            return true;
        }
    }


    // =====================================================
    // LISTAR PERSONAS
    //
    // Ejemplo:
    //
    // listar personas
    //
    // Para candidato:
    // solamente cargas directas.
    //
    // Para operador:
    // solamente sus propias cargas.
    // =====================================================

    if (cleanLower === "listar personas") {

        try {

            let rows = [];


            // =================================================
            // CANDIDATO
            // =================================================

            if (usuario?.rol === "CANDIDATO") {

                if (!usuario?.candidato_id) {

                    await sock.sendMessage(from, {
                        text:
                        "⚠️ Tu usuario no tiene un candidato asignado."
                    });

                    return true;
                }


                /*
                 * SOLO CARGAS DIRECTAS DEL CANDIDATO
                 */

                rows =
                    await obtenerListadoAsignaciones(
                        telefono,
                        null,
                        null
                    );


                console.log(
                    "👤 LISTAR PERSONAS - CANDIDATO:",
                    {
                        telefono,
                        candidato_id: usuario.candidato_id,
                        cantidad: rows.length
                    }
                );


                if (rows.length === 0) {

                    await sock.sendMessage(from, {
                        text:
`📋 *PERSONAS DE MI LISTA*

👤 *${usuario.nombre || "-"}*

━━━━━━━━━━━━━━

⚠️ No tenés cargas directas todavía.`
                    });

                    return true;
                }


                let mensaje =
`📋 *PERSONAS DE MI LISTA*

👤 *${usuario.nombre || "-"}*

👥 Total: ${rows.length}

━━━━━━━━━━━━━━

`;


                rows.forEach((r, i) => {

                    const cel =
                        r.celunew ||
                        r.celular ||
                        "-";


                    mensaje +=
`${i + 1}) *${r.cedula}*
👤 ${r.nombre || "-"} ${r.apellido || "-"}
🏫 ${r.local || "-"}
🪑 Mesa: ${r.mesa || "-"} | Ord: ${r.orden || "-"}
📞 ${cel}
👷 Cargado por: CARGA DIRECTA
🗳️ Voto: ${r.voto || "N"}

━━━━━━━━━━━━━━

`;

                });


                const partesMensaje =
                    mensaje.match(/[\s\S]{1,3500}/g) || [];


                for (const parte of partesMensaje) {

                    await sock.sendMessage(from, {
                        text: parte
                    });

                }


                return true;
            }


            // =================================================
            // OPERADOR
            // =================================================

            if (usuario?.rol === "OPERADOR") {

                /*
                 * SOLO SUS PROPIAS CARGAS.
                 */

                rows =
                    await obtenerListadoAsignaciones(
                        telefono,
                        null,
                        null
                    );


                console.log(
                    "👷 LISTAR PERSONAS - OPERADOR:",
                    {
                        telefono,
                        cantidad: rows.length
                    }
                );


                if (rows.length === 0) {

                    await sock.sendMessage(from, {
                        text:
`📋 *MIS PERSONAS*

👤 *${usuario.nombre || "-"}*

━━━━━━━━━━━━━━

⚠️ No tenés personas cargadas.`
                    });

                    return true;
                }


                let mensaje =
`📋 *MIS PERSONAS*

👤 *${usuario.nombre || "-"}*

👥 Total: ${rows.length}

━━━━━━━━━━━━━━

`;


                rows.forEach((r, i) => {

                    mensaje +=
`${i + 1}) *${r.cedula}*
👤 ${r.nombre || "-"} ${r.apellido || "-"}
🏫 ${r.local || "-"}
🪑 Mesa: ${r.mesa || "-"} | Ord: ${r.orden || "-"}
📞 ${r.celunew || r.celular || "-"}
🗳️ Voto: ${r.voto || "N"}

━━━━━━━━━━━━━━

`;

                });


                const partesMensaje =
                    mensaje.match(/[\s\S]{1,3500}/g) || [];


                for (const parte of partesMensaje) {

                    await sock.sendMessage(from, {
                        text: parte
                    });

                }


                return true;
            }


            // =================================================
            // ADMIN
            // =================================================

            if (usuario?.rol === "ADMIN") {

                if (!usuario?.candidato_id) {

                    await sock.sendMessage(from, {
                        text:
`⚠️ Tu usuario ADMIN no tiene candidato asignado.`
                    });

                    return true;
                }


                /*
                 * ADMIN PUEDE VER TODAS LAS CARGAS
                 * DEL CANDIDATO.
                 */

                rows =
                    await obtenerListadoAsignaciones(
                        null,
                        null,
                        usuario.candidato_id
                    );


                if (rows.length === 0) {

                    await sock.sendMessage(from, {
                        text:
`📋 *PERSONAS*

⚠️ No hay personas cargadas para este candidato.`
                    });

                    return true;
                }


                let mensaje =
`📋 *PERSONAS DEL CANDIDATO*

👤 *${usuario.nombre || "ADMIN"}*

👥 Total: ${rows.length}

━━━━━━━━━━━━━━

`;


                rows.forEach((r, i) => {

                    const cel =
                        r.celunew ||
                        r.celular ||
                        "-";


                    const cargadoPor =
                        r.operador_nombre ||
                        r.operador_telefono ||
                        "-";


                    mensaje +=
`${i + 1}) *${r.cedula}*
👤 ${r.nombre || "-"} ${r.apellido || "-"}
🏫 ${r.local || "-"}
🪑 Mesa: ${r.mesa || "-"} | Ord: ${r.orden || "-"}
📞 ${cel}
👷 Cargado por: ${cargadoPor}
🗳️ Voto: ${r.voto || "N"}

━━━━━━━━━━━━━━

`;

                });


                const partesMensaje =
                    mensaje.match(/[\s\S]{1,3500}/g) || [];


                for (const parte of partesMensaje) {

                    await sock.sendMessage(from, {
                        text: parte
                    });

                }


                return true;
            }


            return false;


        } catch (err) {

            console.error(
                "❌ ERROR LISTAR PERSONAS:",
                err
            );


            await sock.sendMessage(from, {
                text:
                "❌ Error al obtener las personas."
            });


            return true;
        }
    }


    // =====================================================
    // ADMIN - REPORTES
    // =====================================================

    if (usuario?.rol === "ADMIN") {


        // =================================================
        // REPORTE GENERAL
        // =================================================

        if (busqueda === "") {

            const datos =
                await obtenerReporteGeneral();


            await sock.sendMessage(from, {
                text:
`📊 *REPORTE GENERAL*

👥 Personas registradas:
${datos.total || 0}

🗳️ Votos registrados:
${datos.votos || 0}

📲 Celulares cargados:
${datos.celulares || 0}

📍 Ubicaciones:
${datos.ubicaciones || 0}

📝 Observaciones:
${datos.observaciones || 0}`
            });


            return true;
        }


        // =================================================
        // REPORTE OPERADORES
        // =================================================

        if (busqueda === "operadores") {

            const operadores =
                await obtenerReporteOperadores();


            if (operadores.length === 0) {

                await sock.sendMessage(from, {
                    text:
                    "⚠️ No hay operadores registrados."
                });

                return true;
            }


            let texto =
`👥 *LISTADO DE OPERADORES*

`;


            let totalRegistros = 0;
            let totalVotos = 0;


            operadores.forEach((op, index) => {

                const registros =
                    Number(op.total) || 0;


                const votos =
                    Number(op.votos) || 0;


                totalRegistros += registros;
                totalVotos += votos;


                const estado =
                    op.activo == 1
                        ? "🟢"
                        : "🔴";


                texto +=
`${index + 1}️⃣ *${op.nombre || "SIN NOMBRE"}*
${estado} 📱 ${op.telefono}

👥 Registros: ${registros}
🗳️ Votos: ${votos}

━━━━━━━━━━━━━━

`;

            });


            texto +=
`📊 *RESUMEN*

👥 Operadores: ${operadores.length}
📋 Registros: ${totalRegistros}
🗳️ Votos: ${totalVotos}`;


            const partes =
                texto.match(/[\s\S]{1,3500}/g) || [];


            for (const parte of partes) {

                await sock.sendMessage(from, {
                    text: parte
                });

            }


            return true;
        }


        // =================================================
        // BUSCAR CANDIDATO
        // =================================================

        const candidatos =
            await buscarCandidato(busqueda);


        if (candidatos.length === 0) {

            await sock.sendMessage(from, {
                text:
                "❌ No encontré ningún candidato."
            });

            return true;
        }


        // =================================================
        // VARIOS CANDIDATOS
        // =================================================

        if (candidatos.length > 1) {

            let texto =
`👥 *ENCONTRÉ VARIOS CANDIDATOS*

`;


            candidatos.forEach((c, i) => {

                texto +=
`${i + 1}️⃣ *${c.nombre} ${c.apellido}*
🏛️ ${c.cargo || "-"}
🏙️ ${c.ciudad || "-"}

`;

            });


            await sock.sendMessage(from, {
                text: texto
            });


            return true;
        }


        // =================================================
        // REPORTE DE CANDIDATO
        // =================================================

        const candidato =
            candidatos[0];


        const datos =
            await obtenerReporteCandidato(
                candidato.id
            );


        const porcentaje =
            calcularPorcentaje(
                datos.total,
                datos.votos
            );


        await sock.sendMessage(from, {
            text:
`📊 *${candidato.nombre} ${candidato.apellido}*

🏙️ ${candidato.ciudad || "-"}

━━━━━━━━━━━━━━

👥 Personas:
${datos.total || 0}

🗳️ Votos:
${datos.votos || 0}

📲 Celulares:
${datos.celulares || 0}

📍 Ubicaciones:
${datos.ubicaciones || 0}

📝 Observaciones:
${datos.observaciones || 0}

📈 Avance:
${porcentaje}%`
        });


        return true;
    }


    // =====================================================
    // CANDIDATO - REPORTE
    // =====================================================

    if (usuario?.rol === "CANDIDATO") {

        if (!usuario?.candidato_id) {

            await sock.sendMessage(from, {
                text:
                "⚠️ Tu usuario no tiene un candidato asignado."
            });

            return true;
        }


        const datos =
            await obtenerReporteCandidato(
                usuario.candidato_id
            );


        const porcentaje =
            calcularPorcentaje(
                datos.total,
                datos.votos
            );


        await sock.sendMessage(from, {
            text:
`📊 *REPORTE CANDIDATO*

👤 ${usuario.nombre || "-"}

━━━━━━━━━━━━━━

👥 Personas:
${datos.total || 0}

🗳️ Votos:
${datos.votos || 0}

📲 Celulares:
${datos.celulares || 0}

📍 Ubicaciones:
${datos.ubicaciones || 0}

📈 Avance:
${porcentaje}%`
        });


        return true;
    }


    // =====================================================
    // OPERADOR - REPORTE
    // =====================================================

    if (usuario?.rol === "OPERADOR") {

        const datos =
            await obtenerReporteOperador(
                telefono
            );


        await sock.sendMessage(from, {
            text:
`📋 *MIS REGISTROS*

👤 ${usuario.nombre || "-"}

━━━━━━━━━━━━━━

👥 Personas cargadas:
${datos.total || 0}

🗳️ Votos confirmados:
${datos.votos || 0}`
        });


        return true;
    }


    return false;
}