import {
    altaCandidato,
    listarCandidatos,
    obtenerCandidato
} from "../services/candidatoService.js";

const ADMIN = "595985761431";

export async function manejarCandidatos(
    sock,
    from,
    cleanText,
    cleanLower,
    telefono
){
	
	// ======================================
// ALTA CANDIDATO
// ======================================

if(cleanLower.startsWith("altacandidato")){

    if(telefono !== ADMIN){

        await sock.sendMessage(from,{
            text:"⛔ No autorizado."
        });

        return true;
    }

    const texto = cleanText.substring(14).trim();

    const partes = texto.split(";");

    if(partes.length !== 6){

        await sock.sendMessage(from,{
            text:
`❌ Formato incorrecto.

Usar:

altacandidato Nombre;Apellido;Cargo;Ciudad;Departamento;Distrito`
        });

        return true;
    }

    const [

        nombre,
        apellido,
        cargo,
        ciudad,
        departamento,
        distrito

    ] = partes.map(x=>x.trim());

    const ok = await altaCandidato({

        nombre,
        apellido,
        cargo,
        ciudad,
        departamento:Number(departamento),
        distrito:Number(distrito)

    });

    if(!ok){

        await sock.sendMessage(from,{
            text:"⚠️ Ese candidato ya existe."
        });

        return true;

    }

    await sock.sendMessage(from,{
        text:
`✅ Candidato registrado.

👤 ${nombre} ${apellido}

🏛 ${cargo}

🏙 ${ciudad}`
    });

    return true;

}