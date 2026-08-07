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



// =====================================================
// ENVIO SEGURO WHATSAPP
// =====================================================

async function sendMessageSafe(jid, content) {

    try {

        if (!sock || !sock.user) {

            console.log(
                "⚠️ Intento de envío sin conexión WhatsApp"
            );

            return false;
        }


        await sock.sendMessage(
            jid,
            content
        );


        return true;


    } catch(error){

        console.error(
            "❌ Error enviando mensaje:",
            error.message
        );


        return false;

    }

}



// =====================================================
// INICIO BOT
// =====================================================

async function startBot() {


    if (isReconnecting) return;

    isReconnecting = true;



    try {


        if (sock) {

            try {

                sock.ev.removeAllListeners();

            } catch {}

        }



        const { state, saveCreds } =
            await useMultiFileAuthState("./auth_info");



        const { version } =
            await fetchLatestBaileysVersion();



        sock = makeWASocket({

            version,

            auth: state,

            browser:[
                "Windows",
                "Chrome",
                "10"
            ],


            syncFullHistory:false,

            shouldSyncHistoryMessage:()=>false,

            markOnlineOnConnect:false,

            emitOwnEvents:false,


            defaultQueryTimeoutMs:60000

        });




        sock.ev.on(
            "creds.update",
            saveCreds
        );





        // =====================================================
        // CONEXION WHATSAPP
        // =====================================================


        sock.ev.on(
        "connection.update",
        (update)=>{


            const {
                connection,
                lastDisconnect,
                qr
            } = update;



            if(qr){

                console.log(
                    "📲 Escaneá el QR:"
                );

                qrcode.generate(
                    qr,
                    {
                        small:true
                    }
                );

            }




            if(connection==="open"){

                console.log(
                    "✅ WhatsApp conectado correctamente"
                );

                isReconnecting=false;

            }





            if(connection==="close"){


                const statusCode =
                lastDisconnect?.error?.output?.statusCode;



                console.log(
                    "⚠️ Conexión cerrada:",
                    statusCode
                );



              const shouldReconnect =
			statusCode !== DisconnectReason.loggedOut &&
			statusCode !== 440;


			if(statusCode === 440){

			console.log(
				"⚠️ Sesión reemplazada. No reconectar automáticamente."
				);

			return;
				}

                if(shouldReconnect){


                    setTimeout(()=>{


                        isReconnecting=false;

                        startBot();


                    },5000);



                }else{


                    console.log(
                        "❌ Sesión cerrada. Borra auth_info."
                    );


                }


            }



        });







        // =====================================================
        // MENSAJES ENTRANTES
        // =====================================================


        sock.ev.on(
        "messages.upsert",
        async ({messages})=>{


            if(!sock?.user){

                console.log(
                    "⚠️ Mensaje recibido sin conexión activa"
                );

                return;

            }



            try {


                const msg = messages[0];



                if(!msg?.message || msg.key.fromMe)
                    return;



                const msgId = msg.key.id;



                if(processedMessages.has(msgId))
                    return;



                processedMessages.add(msgId);



                setTimeout(
                    ()=>{
                        processedMessages.delete(msgId);
                    },
                    60000
                );





                const from =
                    msg.key.remoteJid;



                if(from.endsWith("@g.us"))
                    return;





                const text =

                msg.message.conversation ||

                msg.message.extendedTextMessage?.text ||

                "";






                const tieneUbicacion =

                msg.message.locationMessage ||

                msg.message?.ephemeralMessage?.message?.locationMessage ||

                msg.message?.viewOnceMessage?.message?.locationMessage ||

                msg.message?.viewOnceMessageV2?.message?.locationMessage;






                if(!text.trim() && !tieneUbicacion)
                    return;







                let telefono="";



                if(msg.key.remoteJidAlt){

                    telefono =
                    msg.key.remoteJidAlt;


                }else if(msg.key.senderPn){


                    telefono =
                    msg.key.senderPn;


                }else{


                    telefono =
                    msg.key.remoteJid;

                }





                telefono =
                telefono
                .replace("@s.whatsapp.net","")
                .replace("@lid","")
                .replace(/\D/g,"");







                const myNumber =
                sock.user?.id?.split(":")[0];



                if(telefono===myNumber)
                    return;







                console.log(
                    "📩",
                    telefono,
                    "→",
                    text.trim() || "📍 UBICACION"
                );








                await db.execute(

                `
                INSERT INTO buzonentrada
                (
                    numero,
                    texto,
                    tipo,
                    data
                )
                VALUES
                (
                    ?,
                    ?,
                    'mensaje',
                    ?
                )
                `,

                [
                    telefono,
                    text,
                    JSON.stringify(msg)
                ]

                );







                await handleCommand(

                    sock,
                    msg,
                    from,
                    text,
                    telefono,
                    userState,
                    myNumber

                );







            }catch(err){


                console.error(
                    "❌ Error en evento de mensaje:",
                    err
                );


            }



        });





    }catch(err){


        console.error(
            "❌ Error iniciando el bot:",
            err
        );


        isReconnecting=false;


    }



}





// =====================================================
// ARRANQUE
// =====================================================

connectDB()
.then(()=>{

    startBot();

});