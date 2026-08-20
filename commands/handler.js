import { exec } from "child_process";
import { db } from "../database/mysql.js";

import {
    consultarPadron
} from "../services/padronService.js";

import {
    buscarPorNombre
} from "../services/busquedaService.js";

import {
    obtenerModoBot,
    cambiarModoBot
} from "../services/configBotService.js";


import {
    validarOperador,
    altaOperador,
    asignarCandidatoOperador
} from "../services/operadorService.js";

import {
    guardarAsignacion,
    actualizarCelular,
    actualizarUbicacion,
    actualizarObservacion
} from "../services/asignacionService.js";

import {
    guardarHistorial
} from "../services/historialService.js";


import {
    manejarActualizaciones
} from "./actualizarHandler.js";


import {
    manejarVotacion
} from "./votacionHandler.js";


import {
    guardarHistorialVoto
} from "../services/historialVotosService.js";

import {
    manejarReportes
} from "./reportesHandler.js";

import {
    obtenerRol
} from "../services/permisoService.js";


import {
    validarZonaCandidato
} from "../services/validacionService.js";

import {
    guardarRechazo
} from "../services/rechazoService.js";


import {
    altaCandidato,
    listarCandidatos,
    obtenerCandidato
} from "../services/candidatoService.js";

import {
    manejarCandidatos
} from "./candidatoHandler.js";


import {
    obtenerZonaOperador
} from "../services/permisoService.js";




const ADMIN = "595985761431";

