import { db } from "../database/mysql.js";

import {
    actualizarCelular,
    actualizarUbicacion,
    actualizarObservacion
} from "../services/asignacionService.js";

export async function manejarActualizaciones(
    sock,
    msg,
    from,
    cleanText,
    telefono,
    userState
) {

// ================== PREGUNTAR ACTUALIZAR ==================

if (userState[from]?.action === "preguntar_actualizar") {

    const respuesta = cleanText.toUpperCase();

    if (respuesta === "S") {

        userState[from].action = "menu_actualizar";

        await sock.sendMessage(from,{
            text:
`🛠 ACTUALIZAR DATOS

A) 📲 Celular
B) 📍 Ubicación
C) 📝 Observación
D) ❌ Salir

Respondé A, B, C o D`
        });

        return true;
    }


    if (respuesta === "N") {

        delete userState[from];

        await sock.sendMessage(from,{
            text:
            "✅ Listo.\n\nPuede consultar otra cédula."
        });

        return true;
    }


    await sock.sendMessage(from,{
        text:
        "✍️ Respondé S para actualizar o N para salir."
    });

    return true;
}

// ================== MENU ACTUALIZAR ==================

if (userState[from]?.action === "menu_actualizar") {

    const respuesta = cleanText.toUpperCase();

    const cedula = userState[from].cedula;


    if (respuesta === "A") {

        userState[from]={
            action:"actualizar_celular",
            cedula
        };


        await sock.sendMessage(from,{
            text:
            "📲 Enviá el nuevo número de celular."
        });

        return true;
    }


    if (respuesta === "B") {

        userState[from]={
            action:"actualizar_ubicacion",
            cedula
        };


        await sock.sendMessage(from,{
            text:
            "📍 Enviá ubicación GPS o link Google Maps."
        });

        return true;
    }


    if (respuesta === "C") {

    userState[from] = {
        action:"actualizar_observacion",
        cedula
    };

    await sock.sendMessage(from,{
        text:
        "📝 Enviá la observación que deseas guardar."
    });

    return true;
}


    if (respuesta === "D") {

        delete userState[from];

        await sock.sendMessage(from,{
            text:
            "✅ Saliste del menú.\nPuede consultar otra cédula."
        });

        return true;
    }


    await sock.sendMessage(from,{
        text:
        "✍️ Opción inválida. Elegí A, B, C o D."
    });

    return true;
}


// ================== ACTUALIZAR CELULAR ==================

if (userState[from]?.action === "actualizar_celular") {

    const cedula = userState[from].cedula;

    const nuevoCel = cleanText.replace(/\D/g, "");

    if (!/^\d{8,13}$/.test(nuevoCel)) {

        await sock.sendMessage(from,{
            text:"❌ Número inválido."
        });

        return true;
    }

    
    await actualizarCelular(
    telefono,
    cedula,
    nuevoCel
	);

    userState[from] = {
        action:"preguntar_actualizar",
        cedula
    };

await sock.sendMessage(from,{
    text:
`✅ Celular actualizado:

${nuevoCel}

¿Desea actualizar algo más?

S = Sí
N = No`
});

return true;

}

// ================== ACTUALIZAR UBICACIÓN ==================

if (userState[from]?.action === "actualizar_ubicacion") {
	
	
	console.log(
	"MENSAJE COMPLETO UBICACION:",
	JSON.stringify(msg.message, null, 2)
	);
	

    const cedula = userState[from].cedula;

    let ubicacion = null;

    // ================== UBICACIÓN GPS WHATSAPP ==================

    let locationMsg = null;


// ubicación normal
if (msg.message?.locationMessage) {

    locationMsg = msg.message.locationMessage;

}


// ubicación dentro de mensaje efímero
else if (
    msg.message?.ephemeralMessage?.message?.locationMessage
) {

    locationMsg =
        msg.message.ephemeralMessage.message.locationMessage;

}


// ubicación dentro de viewOnce
else if (
    msg.message?.viewOnceMessage?.message?.locationMessage
) {

    locationMsg =
        msg.message.viewOnceMessage.message.locationMessage;

}


if (locationMsg) {

    ubicacion =
        `${locationMsg.degreesLatitude},${locationMsg.degreesLongitude}`;

} 
    
    // ================== GOOGLE MAPS ==================

    else {

        const texto = decodeURIComponent(cleanText);

        console.log("📍 Texto ubicación recibido:", texto);


        const urlMatch =
            texto.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
            texto.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);


        if (urlMatch) {

            ubicacion =
                `${urlMatch[1]},${urlMatch[2]}`;

        } 
        
        else {

            ubicacion = cleanText.trim();

        }
    }


    if (!ubicacion || ubicacion.length < 3) {

        await sock.sendMessage(from,{
            text:"❌ No se pudo detectar la ubicación."
        });

        return true;
    }


    console.log("📍 Guardando ubicación:", ubicacion);
    console.log("📍 Cedula:", cedula);
    console.log("📍 Operador:", telefono);


    await actualizarUbicacion(
    telefono,
    cedula,
    ubicacion
	);


    userState[from] = {
        action:"preguntar_actualizar",
        cedula
    };


    await sock.sendMessage(from,{
        text:
`✅ Ubicación registrada.

📍 https://maps.google.com/?q=${ubicacion}

¿Desea actualizar algo más?

*S* = Sí
*N* = No`
    });


    return true;
}

// ================== ACTUALIZAR OBSERVACIÓN ==================

if (userState[from]?.action === "actualizar_observacion") {

    const cedula = userState[from].cedula;

    const observacion = cleanText.trim();


    if (!observacion) {

        await sock.sendMessage(from,{
            text:"❌ Observación vacía."
        });

        return true;
    }


    console.log("📝 Guardando observación:", observacion);
    console.log("🆔 Cedula:", cedula);


    const resultado = await actualizarObservacion(
    telefono,
    cedula,
    observacion
	);


	console.log(
    "Filas actualizadas:",
    resultado.affectedRows
	);


    userState[from] = {
        action:"preguntar_actualizar",
        cedula
    };


    await sock.sendMessage(from,{
        text:
`📝 Observación guardada correctamente.

"${observacion}"

¿Desea actualizar algo más?

*S* = Sí
*N* = No`
    });


    return true;
}

return false;

}