import { exec } from "child_process";
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from "@whiskeysockets/baileys";

import qrcode from "qrcode-terminal";
import mysql from "mysql2/promise";

// ================== DB ==================
//const db = mysql.createPool({
 // host: "localhost",
  //user: "root",
  //password: "",
  //database: "padron_2026",
  //waitForConnections: true,
  //connectionLimit: 10,
//});
let db;

async function connectDB() {
  try {
    db = await mysql.createPool({
      host: "localhost",
      user: "root",
      password: "",
      database: "padron_2026",
      waitForConnections: true,
      connectionLimit: 10,
    });

    // Probar conexión
    await db.query("SELECT 1");
    console.log("✅ MySQL conectado correctamente");
  } catch (err) {
    console.error("❌ Error conectando a MySQL. Reintentando en 5 segundos...");
    setTimeout(connectDB, 5000);
  }
}

connectDB();
// ================== ESTADO ==================
const userState = {};
const processedMessages = new Set();

// ================== FORMATEAR CELULAR ==================
function formatearWaMe(num) {
  if (!num) return "-";
  let n = num.toString().replace(/\D/g, "");
  n = n.replace(/^0+/, "");
  if (n.startsWith("595")) return `wa.me/${n}`;
  if (n.startsWith("9")) return `wa.me/595${n}`;
  return `wa.me/595${n}`;
}

// ================== BOT ==================
let sock;
let isReconnecting = false;

async function startBot() {
  if (isReconnecting) return;
  isReconnecting = true;

  try {
		if (sock) {
	try {
    sock.ev.removeAllListeners();
	} catch {}
	}
	
	
    const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      browser: ["windows", "Chrome", "10"],
      //printQRInTerminal: true,
    });

    sock.ev.on("creds.update", saveCreds);

  // ================== CONEXIÓN ==================
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📲 Escaneá el QR:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("✅ WhatsApp conectado correctamente");
    }

    if (connection === "close") {
	const statusCode = lastDisconnect?.error?.output?.statusCode;

	const shouldReconnect =
    statusCode !== DisconnectReason.loggedOut;

	console.log("⚠️ Conexión cerrada:", statusCode);

	if (shouldReconnect) {
    setTimeout(() => {
      isReconnecting = false;
      startBot();
    }, 3000);
	} else {
    console.log("❌ Sesión cerrada. Borra auth_info.");
	}
	}
  });

  // ================== MENSAJES ==================
  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg?.message || msg.key.fromMe) return;

      const msgId = msg.key.id;
      if (processedMessages.has(msgId)) return;
      processedMessages.add(msgId);
      setTimeout(() => processedMessages.delete(msgId), 60000);

      const from = msg.key.remoteJid;
      if (from.endsWith("@g.us")) return;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      //const cleanText = text.trim();
	  let cleanText = text.trim();
      const respuesta = cleanText.toUpperCase();
      const cleanLower = cleanText.toLowerCase();

      const telefono =
        msg.key.remoteJidAlt?.replace("@s.whatsapp.net", "") ||
        from.replace("@s.whatsapp.net", "").replace("@lid", "");

      const myNumber = sock.user?.id?.split(":")[0];
      if (telefono === myNumber) return;

      console.log("📩", telefono, "→", cleanText);
	  
			  // ================== INSERTAR EN BUZÓN DE ENTRADA ==================
		const mensaje = {
		  numero: telefono,
		  texto:
			msg.message.conversation ||
			msg.message.extendedTextMessage?.text ||
			"",
		  tipo: "mensaje",
		  data: JSON.stringify(msg),
		};

		await db.execute(
		  `INSERT INTO buzonentrada (numero, texto, tipo, data)
		   VALUES (?, ?, ?, ?)`,
		  [mensaje.numero, mensaje.texto, mensaje.tipo, mensaje.data]
		);





      // ================== VALIDAR OPERADOR ==================
      const [op] = await db.execute(
        `SELECT id FROM operadores WHERE telefono = ? AND activo = 1 LIMIT 1`,
        [telefono]
      );

      if (op.length === 0) {
        await sock.sendMessage(from, {
          text: "⛔ No estás autorizado para usar este sistema.",
        });
        return;
      }

	const ADMIN = "595985761431";
	
	// ================== COMANDO RESTART ==================