export async function handleCommand(
  sock,
  msg,
  from,
  text,
  telefono,
  userState,
  botTelefono
) {

const cleanText = text.trim();
const cleanLower = cleanText.toLowerCase();

const modo = await obtenerModoBot();

console.log("🟢 MODO BOT:", modo);





 // ===================================================
// VALIDAR OPERADOR
// ===================================================

const op = await validarOperador(telefono);

if (!op) {

    await sock.sendMessage(from, {
        text: "⛔ No estás autorizado para usar este sistema."
    });

    return;
}


const usuario = await obtenerRol(telefono);


const zonaOperador =
    await obtenerZonaOperador(telefono);

const departamento =
    zonaOperador?.departamento ?? null;

const distrito =
    zonaOperador?.distrito ?? null;


console.log(
    "👤 USUARIO:",
    usuario
);

// ================================
// MODULO CANDIDATOS
// ================================

const atendidoCandidato =
await manejarCandidatos(
    sock,
    from,
    cleanText,
    cleanLower,
    telefono
);

if(atendidoCandidato){
    return;
}


// ================================
// MODULO REPORTES
// ================================

const reporte =
await manejarReportes(
    sock,
    from,
    cleanLower,
    usuario,
    telefono
);

if(reporte){
    return;
}



  // ===================================================
  // RESTART
  // ===================================================

  if (cleanLower === "restart") {

    if (telefono !== ADMIN) {
      await sock.sendMessage(from, {
        text: "⛔ No autorizado."
      });
      return;
    }

    await sock.sendMessage(from, {
      text: "♻️ Reiniciando bot..."
    });

    exec("pm2 restart wabot", (error, stdout) => {

      if (error) {
        console.error(error);

        sock.sendMessage(from, {
          text: "❌ Error reiniciando PM2"
        }).catch(console.error);

        return;
      }

      console.log(stdout);

    });

    return;
  }
  
  // ===================================================
// CAMBIAR MODO DEL BOT (ADMIN)
// ===================================================

if (cleanLower.startsWith("modo ")) {

    if (telefono !== ADMIN) {

        await sock.sendMessage(from, {
            text: "⛔ No autorizado."
        });

        return;
    }

    const nuevoModo =
        cleanLower.replace("modo ", "").trim().toUpperCase();

    const modosValidos = [
        "CONSULTA",
        "ACTUALIZACION",
        "VOTACION"
    ];

    if (!modosValidos.includes(nuevoModo)) {

        await sock.sendMessage(from, {
            text:
`Modos disponibles:

CONSULTA
ACTUALIZACION
VOTACION`
        });

        return;
    }

    await cambiarModoBot(nuevoModo);

    await sock.sendMessage(from, {
        text: `✅ Modo cambiado a *${nuevoModo}*.`
    });

    return;
}
  
  

 // ===================================================
// ALTA OPERADOR
// ===================================================

if (cleanLower.startsWith("alta ")) {

    if (telefono !== ADMIN) {

        await sock.sendMessage(from, {
            text: "⛔ No autorizado."
        });

        return;
    }


    // ===================================================
    // SEPARAR COMANDO
    // ===================================================

    const partes = cleanText.trim().split(/\s+/);


    /*
        Formato:

        alta telefono nombre

        o:

        alta telefono nombre candidato_id

        Ejemplo:

        alta 595981935724 HeriMarmol 1
    */


    if (partes.length < 3) {

        await sock.sendMessage(from, {
            text:
`❌ Formato incorrecto.

Usá:

alta telefono nombre

o:

alta telefono nombre candidato_id

Ejemplo:

alta 595981935724 Heri Marmol 1`
        });

        return;
    }


    // ===================================================
    // DATOS DEL OPERADOR
    // ===================================================

    const nuevoTelefono =
        partes[1].replace(/\D/g, "");


    // ===================================================
    // CANDIDATO OPCIONAL
    // ===================================================

    let candidato_id = null;

    /*
       Si hay un cuarto dato,
       lo tomamos como candidato_id.
    */

    if (partes.length >= 4) {

        candidato_id =
            Number(partes[partes.length - 1]);

        if (
            !Number.isInteger(candidato_id) ||
            candidato_id <= 0
        ) {

            await sock.sendMessage(from, {
                text:
                "❌ El candidato_id debe ser un número válido."
            });

            return;
        }
    }


    // ===================================================
    // NOMBRE
    // ===================================================

    let nombre;

    if (candidato_id) {

        // El último elemento es el candidato
        nombre =
            partes
                .slice(2, -1)
                .join(" ")
                .trim();

    } else {

        nombre =
            partes
                .slice(2)
                .join(" ")
                .trim();
    }


    // ===================================================
    // VALIDAR TELÉFONO
    // ===================================================

    if (!/^595\d{9}$/.test(nuevoTelefono)) {

        await sock.sendMessage(from, {
            text:
            "❌ Número inválido. Debe iniciar con 595."
        });

        return;
    }


    // ===================================================
    // VALIDAR NOMBRE
    // ===================================================

    if (!nombre) {

        await sock.sendMessage(from, {
            text:
            "❌ Debés indicar el nombre del operador."
        });

        return;
    }


    try {

        // =================================================
        // CREAR OPERADOR
        // =================================================

        await altaOperador(
            nuevoTelefono,
            nombre
        );


        // =================================================
        // SI VIENE CANDIDATO → ASIGNAR AUTOMÁTICAMENTE
        // =================================================

        let resultado = null;


        if (candidato_id) {

            resultado =
                await asignarCandidatoOperador(
                    nuevoTelefono,
                    candidato_id
                );


            // =============================================
            // SI FALLA LA ASIGNACIÓN
            // =============================================

            if (!resultado.ok) {

                await sock.sendMessage(from, {
                    text:
`⚠️ Operador registrado, pero no se pudo asignar el candidato.

👤 ${nombre}
📞 ${nuevoTelefono}

❌ ${resultado.mensaje}

Podés asignarlo posteriormente con:

asignar ${nuevoTelefono} ${candidato_id}`
                });

                return;
            }
        }


        // =================================================
        // RESPUESTA FINAL
        // =================================================

        if (resultado?.ok) {

            await sock.sendMessage(from, {
                text:
`✅ OPERADOR REGISTRADO

👤 ${nombre}
📞 ${nuevoTelefono}

🎯 Candidato:
${resultado.candidato.nombre} ${resultado.candidato.apellido}

🏙 Ciudad:
${resultado.candidato.ciudad}

🟢 Estado: ACTIVO`
            });

        } else {

            await sock.sendMessage(from, {
                text:
`✅ OPERADOR REGISTRADO

👤 ${nombre}
📞 ${nuevoTelefono}

🎯 Candidato:
Sin asignar

🟢 Estado: ACTIVO`
            });

        }


    } catch (err) {

        console.error(
            "❌ Error registrando operador:",
            err
        );


        await sock.sendMessage(from, {
            text:
            "❌ Error registrando operador."
        });

    }


    return;
}

  // ===================================================
  // CNX
  // ===================================================

  if (cleanLower === "cnx") {

    let dbStatus = "❌ DB desconectada";

    try {

      await db.query("SELECT 1");
      dbStatus = "✅ DB conectada";

    } catch {

      dbStatus = "❌ DB error";

    }

    const waStatus =
      sock?.user
        ? "✅ WhatsApp conectado"
        : "❌ WhatsApp no conectado";

    await sock.sendMessage(from, {
      text:
        `🔎 ESTADO DEL SISTEMA\n\n` +
        `${waStatus}\n` +
        `${dbStatus}\n\n` +
        `🟢 Bot activo y funcionando.`
    });

    return;
  }

  // ===================================================
  // ESTADO
  // ===================================================

  if (cleanLower === "estado") {

    let dbStatus = "❌ DB desconectada";

    try {

      await db.query("SELECT 1");
      dbStatus = "✅ DB conectada";

    } catch {

      dbStatus = "❌ DB error";

    }

    const waStatus =
      sock?.user
        ? "✅ WhatsApp conectado"
        : "❌ WhatsApp no conectado";

    const uptimeSeconds = process.uptime();
    const uptimeMin = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMin / 60);

    const memory =
      process.memoryUsage().rss / 1024 / 1024;

    const sesionesActivas =
      Object.keys(userState).length;
	  
	  await sock.sendMessage(from, {
      text:
        `📊 ESTADO DEL SISTEMA\n\n` +
        `${waStatus}\n` +
        `${dbStatus}\n\n` +
        `⏱ Uptime: ${uptimeHours}h ${uptimeMin % 60}m\n` +
        `🧠 RAM usada: ${memory.toFixed(2)} MB\n` +
        `👥 Sesiones: ${sesionesActivas}`
    });

    return;
  }
  
