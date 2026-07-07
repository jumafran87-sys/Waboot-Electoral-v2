// 6. CONSULTA DE CÉDULA AUTOMÁTICA
  if (/^\d+$/.test(cleanText)) {
    try {
      const ciudadano = await consultarPadron(cleanText);

      if (!ciudadano) {
        await sock.sendMessage(from, { text: `❌ No se encontró ningún registro para la C.I. Nº ${cleanText}` });
        return;
      }

      // Formatear Fecha y Género de forma limpia
      const fechaNac = ciudadano.FEC_NAC ? new Date(ciudadano.FEC_NAC).toLocaleDateString('es-PY') : '-';
      const genero = ciudadano.SEXO === 'M' ? 'Masculino' : ciudadano.SEXO === 'F' ? 'Femenino' : '-';

       let bloqueMapa = "";
      if (ciudadano.direccion) {
        bloqueMapa += `📍 ${ciudadano.direccion}\n`;
      }
      if (ciudadano.latitud && ciudadano.longitud) {
        // Corrección aquí: agregado el '?' y los '$' para inyectar las variables correctamente
        bloqueMapa += `\n🌐 Ubicación en Google Maps:\nhttps://google.com{ciudadano.latitud},${ciudadano.longitud}\n`;
      }
      const plantilla = `🇵🇾 PADRÓN ELECTORAL

👤 ${ciudadano.NOMBRE} ${ciudadano.APELLIDO}

🆔 C.I.
${ciudadano.CEDULA}

🎂 ${fechaNac}

 ${genero}

📍 Departamento
${ciudadano.departamento || "CENTRAL"}

🏙 Distrito
${ciudadano.distrito || "MARIANO ROQUE ALONSO"}

🏫 Local de votación
${ciudadano.local || "Colegio Nacional Mariano Roque Alonso"}
${bloqueMapa}
━━━━━━━━━━━━━━

Escriba otra cédula o un nombre.`;

      await sock.sendMessage(from, { text: plantilla });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(from, { text: "❌ Ocurrió un error al procesar la consulta en el padrón." });
    }
    return;
  }