if (cleanLower === "restart") {

  if (telefono !== ADMIN) {
    await sock.sendMessage(from, {
      text: "⛔ No autorizado.",
    });
    return;
  }

  await sock.sendMessage(from, {
    text: "♻️ Reiniciando bot...",
  });

  exec("pm2 restart wabot", async (error, stdout, stderr) => {

    if (error) {

      console.error(error);

      try {

        await sock.sendMessage(from, {
          text: "❌ Error reiniciando PM2",
        });

      } catch (e) {

        console.error(e);

      }

      return;
    }

    console.log(stdout);

  });

  return;
}
	
	// ================== ALTA OPERADOR ==================
if (cleanLower.startsWith("alta ")) {

  // Solo admin puede crear operadores
  if (telefono !== ADMIN) {
    await sock.sendMessage(from, {
      text: "⛔ No autorizado.",
    });
    return;
  }

  // Separar datos
  const partes = cleanText.split(" ");

  if (partes.length < 3) {
    await sock.sendMessage(from, {
      text:
        "❌ Formato incorrecto.\n\n" +
        "Usá:\n" +
        "alta 595981234567 Juan Perez",
    });
    return;
  }

  const nuevoTelefono = partes[1].replace(/\D/g, "");
  const nombre = partes.slice(2).join(" ");

  // Validar teléfono
  if (!/^595\d{9}$/.test(nuevoTelefono)) {
    await sock.sendMessage(from, {
      text: "❌ Número inválido. Debe iniciar con 595.",
    });
    return;
  }

  try {

    await db.execute(
      `INSERT INTO operadores
       (telefono, nombre, activo)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE
       nombre = VALUES(nombre),
       activo = 1`,
      [nuevoTelefono, nombre]
    );

    await sock.sendMessage(from, {
      text:
        "✅ Operador registrado correctamente.\n\n" +
        `👤 ${nombre}\n` +
        `📞 ${nuevoTelefono}`,
    });

  } catch (err) {

    console.error(err);

    await sock.sendMessage(from, {
      text: "❌ Error registrando operador.",
    });
  }

  return;
}
//*-*-*------------------------------------------------------------------------fin alta operador
		// ================== COMANDO CNX ==================
		if (cleanLower === "cnx") {

		  let dbStatus = "❌ DB desconectada";
		  try {
			await db.query("SELECT 1");
			dbStatus = "✅ DB conectada";
		  } catch (e) {
			dbStatus = "❌ DB error";
		  }

		  const waStatus = sock?.user ? "✅ WhatsApp conectado" : "❌ WhatsApp no conectado";

		  await sock.sendMessage(from, {
			text:
			  "🔎 ESTADO DEL SISTEMA\n\n" +
			  waStatus + "\n" +
			  dbStatus + "\n\n" +
			  "🟢 Bot activo y funcionando.",
		  });

		  return;
		}
		// ================== COMANDO ESTADO ==================
if (cleanLower === "estado") {

  // Estado DB
  let dbStatus = "❌ DB desconectada";
  try {
    await db.query("SELECT 1");
    dbStatus = "✅ DB conectada";
  } catch (e) {
    dbStatus = "❌ DB error";
  }

  // Estado WhatsApp
  const waStatus = sock?.user
    ? "✅ WhatsApp conectado"
    : "❌ WhatsApp no conectado";

  // Uptime
  const uptimeSeconds = process.uptime();
  const uptimeMin = Math.floor(uptimeSeconds / 60);
  const uptimeHours = Math.floor(uptimeMin / 60);

  // Memoria
  const memory = process.memoryUsage().rss / 1024 / 1024;

  // Usuarios activos
  const sesionesActivas = Object.keys(userState).length;

  await sock.sendMessage(from, {
    text:
      "📊 ESTADO DEL SISTEMA\n\n" +
      waStatus + "\n" +
      dbStatus + "\n\n" +
      "⏱ Uptime: " + uptimeHours + "h " + (uptimeMin % 60) + "m\n" +
      "🧠 RAM usada: " + memory.toFixed(2) + " MB\n" +
      "👥 Sesiones activas: " + sesionesActivas + "\n" +
      "🕒 Hora servidor: " + new Date().toLocaleString(),
  });

  return;
}
			// ================== COMANDO LISTAR ==================