// ===================================================
// REGISTRAR VOTO
// ===================================================

if (userState[from]?.action === "preguntar_voto") {

    const respuesta = cleanText.toUpperCase();

    const cedula = userState[from].cedula;

    const datos = userState[from].datos;


    if (!["S","N"].includes(respuesta)) {

        await sock.sendMessage(from,{
            text:"✍️ Respondé S o N."
        });

        return;
    }


    if (respuesta === "S") {


// =============================
// GUARDAR HISTORIAL DE VOTO
// =============================

const [opData] = await db.execute(
`
SELECT 
    o.candidato_id,
    c.ciudad
FROM operadores o
LEFT JOIN candidatos c
ON c.id = o.candidato_id
WHERE o.telefono = ?
LIMIT 1
`,
[
    telefono
]
);


let candidato_id = null;
let ciudad = null;


if(opData.length > 0){

    candidato_id = opData[0].candidato_id;
    ciudad = opData[0].ciudad;
}

//guardamos el historial de votosservice
await guardarHistorialVoto({

    cedula,

    operador: telefono,

    candidato_id,

    estado:"S",

    botTelefono,

    ciudad

});

//--------------------------GHDV

        const [existe] = await db.execute(
            `SELECT id
               FROM asignaciones
              WHERE cedula = ?
              LIMIT 1`,
            [cedula]
        );


        if (existe.length > 0) {


	await db.execute(
    `UPDATE asignaciones
    SET 
        voto='S',
        voto_fecha=CURRENT_TIMESTAMP,
        voto_operador=?,
        candidato_id=?,
        ciudad=?
    WHERE cedula=?`,
    [
        telefono,
        candidato_id,
        ciudad,
        cedula
    ]);

	} else {

            await db.execute(
            `INSERT INTO asignaciones
			(
			operador_telefono,
			cedula,
			nombre,
			apellido,
			local,
			mesa,
			orden,
			voto,
			voto_fecha,
			voto_operador,
			candidato_id,
			ciudad
			)
			VALUES (?,?,?,?,?,?,?,'S',CURRENT_TIMESTAMP,?,?,?)`,
            [
				telefono,
				cedula,
				datos.nombre,
				datos.apellido,
				datos.local,
				datos.mesa,
				datos.orden,
				telefono,
				candidato_id,
				ciudad
			]);

        }


        await sock.sendMessage(from,{
            text:
`✅ Voto registrado correctamente.

🆔 C.I.: ${cedula}

🕒 ${new Date().toLocaleString("es-PY")}`
        });


    } else {


        await sock.sendMessage(from,{
            text:
`❌ Voto no registrado.

🆔 C.I.: ${cedula}`
        });

    }


    delete userState[from];

    return;
}
// ===================================================
// GUARDAR ASIGNACIÓN
// OPERADOR O CANDIDATO
// ===================================================

