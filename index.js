import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import { connectDB, db } from "./database/mysql.js";
import { handleCommand } from "./commands/handler.js";

const userState = {};
const processedMessages = new Set();
let sock;
let isReconnecting = false;

async function startBot() {
  if (isReconnecting) return;
  isReconnecting = true;

  try {
    if (sock) {
      try { sock.ev.removeAllListeners(); } catch {}
    }

    const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      browser: ["Windows", "Chrome", "10"],
    });

    sock.ev.on("creds.update", saveCreds);

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
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
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

 sock.ev.on("messages.upsert", async ({ messages }) => {
      try {
        const msg = messages[0]; // Corrección: Tomamos el primer mensaje del array
        if (!msg?.message || msg.key.fromMe) return;

        const msgId = msg.key.id;
        if (processedMessages.has(msgId)) return;
        processedMessages.add(msgId);
        setTimeout(() => processedMessages.delete(msgId), 60000);

        const from = msg.key.remoteJid;
        if (from.endsWith("@g.us")) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        
        // 🌟 TRUCO EXCLUSIVO: Obligar a Baileys a buscar el número de teléfono real detrás del ID
        let telefono = from.split("@")[0]; // Por defecto toma lo que venga (ID o número)
        
        // Si viene un ID tipo LID o alternativo, intentamos extraer el número real desde los datos del mensaje
        if (msg.key.participant) {
          telefono = msg.key.participant.split("@")[0];
        } else if (msg.verifiedBizName || msg.key.remoteJid.includes("@lid")) {
          // Buscamos en el objeto del mensaje si Baileys guardó el número real mapeado
          const jidFormateado = msg.key.remoteJid;
          // Si el socket tiene guardado el contacto, extraemos el número real
          const formateado = sock.utils?.jidToPhoneNumber ? sock.utils.jidToPhoneNumber(jidFormateado) : null;
          if (formateado) {
            telefono = formateado;
          }
        }
        
        // Limpiamos cualquier rastro de caracteres no numéricos para que quede solo '5959...'
        telefono = telefono.replace(/\D/g, "");

        const myNumber = sock.user?.id?.split(":")[0];
        if (telefono === myNumber) return;

        console.log("📩 Número Real Detectado:", telefono, "→", text);

        // REGISTRO EN EL BUZÓN DE ENTRADA CON EL NÚMERO REAL
        await db.execute(
          `INSERT INTO buzonentrada (numero, texto, tipo, data) VALUES (?, ?, 'mensaje', ?)`,
          [telefono, text, JSON.stringify(msg)]
        );

        // ENVIAR AL ENRUTADOR DE COMANDOS MODULAR (Pasando el número real ya limpio)
        await handleCommand(sock, msg, from, text, telefono, userState);

      } catch (err) {
        console.error("❌ Error en evento de mensaje:", err);
      }
    });

  } catch (err) {
    console.error("❌ Error iniciando el bot:", err);
    isReconnecting = false;
  }
}

// Inicializar base de datos y arrancar bot
connectDB().then(() => {
  startBot();
});