if (cleanLower === "listar") {
  try {
    const [rows] = await db.execute(
      `SELECT cedula, nombre, apellido, local, mesa, orden,
              celular, celunew, ubi, observacion, voto
       FROM asignaciones
       WHERE operador_telefono = ?
       ORDER BY fechahora DESC`,
      [telefono]
    );

    if (rows.length === 0) {
      await sock.sendMessage(from, {
        text: "📋 No hay registros asignados aún."
      });
      return;
    }

    let mensaje = "📋 *Lista de asignaciones Lista 4🚩 Opción 1☝🏻 *\n\n";

    rows.forEach((r, i) => {
      const cel = formatearWaMe(r.celunew || r.celular);

      const ubi = r.ubi
        ? `https://maps.google.com/?q=${r.ubi}`
        : "-";

      mensaje +=
`${i + 1}) ${r.cedula} | ${r.nombre} ${r.apellido}\n` +
`🏫 ${r.local} | Mesa ${r.mesa} | Ord ${r.orden}\n` +
`📞 ${cel}\n` +
`🗳️ ${r.voto || "-"} | 📝 ${r.observacion || "-"}\n\n`;
    });

    const partes = mensaje.match(/[\s\S]{1,3500}/g);

    for (const parte of partes) {
      await sock.sendMessage(from, { text: parte });
    }

    return;

  } catch (err) {
    console.error(err);
    await sock.sendMessage(from, {
      text: "❌ Error al listar tus asignaciones."
    });
    return;
  }
}


/*/*/////////
///////////////////////Comando resumen
if (cleanLower === "resumen") {

  // 1. padrón total
  const [[padron]] = await db.execute(
    `SELECT COUNT(*) AS total FROM padron_mra2`
  );

  // 2. asignados operador
  const [[asig]] = await db.execute(
    `SELECT COUNT(DISTINCT cedula) AS total
     FROM asignaciones
     WHERE operador_telefono = ?`,
    [telefono]
  );

  // 3. votaron total
  const [[votaron]] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM padron_mra2
     WHERE voto = 'S'`
  );

  // 4. votaron asignados
  const [[votaronAsig]] = await db.execute(
    `SELECT COUNT(DISTINCT cedula) AS total
     FROM asignaciones
     WHERE operador_telefono = ?
     AND voto = 'S'`,
    [telefono]
  );

  const mensaje =
`📊 *RESUMEN DEL SISTEMA*

🧾 Padrón total:
${padron.total}

📋 Tus asignaciones:
${asig.total}

🗳 Votaron (total):
${votaron.total}

📌 Votaron tus asignados:
${votaronAsig.total}

━━━━━━━━━━━━━━
⚡ Sistema activo en tiempo real`;

  await sock.sendMessage(from, { text: mensaje });

  return;
}///////////////////////////////////////////////////////////////////////////

// ================== PANEL ==================
if (cleanLower === "panel") {

  if (telefono !== ADMIN) {
    await sock.sendMessage(from, { text: "⛔ No autorizado" });
    return;
  }

  userState[from] = { action: "panel" };

  await sock.sendMessage(from, {
    text:
`📊 *PANEL DE CONTROL*

1️⃣ Resumen general
2️⃣ Operadores activos
3️⃣ Actividad reciente
4️⃣ Votos del día
5️⃣ Buscar cédula
6️⃣ Top operadores
0️⃣ Salir
✍️ Responde con el número`
  });

  return;
}


/////////Manejo del panel
if (userState[from]?.action === "panel") {

  const op = cleanText.trim();

  // ================== RESUMEN ==================
  if (op === "1") {

    const [[p]] = await db.execute(`SELECT COUNT(*) total FROM padron_mra2`);
    const [[a]] = await db.execute(
      `SELECT COUNT(DISTINCT cedula) total FROM asignaciones`
    );
    const [[v]] = await db.execute(
      `SELECT COUNT(*) total FROM padron_mra2 WHERE voto='S'`
    );

    await sock.sendMessage(from, {
      text:
`📊 RESUMEN GENERAL

🧾 Padrón: ${p.total}
📋 Asignaciones: ${a.total}
🗳 Votos: ${v.total}`
    });

    return;
  }

  // ================== OPERADORES ==================
  if (op === "2") {

    const [rows] = await db.execute(
      `SELECT operador_telefono,
              COUNT(DISTINCT cedula) as total
       FROM asignaciones
       GROUP BY operador_telefono
       ORDER BY total DESC
       LIMIT 10`
    );

    let msg = `👥 TOP OPERADORES\n\n`;

    rows.forEach((r, i) => {
      msg += `${i + 1}) ${r.operador_telefono} → ${r.total}\n`;
    });

    await sock.sendMessage(from, { text: msg });
    return;
  }

  // ================== VOTOS DEL DÍA ==================
  if (op === "4") {

    const [rows] = await db.execute(
      `SELECT COUNT(*) total
       FROM padron_mra2
       WHERE voto='S'`
    );

    await sock.sendMessage(from, {
      text: `🗳 Total votos registrados: ${rows[0].total}`
    });

    return;
  }

  // ================== BUSCAR CÉDULA ==================
  if (op === "5") {

    userState[from] = { action: "panel_buscar_cedula" };

    await sock.sendMessage(from, {
      text: "🔎 Enviá la cédula a buscar"
    });

    return;
  }

// ================== ACTIVIDAD RECIENTE ==================
  if (op === "3") {

    const [rows] = await db.execute(
      `SELECT operador_telefono,
              cedula,
              fechahora
       FROM asignaciones
       ORDER BY fechahora DESC
       LIMIT 10`
    );

    let msg = `🕒 ACTIVIDAD RECIENTE\n\n`;

    rows.forEach((r, i) => {
      msg +=
        `${i + 1}) ${r.operador_telefono}\n` +
        `🆔 ${r.cedula}\n` +
        `⏱ ${new Date(r.fechahora).toLocaleString()}\n\n`;
    });

    await sock.sendMessage(from, { text: msg });

    userState[from] = { action: "panel" };

    return;
  }

  // ================== TOP OPERADORES ==================
  if (op === "6") {

  console.log("ENTRÓ A OPCIÓN 6");

  const [rows] = await db.execute(
    `SELECT 
      a.operador_telefono,
      o.nombre AS operador_nombre,
      COUNT(DISTINCT a.cedula) AS total,
      COUNT(CASE WHEN a.voto='S' THEN 1 END) AS votos
    FROM asignaciones a
    LEFT JOIN operadores o 
      ON o.telefono = a.operador_telefono
    GROUP BY a.operador_telefono, o.nombre
    ORDER BY total DESC
    LIMIT 50`
  );

  let msg =
`👥 TOP OPERADORES

