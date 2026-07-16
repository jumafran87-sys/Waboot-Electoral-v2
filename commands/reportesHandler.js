import {
    obtenerReporteGeneral,
    obtenerReporteCandidato,
    obtenerReporteOperador,
	buscarCandidato
} from "../services/reporteService.js";



export async function manejarReportes(
    sock,
    from,
    cleanLower,
    usuario,
    telefono
){

   // if(cleanLower !== "reporte"){
    //    return false;
 //   }

if(!cleanLower.startsWith("reporte")){
    return false;
}


const partes = cleanLower.split(" ");

const busqueda = partes.slice(1).join(" ").trim();


 function calcularPorcentaje(total, votos){

    if(total === 0){
        return "0.00";
    }

    return ((votos * 100) / total).toFixed(2);

}

    // =========================_______________________________________________________
    // ADMIN
    // =========================

  if(usuario.rol === "ADMIN"){

    // ======================
    // REPORTE GENERAL
    // ======================

    if(busqueda === ""){

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


    // ======================
    // BUSCAR CANDIDATO
    // ======================

    const candidatos =
        await buscarCandidato(busqueda);


    if(candidatos.length === 0){

        await sock.sendMessage(from,{
            text:"❌ No encontré ningún candidato."
        });

        return true;

    }


    if(candidatos.length > 1){

        let texto =
`👥 Encontré varios candidatos:

`;

        candidatos.forEach(c=>{

            texto +=
`• ${c.nombre} ${c.apellido}
${c.cargo}
${c.ciudad}

`;

        });

        await sock.sendMessage(from,{
            text:texto
        });

        return true;

    }

const candidato = candidatos[0];


const datos =
    await obtenerReporteCandidato(
        candidato.id
    );


const porcentaje =
    calcularPorcentaje(
        datos.total,
        datos.votos
    );



    await sock.sendMessage(from,{
        text:
`📊 ${candidato.nombre} ${candidato.apellido}

🏙 ${candidato.ciudad}

━━━━━━━━━━━━━━

👥 Personas:
${datos.total || 0}

🗳 Votos:
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
//__________________________________________________________________________________________________________


    // =========================
    // CANDIDATO
    // =========================

    if(usuario.rol === "CANDIDATO"){


        const datos =
            await obtenerReporteCandidato(
                usuario.candidato_id
            );

	const porcentaje =
    datos.total > 0
        ? ((datos.votos * 100) / datos.total).toFixed(2)
        : "0.00";


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
${datos.ubicaciones || 0}

📈 Avance:
${porcentaje}%`

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