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
        const msg = messages[0]; // Tomamos el primer mensaje del array
        if (!msg?.message || msg.key.fromMe) return;

        const msgId = msg.key.id;
        if (processedMessages.has(msgId)) return;
        processedMessages.add(msgId);
        setTimeout(() => processedMessages.delete(msgId), 60000);

        const from = msg.key.remoteJid;
        if (from.endsWith("@g.us")) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // 🌟 EXTRACTOR MEJORADO: Tu lógica original + captura de participant_pn para cuentas LID
        let telefonoRaw = 
          msg.key.remoteJidAlt?.replace("@s.whatsapp.net", "") || 
          from.replace("@s.whatsapp.net", "").replace("@lid", "");

        // Si viene de una cuenta LID (como el log de Ismael), buscamos el número real en los atributos
        if (from.includes("@lid") || msg.message?.extendedTextMessage?.contextInfo?.participant?.includes("@lid")) {
          // Si Baileys mapea el número real en las propiedades del mensaje, lo usamos
          const pnAlternativo = msg.msgAttrs?.participant_pn || msg.participant_pn;
          if (pnAlternativo) {
            telefonoRaw = pnAlternativo.replace("@s.whatsapp.net", "");
          }
        }

        // Limpiamos cualquier rastro que no sea número para que quede puro (ej: 595985761431)
        const telefono = telefonoRaw.replace(/\D/g, "");

        const myNumber = sock.user?.id?.split(":")[0];
        if (telefono === myNumber) return;

        console.log("📩 Número Real Detectado:", telefono, "→", text);

        // REGISTRO EN EL BUZÓN DE ENTRADA
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