Ord  Nombre           Reg
──────────────────────────
`;

  rows.forEach((r, i) => {

    const nombre = (r.operador_nombre || "SIN NOMBRE").split(" ")[0];
    const ultimos3 = r.operador_telefono.slice(-3);

    msg +=
      `${(i + 1)}) `.padEnd(4) +
      `${(nombre + "-" + ultimos3).padEnd(18)}` +
      `${r.total}\n`;
  });

  await sock.sendMessage(from, { text: msg });

  userState[from] = { action: "panel" };

  return;
}


  // salir
  if (op === "0") {
    delete userState[from];
    await sock.sendMessage(from, { text: "📴 Panel cerrado" });
    return;
  }

 await sock.sendMessage(from, {
    text: "✍️ Opción inválida. Saliendo del panel., Envia Devuelta"
  });

  delete userState[from];
  return;
}



/////Buscador de Cedula desde panel
if (userState[from]?.action === "panel_buscar_cedula") {

  const cedula = cleanText.trim();

  const [rows] = await db.execute(
    `SELECT nombre, apellido, mesa, local, voto
     FROM padron_mra2
     WHERE numero_ced = ?`,
    [cedula]
  );

  if (rows.length === 0) {
    await sock.sendMessage(from, {
      text: "❌ No encontrado"
    });
    return;
  }

  const r = rows[0];

  await sock.sendMessage(from, {
    text:
`🔎 RESULTADO

👤 ${r.nombre} ${r.apellido}
🏫 ${r.local}
📍 Mesa ${r.mesa}
🗳 Voto: ${r.voto === "S" ? "SI" : "NO"}`
  });

  userState[from] = { action: "panel" };
  return;
}

///comando Ayuda
if (cleanLower === "ayuda") {

  // validar operador activo (ya lo tenés arriba, pero opcional refuerzo)
  const [op] = await db.execute(
    `SELECT id FROM operadores WHERE telefono = ? AND activo = 1 LIMIT 1`,
    [telefono]
  );

  if (op.length === 0) {
    await sock.sendMessage(from, {
      text: "⛔ No estás autorizado."
    });
    return;
  }

  await sock.sendMessage(from, {
    text:
`🆘 *AYUDA - SISTEMA OPERADORES*

📌 FUNCIONES DISPONIBLES:

🔎 1. Consultar cédula
👉 Envía directamente la cédula
Ej: 1234567

💾 2. Guardar registro
👉 Responde S o N cuando el sistema lo pida

📲 3. Actualizar datos
Después de guardar:
- A = celular
- B = ubicación
- C = observación
- D = salir

📋 4. Ver mis asignaciones
👉 Escribe: listar