if (userState[from]?.action === "preguntar_guardar") {

    const respuesta = cleanText.toUpperCase();


    // ===================================================
    // VALIDAR RESPUESTA
    // ===================================================

    if (!["S", "N"].includes(respuesta)) {

        await sock.sendMessage(from, {
            text: "✍️ Respondé *S* o *N*."
        });

        return;
    }


    // ===================================================
    // CANCELAR
    // ===================================================

    if (respuesta === "N") {

        delete userState[from];

        await sock.sendMessage(from, {
            text:
`❌ Registro cancelado.

Podés consultar otra cédula.`
        });

        return;
    }


    // ===================================================
    // OBTENER DATOS DE LA PERSONA
    // ===================================================

    const { cedula, datos } = userState[from];


    console.log(
        "📋 DATOS ANTES VALIDACION:",
        datos
    );


    console.log(
        "👤 USUARIO QUE GUARDA:",
        {
            rol: usuario?.rol,
            telefono,
            candidato_id_usuario: usuario?.candidato_id
        }
    );


    // ===================================================
    // VARIABLES
    // ===================================================

    let candidato_id = null;

    let ciudad = null;


    // ===================================================
    // OBTENER CANDIDATO VINCULADO AL TELÉFONO
    //
    // IMPORTANTE:
    // Tanto CANDIDATO como OPERADOR se buscan por
    // teléfono en la tabla operadores.
    //
    // Esto evita depender de usuario.candidato_id.
    // ===================================================

    const [vinculacion] = await db.execute(
        `
        SELECT
            o.telefono,
            o.candidato_id,

            c.id AS candidato_real_id,
            c.nombre AS candidato_nombre,
            c.apellido AS candidato_apellido,
            c.ciudad AS candidato_ciudad,
            c.distrito AS candidato_distrito

        FROM operadores o

        LEFT JOIN candidatos c
            ON c.id = o.candidato_id

        WHERE o.telefono = ?

        LIMIT 1
        `,
        [
            telefono
        ]
    );


    console.log(
        "🔎 VINCULACIÓN EN BASE DE DATOS:",
        vinculacion
    );


    // ===================================================
    // SI ENCONTRAMOS LA VINCULACIÓN
    // ===================================================

    if (vinculacion.length > 0) {

        candidato_id =
            vinculacion[0].candidato_id || null;


        ciudad =
            vinculacion[0].candidato_ciudad || null;


        console.log(
            "🎯 CANDIDATO OBTENIDO DESDE OPERADORES:",
            {
                telefono,
                candidato_id,
                ciudad
            }
        );

    }


    // ===================================================
    // RESPALDO:
    // SI usuario YA TRAE candidato_id
    // ===================================================

    if (!candidato_id && usuario?.candidato_id) {

        candidato_id =
            usuario.candidato_id;


        console.log(
            "🎯 CANDIDATO OBTENIDO DESDE USUARIO:",
            candidato_id
        );


        // Obtener ciudad

        const [candidatoData] =
            await db.execute(
                `
                SELECT
                    id,
                    nombre,
                    apellido,
                    ciudad,
                    distrito

                FROM candidatos

                WHERE id = ?

                LIMIT 1
                `,
                [
                    candidato_id
                ]
            );


        if (candidatoData.length > 0) {

            ciudad =
                candidatoData[0].ciudad || null;


            console.log(
                "🏙️ CIUDAD CANDIDATO:",
                ciudad
            );

        }

    }


    // ===================================================
    // VERIFICAR CANDIDATO
    // ===================================================

    if (!candidato_id) {

        console.error(
            "❌ NO SE ENCONTRÓ candidato_id",
            {
                telefono,
                rol: usuario?.rol,
                usuario_candidato_id:
                    usuario?.candidato_id,
                vinculacion
            }
        );


        await sock.sendMessage(from, {
            text:
`❌ *No se pudo determinar el candidato.*

No se puede guardar la asignación.

📞 Teléfono:
${telefono}

👤 Rol:
${usuario?.rol || "-"}

⚠️ Verificá que este número esté vinculado correctamente a un candidato.`
        });

        return;
    }


    // ===================================================
    // MOSTRAR DATOS ANTES DE VALIDAR
    // ===================================================

    console.log(
        "🎯 CANDIDATO ASIGNADO:",
        {
            candidato_id,
            ciudad
        }
    );


    // ===================================================
    // VALIDAR ZONA DEL CANDIDATO
    // ===================================================

    const validacion =
        await validarZonaCandidato(
            telefono,
            {
                cedula,
                distrito: datos.distrito
            },
            candidato_id
        );


    // ===================================================
    // PERSONA PERTENECE A OTRO DISTRITO
    // ===================================================

    if (!validacion.valido) {

        console.log(
            "⛔ VALIDACIÓN RECHAZADA:",
            validacion
        );


        await sock.sendMessage(from, {
            text:
`⚠️ *NO SE PUEDE REGISTRAR*

Esta persona pertenece a otro distrito.

👤 *Candidato:*
${validacion.candidato?.nombre || ""}
${validacion.candidato?.apellido || ""}

🏙️ *Ciudad registrada:*
${validacion.candidato?.ciudad || "-"}

❌ *Motivo:*
${validacion.motivo || "Distrito diferente"}`
        });

        return;
    }


    // ===================================================
    // GUARDAR ASIGNACIÓN
    // ===================================================

    await guardarAsignacion({

        // Teléfono de quien realizó la carga
        operador:
            telefono,

        cedula,

        nombre:
            datos.nombre,

        apellido:
            datos.apellido,

        local:
            datos.local,

        mesa:
            datos.mesa,

        orden:
            datos.orden,

        celular:
            datos.celular,

        ciudad,

        candidato_id

    });


    // ===================================================
    // LOG DE CONFIRMACIÓN
    // ===================================================

    console.log(
        "✅ ASIGNACIÓN GUARDADA:",
        {
            operador: telefono,
            candidato_id,
            cedula,
            nombre: datos.nombre,
            apellido: datos.apellido
        }
    );


    // ===================================================
    // PREGUNTAR SI QUIERE ACTUALIZAR
    // ===================================================

    userState[from] = {

        action:
            "preguntar_actualizar",

        cedula

    };


    // ===================================================
    // LIBERAR ESTADO DESPUÉS DE 1 MINUTO
    // ===================================================

    setTimeout(() => {

        if (
            userState[from]?.action ===
                "preguntar_actualizar" &&

            userState[from]?.cedula === cedula
        ) {

            delete userState[from];

            console.log(
                `⏱️ Estado de actualización expirado: ${from}`
            );

        }

    }, 60 * 1000);


    // ===================================================
    // CONFIRMACIÓN AL USUARIO
    // ===================================================

    await sock.sendMessage(from, {
        text:
`✅ *Asignación registrada correctamente.*

¿Desea actualizar datos?

*S* = Sí
*N* = No`
    });


    return;
}
// ===================================================
// NUEVA CÉDULA DURANTE "PREGUNTAR ACTUALIZAR"
// ===================================================

