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
      
      // 🌟 AGREGAR ESTAS PROPIEDADES CLAVE PARA EVITAR EL TIMED OUT 🌟
      syncFullHistory: false,          // Evita descargar chats antiguos e historiales pesados
      shouldSyncHistoryMessage: () => false, // Bloquea por completo la sincronización de mensajes viejos
      markOnlineOnConnect: false,      // No fuerza el estado online de inmediato para aliviar la conexión
      emitOwnEvents: false,            // Evita procesar eventos generados por el mismo bot
      
      // Control de tiempo de espera para que no colapse la inicialización
      defaultQueryTimeoutMs: 60000,    // Eleva el tiempo de espera a 60 segundos antes de dar un Time Out
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
        // 🌟 CORRECCIÓN CRUCIAL: Añadido el [0] exactamente como tu código viejo
        const msg = messages[0]; 
        if (!msg?.message || msg.key.fromMe) return;

        const msgId = msg.key.id;
        if (processedMessages.has(msgId)) return;
        processedMessages.add(msgId);
        setTimeout(() => processedMessages.delete(msgId), 60000);

        const from = msg.key.remoteJid;
        if (from.endsWith("@g.us")) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
	

        // 🌟 TU LÓGICA ORIGINAL IMPLEMENTADA AL 100%
       let telefono = "";

		if (msg.key.remoteJidAlt) {
		telefono = msg.key.remoteJidAlt;
		} else if (msg.key.senderPn) {
		telefono = msg.key.senderPn;
		} else {
		telefono = msg.key.remoteJid;
		}

		telefono = telefono
		.replace("@s.whatsapp.net", "")
		.replace("@lid", "")
		.replace(/\D/g, "");

        const myNumber = sock.user?.id?.split(":")[0];
        if (telefono === myNumber) return;

        console.log("📩", telefono, "→", text);

        // INSERTAR EN BUZÓN DE ENTRADA
        await db.execute(
          `INSERT INTO buzonentrada (numero, texto, tipo, data) VALUES (?, ?, 'mensaje', ?)`,
          [telefono, text, JSON.stringify(msg)]
        );

        // ENVIAR AL ENRUTADOR DE COMANDOS MODULAR
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