🔄 5. Reiniciar estado
👉 Escribe: reset

📊 6. Comprobar Sistema
👉 Escribe: cnx

//🗳 2. Marcar voto para el dia de la Votacion
//👉 Envía: V1234567
━━━━━━━━━━━━━━
⚠️ IMPORTANTE:
- No compartas este sistema
- Usar solo datos reales
- Evitar mensajes fuera de flujo`
  });

  return;
}


      // ================== RESET ==================
      if (cleanLower === "reset" || cleanLower === "cancelar") {
        delete userState[from];
        await sock.sendMessage(from, {
          text: "🔄 Estado reiniciado. Podés enviar una cédula.",
        });
        return;
      }


// ================== GUARDAR EN LISTA ==================
if (userState[from]?.action === "preguntar_guardar") {

  const { cedula, datos } = userState[from];

  if (respuesta === "S") {

    // ================== REGISTRAR ASIGNACIÓN ==================
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
         celular,
         celunew,
         ubi,
         observacion
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nombre = VALUES(nombre),
         apellido = VALUES(apellido),
         local = VALUES(local),
         mesa = VALUES(mesa),
         orden = VALUES(orden),
         celular = VALUES(celular),
         celunew = VALUES(celunew),
         ubi = VALUES(ubi),
         observacion = VALUES(observacion),
         fechahora = CURRENT_TIMESTAMP`,
      [
        telefono,
        cedula,
        datos.nombre,
        datos.apellido,
        datos.local,
        datos.mesa,
        datos.orden,
        datos.CELULAR,
        datos.celunew,
        datos.ubi,
        datos.observacion || null
      ]
    );

    userState[from] = {
      action: "preguntar_actualizar",
      cedula
    };

    await sock.sendMessage(from, {
      text:
        "✅ Registro guardado correctamente.\n\n" +
        "¿Desea actualizar datos? *(S/N)*, Envia *N* si desea consultar otra Cedula"
    });

    return;
  }

  if (respuesta === "N") {

    delete userState[from];

    await sock.sendMessage(from, {
      text: "✍️ Registro no guardado. Envia otro numero de Cedula",
    });

    return;
  }

  await sock.sendMessage(from, {
    text: "✍️ Respondé *S* o *N*.",
  });

  return;
}


//-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* hasta aqui 


      // ================== FLUJO S/N ==================
      if (userState[from]?.action === "preguntar_actualizar") {
        if (respuesta === "S") {
          userState[from].action = "actualizar";
          await sock.sendMessage(from, {
            text:
              "¿Qué deseas hacer?\n\n" +
              "A) Actualizar celular\n" +
              "B) Agregar ubicación\n" +
			  "C) Observación\n" +
              "D) Nada (salir)\n\n" +
              "Respondé A, B,C o D.",
			  			    
          });
          return;
        }

        if (respuesta === "N") {
          delete userState[from];
          await sock.sendMessage(from, {
            text: "✅ Listo. Podés consultar otra cédula.",
          });
          return;
        }

        await sock.sendMessage(from, {
          text: "✍️ Respondé *S*, si desea actualizar  o *N*, consultar otra cedula.",
        });
        return;
      }

      // ================== MENÚ A/B/C/D ==================
      if (userState[from]?.action === "actualizar") {
        if (!["A", "B", "C", "D"].includes(respuesta)) {
          await sock.sendMessage(from, { text: "✍️ Respondé A, B, C o *D* si desea Salir y enviar Otro Nro de cedula." });
          return;
        }

        const cedula = userState[from].cedula;

        if (respuesta === "A") {
          userState[from] = { action: "actualizar_cel", cedula };
          await sock.sendMessage(from, {
            text: "📲 Enviá el nuevo número (solo números).",
          });
          return;
        }

        if (respuesta === "B") {
          userState[from] = { action: "actualizar_ubi", cedula };
          await sock.sendMessage(from, {
            text: "📍 Enviá ubicación o link Google Maps.",
          });
          return;
        }
		if (respuesta === "D") {
		delete userState[from];
		await sock.sendMessage(from, { text: "✅ No se actualizó nada. Envie Otro numero de Cedula" });
		return;
		}
		
		if (respuesta === "C") {
		userState[from] = { action: "actualizar_obs", cedula };
		await sock.sendMessage(from, {
		text: "📝 Enviá la observación que deseas guardar.",
		});
		return;
		}

        delete userState[from];
        await sock.sendMessage(from, { text: "✅ No se actualizó nada." });
        return;
      }

      // ================== ACTUALIZAR CEL ==================
      if (userState[from]?.action === "actualizar_cel") {
        const cedula = userState[from].cedula;
        const nuevoCel = cleanText.replace(/\D/g, "");

        if (!/^\d{8,13}$/.test(nuevoCel)) {
          await sock.sendMessage(from, {
            text: "✍️ Número inválido (8-13 dígitos).",
          });
          return;
        }

		if (!nuevoCel) {
			await sock.sendMessage(from, {
			text: "✍️ Número vacío",
			});
		return;
}

		const cedulaNum = parseInt(cedula);
       await db.execute(
		`UPDATE padron_mra2 SET celunew = ? WHERE numero_ced = ?`,
		[nuevoCel, cedulaNum]
			);
		
		const [result] = await db.execute(
		`UPDATE padron_mra2 SET celunew = ? WHERE numero_ced = ?`,
		[nuevoCel, cedulaNum]
		);

console.log("Filas afectadas:", result.affectedRows);


        userState[from] = { action: "preguntar_actualizar", cedula };

        await sock.sendMessage(from, {
          text: "✅ Celular actualizado.\n\n¿Desea actualizar algo más? (S/N)",
        });

        return;
      }


	//console.log(JSON.stringify(msg, null, 2));
     // ================== ACTUALIZAR UBICACION ==================-------------------------------------------------