if (
    userState[from]?.action === "preguntar_actualizar" &&
    /^\d+$/.test(cleanText)
) {

    console.log(
        "🔄 Nueva C.I. detectada. Cerrando actualización anterior."
    );

    delete userState[from];

}


//parte donde actualiza del modulo 
const atendido = await manejarActualizaciones(
    sock,
    msg,
    from,
    cleanText,
    telefono,
    userState
);

if (atendido) {
    return;
}

// ===================================================
// QUITAR VOTO (ADMIN)
// ===================================================

if (cleanLower.startsWith("quitarvoto ")) {


    if (telefono !== ADMIN) {

        await sock.sendMessage(from,{
            text:"⛔ No autorizado."
        });

        return;
    }


    const partes = cleanText.split(" ");

    const cedulaQuitar = partes[1];


    if (!cedulaQuitar) {

        await sock.sendMessage(from,{
            text:
`❌ Formato incorrecto.

Usá:

quitarvoto 2492085`
        });

        return;
    }


    const [registro] = await db.execute(
        `SELECT 
            nombre,
            apellido,
            voto
         FROM asignaciones
         WHERE cedula = ?
         LIMIT 1`,
        [
            cedulaQuitar
        ]
    );


    if (registro.length === 0) {

        await sock.sendMessage(from,{
            text:
            `❌ No existe registro para la C.I. ${cedulaQuitar}`
        });

        return;
    }


    await db.execute(
        `UPDATE asignaciones
            SET voto='N',
                voto_fecha=NULL,
                voto_operador=NULL
          WHERE cedula=?`,
        [
            cedulaQuitar
        ]
    );


    await sock.sendMessage(from,{
        text:
`✅ Voto eliminado correctamente.

🆔 C.I.:
${cedulaQuitar}

👤 ${registro[0].nombre} ${registro[0].apellido}`
    });


    return;
}


