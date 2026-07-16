import {
    obtenerReporteGeneral,
    obtenerReporteCandidato,
    obtenerReporteOperador
} from "../services/reporteService.js";


export async function manejarReportes(
    sock,
    from,
    cleanLower,
    usuario,
    telefono
){

    if(cleanLower !== "reporte"){
        return false;
    }



    // =========================
    // ADMIN
    // =========================

    if(usuario.rol === "ADMIN"){

        const datos =
            await obtenerReporteGeneral();


        await sock.sendMessage(from,{
            text:
`📊 REPORTE GENERAL

👥 Personas registradas:
${datos.total || 0}

🗳 Votos registrados:
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



    // =========================
    // CANDIDATO
    // =========================

    if(usuario.rol === "CANDIDATO"){


        const datos =
            await obtenerReporteCandidato(
                usuario.candidato_id
            );


        await sock.sendMessage(from,{
            text:
`📊 REPORTE CANDIDATO

👤 ${usuario.nombre}

━━━━━━━━━━━━━━

👥 Personas:
${datos.total || 0}

🗳 Votos:
${datos.votos || 0}

📲 Celulares:
${datos.celulares || 0}

📍 Ubicaciones:
${datos.ubicaciones || 0}`
        });


        return true;

    }



    // =========================
    // OPERADOR
    // =========================

    if(usuario.rol === "OPERADOR"){


        const datos =
            await obtenerReporteOperador(
                telefono
            );


        await sock.sendMessage(from,{
            text:
`📋 MIS REGISTROS

👤 ${usuario.nombre}

━━━━━━━━━━━━━━

👥 Personas cargadas:
${datos.total || 0}

🗳 Votos confirmados:
${datos.votos || 0}`
        });


        return true;

    }



    return false;

}