if (userState[from]?.action === "actualizar_ubi") {

  const cedula = userState[from].cedula;

  let ubicacion = null;

  // ================== UBICACION GPS ==================
  if (msg.message?.locationMessage) {

    const loc = msg.message.locationMessage;

    ubicacion =
      `${loc.degreesLatitude},${loc.degreesLongitude}`;

  } else {

    // ================== LINK GOOGLE MAPS ==================
    const urlMatch =
      cleanText.match(/@([-0-9.]+),([-0-9.]+)/) ||
      cleanText.match(/q=([-0-9.]+),([-0-9.]+)/);

    if (urlMatch) {

      ubicacion = `${urlMatch[1]},${urlMatch[2]}`;

    } else {

      // ================== TEXTO NORMAL ==================
      ubicacion = cleanText.trim();

    }
  }

  // VALIDAR
  if (!ubicacion || ubicacion.length < 3) {

    await sock.sendMessage(from, {
      text: "❌ No se pudo detectar la ubicación.",
    });

    return;
  }

  console.log("📍 Guardando ubicación:", ubicacion);
  console.log("📍 Cedula:", cedula);
  console.log("📍 Telefono:", telefono);

  // ================== UPDATE PADRON ==================
  const [upd1] = await db.execute(
    `UPDATE padron_mra2
     SET ubi = ?
     WHERE numero_ced = ?`,
    [ubicacion, cedula]
  );

  console.log(
    "padron_mra2 affectedRows:",
    upd1.affectedRows
  );

  // ================== UPDATE ASIGNACIONES ==================
const [upd2] = await db.execute(
  `UPDATE asignaciones
   SET ubi = ?,
       fechahora = CURRENT_TIMESTAMP
   WHERE operador_telefono = ?
   AND cedula = ?`,
  [ubicacion, telefono, cedula]
);

  console.log(
    "asignaciones affectedRows:",
    upd2.affectedRows
  );

  // ================== RESET ESTADO ==================
  delete userState[from];

  // ================== RESPUESTA ==================
  await sock.sendMessage(from, {
    text:
      `✅ Ubicación registrada.\n\n` +
      `📍 ${ubicacion}\n\n` +
      `🌎 https://maps.google.com/?q=${ubicacion}`
  });

  return;
}
//--------------------------------------------------------------------------------------------- ubicacion hasta aqui

// ================== ACTUALIZAR OBSERVACIÓN ==================
if (userState[from]?.action === "actualizar_obs") {
  const cedula = userState[from].cedula;
  const observacion = cleanText.trim();

  if (!observacion) {
    await sock.sendMessage(from, {
      text: "✍️ Observación vacía.",
    });
    return;
  }

  // Guardar en padron (DEBES tener columna "observacion")
  await db.execute(
    `UPDATE padron_mra2 SET observacion = ? WHERE numero_ced = ?`,
    [observacion, cedula]
  );

  // También en asignaciones
  await db.execute(
    `UPDATE asignaciones 
     SET observacion = ?,
         fechahora = CURRENT_TIMESTAMP
     WHERE operador_telefono = ? AND cedula = ?`,
    [observacion, telefono, cedula]
  );

  delete userState[from];

  await sock.sendMessage(from, {
    text: "📝 Observación guardada correctamente, Puede Enviar otro Nro de Cedula.",
  });

  return;
}