//modo llamada modo votacion
const votacion =
await manejarVotacion(
    sock,
    from,
    cleanText,
    telefono,
    userState,
    modo
);


if (votacion) {
    return;
}




 // ===================================================
// CONSULTA POR CÉDULA
// ===================================================

if (/^\d+$/.test(cleanText)) {

    try {

        const ciudadano = await consultarPadron(cleanText);


        if (!ciudadano) {

            await sock.sendMessage(from, {
                text:
                `❌ No se encontró ningún registro para la C.I. Nº ${cleanText}`
            });

            return;
        }



        const fechaNac =
            ciudadano.FEC_NAC
            ? new Date(ciudadano.FEC_NAC)
                .toLocaleDateString("es-PY")
            : "-";



        const genero =
            ciudadano.SEXO === "M"
            ? "Masculino"
            : ciudadano.SEXO === "F"
            ? "Femenino"
            : "-";




// ================== TOTAL EN LISTA ==================

        const [totalRows] = await db.execute(
        `
        SELECT COUNT(DISTINCT cedula) AS total
        FROM asignaciones
        WHERE operador_telefono = ?
        `,
        [
            telefono
        ]
        );


        const totalLista =
            totalRows?.[0]?.total || 0;



        console.log(
            "TOTAL LISTA:",
            totalLista,
            "OPERADOR:",
            telefono
        );





        const esIndigen =
            ciudadano.ES_INDIGEN === "S"
            ? "Sí"
            : "No";





        // ===================================================
        // MENSAJE 1 — DATOS PRINCIPALES + LISTA
        // ===================================================

        const plantillaPadron =
`🇵🇾 *PADRÓN ELECTORAL*

🆔 C.I.: ${ciudadano.CEDULA}
👤 *${ciudadano.NOMBRE} ${ciudadano.APELLIDO}*

📍 Departamento: ${ciudadano.departamento || "-"}
🏙️ Distrito: ${ciudadano.distrito || "-"}
🏫 Local: ${ciudadano.local || "-"}

🪑 Mesa: ${ciudadano.MESA || "-"}
🔢 Orden: ${ciudadano.ORDEN || "-"}

╔════════════════╗
        🇵🇾 *LISTA 1* ☝🏻
        🚩 *OPCIÓN 4*
╚════════════════╝`;


        // ===================================================
        // MENSAJE 2 — RESULTADOS
        // ===================================================

        let plantillaResultados =
`📌 *RESULTADOS*

🗳️ Estado voto: ${ciudadano.DES_VOTO || "-"}
🌱 Indígena: ${esIndigen}

🎂 Fecha nacimiento: ${fechaNac}
🎯 Edad: ${ciudadano.EDAD || "-"}
🚻 Sexo: ${genero}

📊 Total en tu lista: ${totalLista}`;


        // ===================================================
        // PREGUNTA PARA GUARDAR
        // ===================================================

        if (modo === "ACTUALIZACION") {

            plantillaResultados +=
`

💾 ¿Desea guardar este registro en su lista?

*S* = Sí
*N* = No`;

        }


        // ===================================================
        // GUARDAR ESTADO PARA RESPONDER S / N
        // ===================================================

        if(modo === "ACTUALIZACION"){

            userState[from] = {

                action: "preguntar_guardar",

                cedula: ciudadano.CEDULA,

                datos: {

                    nombre:
                    ciudadano.NOMBRE,

                    apellido:
                    ciudadano.APELLIDO,

                    local:
                    ciudadano.local,

                    mesa:
                    ciudadano.MESA || null,

                    orden:
                    ciudadano.ORDEN || null,

                    celular:
                    ciudadano.CELULAR || null,

                    depart:
                    ciudadano.DEPART,

                    distrito:
                    ciudadano.DISTRITO,

                    zona:
                    ciudadano.ZONA

                }

            };

        }


        // ===================================================
        // ENVIAR MENSAJE 1
        // ===================================================

        await sock.sendMessage(from, {
            text: plantillaPadron
        });


        // ===================================================
        // ENVIAR MENSAJE 2
        // ===================================================

        await sock.sendMessage(from, {
            text: plantillaResultados
        });



    } catch (err) {


        console.error(err);


        await sock.sendMessage(from, {

            text:
            "❌ Ocurrió un error al procesar la consulta en el padrón."

        });


    }



    return;

}



