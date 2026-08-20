import { db } from "../database/mysql.js";

import {
    guardarRechazo
} from "./rechazoService.js";


// =====================================================
// VALIDAR ZONA DEL CANDIDATO
// =====================================================

export async function validarZonaCandidato(
    telefono,
    ciudadano,
    candidato_id = null
) {

    let operador = null;


    // =================================================
    // SI NOS PASAN candidato_id
    // =================================================

    if (candidato_id) {

        const [[candidato]] = await db.execute(
            `
            SELECT
                id,
                nombre,
                apellido,
                ciudad,
                departamento,
                distrito
            FROM candidatos
            WHERE id = ?
            LIMIT 1
            `,
            [
                candidato_id
            ]
        );

        operador = candidato || null;

    }


    // =================================================
    // SI NO HAY candidato_id
    // BUSCARLO POR EL OPERADOR
    // =================================================

    else {

        const [[resultado]] = await db.execute(
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

        operador = resultado || null;

    }


    // =================================================
    // NO SE ENCONTRÓ CANDIDATO
    // =================================================

    if (!operador) {

        return {
            valido: false,
            motivo: "Candidato no encontrado"
        };

    }


    // =================================================
    // COMPARAR DISTRITO
    // =================================================

    if (
        Number(operador.distrito) !==
        Number(ciudadano.distrito)
    ) {

        console.log({
            cedula: ciudadano.cedula,
            operador: telefono,
            candidato_id: operador.id,
            distrito_persona: ciudadano.distrito,
            distrito_permitido: operador.distrito
        });


        console.log(
            "CANDIDATO:",
            operador
        );


        console.log(
            "CIUDADANO:",
            ciudadano
        );


        // =================================================
        // GUARDAR RECHAZO
        // =================================================

        await guardarRechazo({

            cedula:
                ciudadano.cedula,

            operador:
                telefono,

            candidato_id:
                operador.id,

            distrito_persona:
                ciudadano.distrito,

            distrito_permitido:
                operador.distrito

        });


        return {

            valido: false,

            candidato:
                operador,

            motivo:
                "Distrito diferente"

        };

    }


    // =================================================
    // TODO CORRECTO
    // =================================================

    return {

        valido: true,

        candidato:
            operador

    };

}