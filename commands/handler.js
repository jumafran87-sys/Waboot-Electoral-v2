import { exec } from "child_process";
import { db } from "../database/mysql.js";
import {
  consultarPadron,
  buscarPorNombre
} from "../services/padronService.js";

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

  // ===================================================
  // VALIDAR OPERADOR
  // ===================================================

  const [op] = await db.execute(
    `SELECT id
       FROM operadores
      WHERE telefono = ?
        AND activo = 1
      LIMIT 1`,
    [telefono]
  );

  if (op.length === 0) {
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

      await db.execute(
        `INSERT INTO operadores
            (telefono, nombre, activo)
         VALUES
            (?, ?, 1)
         ON DUPLICATE KEY UPDATE
            nombre = VALUES(nombre),
            activo = 1`,
        [nuevoTelefono, nombre]
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

Escriba otra cédula o un nombre.`;


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