// ===================================================
// BÚSQUEDA POR NOMBRE CON COMANDO BUSCAR
// ===================================================

if (cleanLower.startsWith("buscar ")) {


    const textoBusqueda =
        cleanText.substring(7).trim();



    if (textoBusqueda.length < 3) {


        await sock.sendMessage(from,{
            text:
            "❌ Escriba al menos 3 caracteres."
        });


        return;

    }





    try {


        let departamento = null;
        let distrito = null;





        if (telefono !== ADMIN) {



            const [opData] = await db.execute(
            `
            SELECT
                c.departamento,
                c.distrito
            FROM operadores o
            LEFT JOIN candidatos c
                ON c.id = o.candidato_id
            WHERE o.telefono = ?
            LIMIT 1
            `,
            [
                telefono
            ]
            );




            if (
                opData.length === 0 ||
                !opData[0].departamento
            ) {


                await sock.sendMessage(from,{

                    text:
                    "⚠️ Este operador todavía no tiene candidato asignado."

                });


                return;

            }




            departamento =
                opData[0].departamento;


            distrito =
                opData[0].distrito;


        }





        const resultados =
            await buscarPorNombre(
                textoBusqueda,
                departamento,
                distrito
            );





        if(resultados.length === 0){


            await sock.sendMessage(from,{

                text:
                `🔍 No se encontraron ciudadanos con:\n"${textoBusqueda}"`

            });


            return;

        }





        let respuestaBusqueda =
`🔍 *RESULTADOS PARA:*

${textoBusqueda.toUpperCase()}

`;




        resultados.forEach((c,index)=>{


            respuestaBusqueda +=

`${index + 1}️⃣ *${c.NOMBRE} ${c.APELLIDO}*

🆔 C.I.: ${c.CEDULA}

📍 ${c.departamento || "-"} - ${c.distrito || "-"}

━━━━━━━━━━━━━━

`;

        });




        respuestaBusqueda +=

`💡 Escriba la C.I. para ver los datos completos.`;





        await sock.sendMessage(from,{

            text:
            respuestaBusqueda

        });




    } catch(err){


        console.error(err);



        await sock.sendMessage(from,{

            text:
            "❌ Error al buscar ciudadanos."

        });


    }



    return;

}

// ===================================================
// FIN HANDLE COMMAND
// ===================================================

}