import {
    obtenerReporteGeneral,
    obtenerReporteCandidato
} from "../services/reporteService.js";


export async function manejarReportes(
    sock,
    from,
    cleanLower,
    usuario
){

    if(cleanLower !== "reporte"){
        return false;
    }


    let datos;


    // ======================
    // ADMIN
    // ======================

    if(usuario.rol === "ADMIN"){

        datos = await obtenerReporteGeneral();


        await sock.sendMessage(from,{
            text:
`📊 REPORTE GENERAL

👥 Asignaciones:
${datos.total || 0}

🗳 Votos:
${datos.votos || 0}

📲 Celulares:
${datos.celulares || 0}

📍 Ubicaciones:
${datos.ubicaciones || 0}

📝 Observaciones:
${datos.observaciones || 0}`
        });


        return true;
    }



    // ======================
    // CANDIDATO
    // ======================

    if(usuario.rol === "CANDIDATO"){

        datos = await obtenerReporteCandidato(
            usuario.candidato_id
        );


        await sock.sendMessage(from,{
            text:
`📊 REPORTE CANDIDATO

👤 ${usuario.nombre}

━━━━━━━━━━

👥 Asignaciones:
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



    // OPERADOR

    await sock.sendMessage(from,{
        text:
`📋 Tus registros están disponibles con:

misregistros`
    });


    return true;

}