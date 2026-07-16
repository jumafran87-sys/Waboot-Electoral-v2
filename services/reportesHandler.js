import {
    obtenerReporteGeneral,
    obtenerReporteCandidato,
    buscarCandidato
} from "../services/reporteService.js";


export async function manejarReportes(
    sock,
    from,
    cleanLower,
    usuario
){

  if(!cleanLower.startsWith("reporte")){
    return false;
}


    let datos;


datos = await obtenerReporteGeneral();

const partes = cleanLower.split(" ");

const busqueda = partes.slice(1).join(" ").trim();
    // ======================
    // ADMIN
    // ======================

    if(usuario.rol === "ADMIN"){

    


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