//---------------------------------------------------------------------- actualizar observacion hasta aqui


// ================== BUSCAR PERSONA ==================
if (
  cleanLower.startsWith("buscar ") ||
  cleanLower.startsWith("b ")
) {

  let termino = cleanText
    .replace(/^buscar\s+/i, "")
    .replace(/^b\s+/i, "")
    .trim();

  // mínimo 3 caracteres
  if (termino.length < 3) {

    await sock.sendMessage(from, {
      text:
        "✍️ Escriba al menos 3 letras.\n\n" +
        "Ejemplo:\n" +
        "buscar perez\n" +
        "buscar juan perez"
    });

    return;
  }

  // separar palabras
  const palabras = termino.split(/\s+/);

  let where = [];
  let params = [];

  for (const p of palabras) {

    where.push(`
      (
        nombre LIKE ?
        OR apellido LIKE ?
      )
    `);

    params.push(`%${p}%`);
    params.push(`%${p}%`);
  }

  const sql = `
    SELECT
      numero_ced,
      nombre,
      apellido,
      local,
      mesa,
      seccional
    FROM padron_mra2
    WHERE ${where.join(" AND ")}
    ORDER BY apellido, nombre
    LIMIT 10
  `;

  const [rows] = await db.execute(sql, params);

  if (rows.length === 0) {

    await sock.sendMessage(from, {
      text: "❌ No se encontraron coincidencias."
    });

    return;
  }

  let mensaje =
    `🔎 RESULTADOS DE BÚSQUEDA\n\n`;

  rows.forEach((r, i) => {

    mensaje +=
      `${i + 1}) ${r.apellido} ${r.nombre}\n` +
      `🆔 ${r.numero_ced}\n` +
      `🏫 ${r.local}\n` +
      `📍 Mesa ${r.mesa}\n` +
      `🏛 Seccional ${r.seccional}\n\n`;

  });

  mensaje +=
    "✍️ Para consultar, Envia el Nro del listado☝🏻.";

  
  
  userState[from] = {
  action: "seleccionar_busqueda",
  resultados: rows
};

await sock.sendMessage(from, {
  text: mensaje
});

return;
}



// ================== SELECCIONAR RESULTADO BUSQUEDA ==================
if (userState[from]?.action === "seleccionar_busqueda") {

  const op = parseInt(cleanText);

  // validar número
  if (isNaN(op)) {

    await sock.sendMessage(from, {
      text:
        "✍️ Responde con el número de la persona.\n\n" +
        "O escribe cancelar."
    });

    return;
  }

  const resultados =
    userState[from].resultados;

  const seleccionado =
    resultados[op - 1];

  if (!seleccionado) {

    await sock.sendMessage(from, {
      text: "️✍️Número inválido. o Envia Reset para seguir"
    });

    return;
  }

  // convertir selección en cédula
  cleanText = seleccionado.numero_ced.toString();

  // limpiar estado
  delete userState[from];
}


    // ================== VALIDAR CÉDULA / VOTO ==================

let esVoto = false;
let cedulaTexto = cleanText.trim();

// Detectar V123456 o v123456
if (/^[Vv]\d{6,8}$/.test(cedulaTexto)) {
  esVoto = true;
  cedulaTexto = cedulaTexto.substring(1);
}

// Validar cédula final
if (!/^\d{6,8}$/.test(cedulaTexto)) {
  await sock.sendMessage(from, {
    text: "✍️ Enviá una cédula válida.",
  });
  return;
}

const cedula = cedulaTexto;
	  
	  
	// ================== BUSCAR EN PADRÓN ==================

const [rows] = await db.execute(
  `SELECT *,
      COALESCE(
        NULLIF(TRIM(celunew), ''),
        NULLIF(TRIM(CELULAR), ''),
        'SIN NUMERO'
      ) AS celular_final
   FROM padron_mra2
   WHERE numero_ced = ?
   LIMIT 1`,
  [cedula]
);

// No encontrado
if (rows.length === 0) {

  await sock.sendMessage(from, {
    text: "❌ No se encontró en el padrón del Distrito de M.R.A.",
  });

  return;
}

const r = rows[0];

