import { db } from "../database/mysql.js";
import {
    guardarRechazo
} from "./rechazoService.js";

export async function validarZonaCandidato(
    telefono,
    ciudadano
){

    const [[operador]] = await db.execute(
        `
        SELECT 
            c.id,
            c.nombre,
            c.apellido,
            c.ciudad,
            c.departamento,
            c.distrito
        FROM operadores o
        INNER JOIN candidatos c
            ON c.id = o.candidato_id
        WHERE o.telefono = ?
        LIMIT 1
        `,
        [
            telefono
        ]
    );


    if(!operador){

        return {
            valido:false,
            motivo:"Operador sin candidato asignado"
        };

    }


    // compara distrito

    if(
    Number(operador.distrito) !==
    Number(ciudadano.distrito)
){


console.log({
    cedula: ciudadano.cedula,
    operador: telefono,
    candidato_id: operador.id,
    distrito_persona: ciudadano.distrito,
    distrito_permitido: operador.distrito
});

console.log("CIUDADANO:", ciudadano);
console.log("OPERADOR:", operador);



    await guardarRechazo({

        cedula: ciudadano.cedula,

        operador: telefono,

        candidato_id: operador.id,

        distrito_persona: ciudadano.distrito,

        distrito_permitido: operador.distrito

    });


    return {
        valido:false,
        candidato:operador,
        motivo:"Distrito diferente"
    };

}


    return {
        valido:true,
        candidato:operador
    };

}