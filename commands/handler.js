import { exec } from "child_process";
import { db } from "../database/mysql.js";

import {
  consultarPadron,
  buscarPorNombre
} from "../services/padronService.js";

import {
    obtenerModoBot,
    cambiarModoBot
} from "../services/configBotService.js";


import {
    validarOperador,
    altaOperador
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


const ADMIN = "595985761431";

export async function handleCommand(
  sock,
  msg,
  from,
  text,
  telefono,
  userState
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

    const partes = cleanText.split(" ");

    if (partes.length < 3) {
      await sock.sendMessage(from, {
        text:
          "❌ Formato incorrecto.\n\n" +
          "Usá:\n" +
          "alta 595981234567 Juan Perez"
      });
      return;
    }

    const nuevoTelefono = partes[1].replace(/\D/g, "");
    const nombre = partes.slice(2).join(" ");

    if (!/^595\d{9}$/.test(nuevoTelefono)) {
      await sock.sendMessage(from, {
        text: "❌ Número inválido. Debe iniciar con 595."
      });
      return;
    }

    try {

     await altaOperador(
    nuevoTelefono,
    nombre
	);

      await sock.sendMessage(from, {
        text:
          "✅ Operador registrado correctamente.\n\n" +
          `👤 ${nombre}\n` +
          `📞 ${nuevoTelefono}`
      });

    } catch (err) {

      console.error(err);

      await sock.sendMessage(from, {
        text: "❌ Error registrando operador."
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


await db.execute(
    `INSERT INTO historial_votos
    (
        cedula,
        operador_telefono,
        candidato_id,
        estado,
        ciudad
    )
    VALUES (?,?,?,?,?)`,
    [
        cedula,
        telefono,
        candidato_id,
        "S",
        ciudad
    ]
);

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

// ================== GUARDAR ASIGNACIÓN ==================
if (userState[from]?.action === "preguntar_guardar") {

    const respuesta = cleanText.toUpperCase();

    if (!["S","N"].includes(respuesta)) {

        await sock.sendMessage(from,{
            text:"✍️ Respondé *S* o *N*."
        });

        return;
    }

    if (respuesta === "N") {

        delete userState[from];

        await sock.sendMessage(from,{
            text:"❌ Registro cancelado.\n\nPodés consultar otra cédula."
        });

        return;
    }

    const { cedula, datos } = userState[from];
	
	
	// ================== OBTENER CANDIDATO DEL OPERADOR ==================

	const [operadorData] = await db.execute(
    `SELECT 
        o.candidato_id,
        c.ciudad
     FROM operadores o
     LEFT JOIN candidatos c
        ON c.id = o.candidato_id
     WHERE o.telefono = ?
     LIMIT 1`,
    [telefono]
	);


	let candidato_id = null;
	let ciudad = null;


	if (operadorData.length > 0) {

    candidato_id = operadorData[0].candidato_id;
    ciudad = operadorData[0].ciudad;

	}
	
	
	

await guardarAsignacion({

    operador: telefono,
    cedula,
    nombre: datos.nombre,
    apellido: datos.apellido,
    local: datos.local,
    mesa: datos.mesa,
    orden: datos.orden,
    celular: datos.celular,
    ciudad,
    candidato_id

});

    userState[from]={
        action:"preguntar_actualizar",
        cedula
    };

    await sock.sendMessage(from,{
        text:
`✅ Asignación registrada correctamente.

¿Desea actualizar datos?

*S* = Sí
*N* = No`
    });

    return;
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


      const plantilla =
`🇵🇾 *PADRÓN ELECTORAL*

👤 *${ciudadano.NOMBRE} ${ciudadano.APELLIDO}*

🆔 *C.I.*
${ciudadano.CEDULA}

🎂 *Fecha nacimiento*
${fechaNac}

🚻 *Sexo*
${genero}

📍 *Departamento*
${ciudadano.departamento || "-"}

🏙️ *Distrito*
${ciudadano.distrito || "-"}

🏫 *Local de votación*
${ciudadano.local || "-"}

━━━━━━━━━━━━━━

¿Desea guardar esta asignación?
Responda *S* o *N*.`;



	userState[from] = {
    action: "preguntar_guardar",
    cedula: ciudadano.CEDULA,
    datos: {
        nombre: ciudadano.NOMBRE,
        apellido: ciudadano.APELLIDO,
        local: ciudadano.local,
        mesa: ciudadano.MESA || null,
        orden: ciudadano.ORDEN || null,
        celular: ciudadano.CELULAR || null
    }
};

      await sock.sendMessage(from, {
        text: plantilla
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
  // BÚSQUEDA POR NOMBRE Y APELLIDO
  // ===================================================


  if (
    cleanText.length >= 3 &&
    !/^\d+$/.test(cleanText)
  ) {


    const comandos = [
      "restart",
      "alta",
      "cnx",
      "estado"
    ];


    if (
      comandos.some(cmd =>
        cleanLower.startsWith(cmd)
      )
    ) {
      return;
    }



    try {


      const resultados =
        await buscarPorNombre(cleanText);



      if (resultados.length === 0) {



        await sock.sendMessage(from, {

          text:
            `🔍 No se encontraron ciudadanos con el nombre:\n"${cleanText}"`

        });


        return;
      }



      let respuestaBusqueda =
`🔍 *RESULTADOS PARA:*
${cleanText.toUpperCase()}

`;



      resultados.forEach((c, index) => {

        respuestaBusqueda +=
`${index + 1}️⃣ *${c.NOMBRE} ${c.APELLIDO}*

🆔 C.I.: ${c.CEDULA}

━━━━━━━━━━━━━━

`;

      });



      respuestaBusqueda +=
`💡 Para ver el local de votación completo,
escriba el número de Cédula.`;



      await sock.sendMessage(from, {

        text: respuestaBusqueda

      });



    } catch (err) {


      console.error(err);


      await sock.sendMessage(from, {

        text:
          "❌ Ocurrió un error al buscar por nombre."

      });

    }


    return;

  }


}