// ================== REGISTRAR VOTO ==================
if (esVoto) {

  // Ya votó
  if (r.voto === "S") {

    await sock.sendMessage(from, {
      text: "⚠️ Esta persona ya figura como votante.",
    });

  } else {

    // Actualizar padrón
    await db.execute(
      `UPDATE padron_mra2
       SET voto = 'S'
       WHERE numero_ced = ?`,
      [cedula]
    );

    // Actualizar asignaciones
    await db.execute(
      `UPDATE asignaciones
       SET voto = 'S',
           voto_fecha = NOW(),
           voto_operador = ?
       WHERE cedula = ?`,
      [telefono, cedula]
    );

    // Refrescar variable
    r.voto = "S";

    console.log("🗳 VOTO REGISTRADO:", cedula);
  }
} 
	  
	  
// ================== REGISTRAR USUARIO ==================
await db.execute(
  `INSERT INTO usuarios (telefono, nombre_whatsapp, total_consultas)
   VALUES (?, ?, 1)
   ON DUPLICATE KEY UPDATE
   nombre_whatsapp = VALUES(nombre_whatsapp),
   total_consultas = total_consultas + 1`,
  [telefono, msg.pushName || ""]
);

// ================== REGISTRAR CONSULTA ==================
await db.execute(
  `INSERT INTO consultas_padron
   (telefono, cedula_consultada, encontrada)
   VALUES (?, ?, ?)`,
  [telefono, cedula, 1]
);


// ================== TOTAL EN LISTA ==================
const [totalRows] = await db.execute(
  `SELECT COUNT(DISTINCT cedula) as total
   FROM asignaciones
   WHERE operador_telefono = ?`,
  [telefono]
);

const total = totalRows?.[0]?.total || 0;
	  
	//***************************************************************************	  

      const partido = r.PART_LAB
        ? r.PART_LAB.toUpperCase().includes("ANR") &&
          r.PART_LAB.toUpperCase().includes("PLRA")
          ? "🔴🔵"
          : r.PART_LAB.toUpperCase().includes("ANR")
          ? "🔴"
          : r.PART_LAB.toUpperCase().includes("PLRA")
          ? "🔵"
          : "🟡"
        : "";

      const celularMostrar = formatearWaMe(r.celular_final);



      const msg1 =
        `✅ DATOS ENCONTRADOS\n\n` +
        `🆔 Cédula: ${r.numero_ced}\n` +
        `👤 ${r.nombre} ${r.apellido}\n` +
        `🏠 Dirección: ${r.direccion}\n` +
        `🏫 Local: ${r.local}\n` +
        `📍 Mesa: ${r.mesa}\n` +
        `🔢 Orden: ${r.orden}\n` +
        `🏛 Seccional: ${r.seccional}\n\n` +
		`╔════════════════╗\n` +
		`            🇵🇾 *LISTA 4 🚩*\n` +
		`            ☝🏻 *OPCIÓN 1*\n` +
		`╚════════════════╝\n`;



      const msg2 =
        `📌 RESULTADOS\n` +
        `🎂 Edad: ${r.EDAD || "N/A"}\n` +
        `📌 Partido: ${partido}\n` +
        `🗳 ANR 2022: ${r.anr2022 || "N/A"}\n` +
        `🗳 Gral 2023: ${r.gral2023 || "N/A"}\n` +
		`📞 Celular: ${celularMostrar}\n` +
		`🗳 Votó: ${r.voto === "S" ? "✅ SI" : "❌ NO"}\n\n` +
        `📊 Total en tu lista: ${total}`;

      await sock.sendMessage(from, { text: msg1 });
      await sock.sendMessage(from, { text: msg2 });
	  
	  
	  // ================== SI ES VOTO, TERMINAR ==================
	if (esVoto) {

	await sock.sendMessage(from, {
    text:
      "🗳 VOTO REGISTRADO CORRECTAMENTE\n\n" +
      `👤 ${r.nombre} ${r.apellido}\n` +
      `🆔 ${r.numero_ced}\n` +
      `🏫 Mesa ${r.mesa} - Orden ${r.orden}`,
	});

	return;
	}
	  
	  

	userState[from] = {
			action: "preguntar_guardar",
			cedula,
			datos: r
		};

	await sock.sendMessage(from, {
	text: "💾 ¿Desea guardar este registro en su lista? (S/N)",
	});
	 		
    } catch (err) {
      console.error("ERROR:", err);
    }
  });

  } catch (err) {
    console.error("❌ Error iniciando bot:", err);

    setTimeout(() => {
      isReconnecting = false;
      startBot();
    }, 5000);
  }
}

startBot();