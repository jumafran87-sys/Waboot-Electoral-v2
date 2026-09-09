import { db } from "../database/mysql.js";

// =====================================
// VALIDAR OPERADOR
// =====================================

export async function validarOperador(telefono){

    const [rows] = await db.execute(
        `
        SELECT
            id,
            telefono,
            nombre,
            activo,
            candidato_id
        FROM operadores
        WHERE telefono = ?
          AND activo = 1
        LIMIT 1
        `,
        [
            telefono
        ]
    );

    return rows.length > 0
        ? rows[0]
        : null;

}


// =====================================
// ALTA OPERADOR
// =====================================

export async function altaOperador(
    telefono,
    nombre
){

    const [existe] = await db.execute(
        `
        SELECT id
        FROM operadores
        WHERE telefono = ?
        LIMIT 1
        `,
        [
            telefono
        ]
    );


    if(existe.length > 0){

        throw new Error(
            "Operador ya existe"
        );

    }


    await db.execute(
        `
        INSERT INTO operadores
        (
            telefono,
            nombre,
            activo
        )
        VALUES (?, ?, 1)
        `,
        [
            telefono,
            nombre
        ]
    );


    return true;

}


// =====================================
// ASIGNAR CANDIDATO A OPERADOR
// =====================================

export async function asignarCandidatoOperador(
    telefono,
    candidato_id
){

    // verificar operador

    const [operador] = await db.execute(
        `
        SELECT telefono
        FROM operadores
        WHERE telefono = ?
        LIMIT 1
        `,
        [
            telefono
        ]
    );


    if(operador.length === 0){

        return {
            ok:false,
            mensaje:"Operador no existe"
        };

    }



    // verificar candidato

    const [candidato] = await db.execute(
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


    if(candidato.length === 0){

        return {
            ok:false,
            mensaje:"Candidato no existe"
        };

    }




    // actualizar operador

    await db.execute(
        `
        UPDATE operadores
        SET candidato_id = ?
        WHERE telefono = ?
        `,
        [
            candidato_id,
            telefono
        ]
    );



    return {
        ok:true,
        candidato:candidato[0]
    };

}

// =====================================
// OBTENER OPERADOR POR NÚMERO DE LISTADO
// =====================================
//
// El número corresponde a la posición
// que aparece en "LISTADO DE OPERADORES".
//
// Ejemplo:
//
// 1️⃣ ---582
// 2️⃣ .--331
//
// listar pdf 1
// → obtiene el operador de la posición 1
//
// =====================================

export async function obtenerOperadorPorNumero(numero) {

    const numeroInt = Number(numero);

    if (
        !Number.isInteger(numeroInt) ||
        numeroInt < 1
    ) {
        return null;
    }

    const [rows] = await db.execute(
        `
        SELECT
            o.id,
            o.telefono,
            o.nombre,
            o.activo,
            o.candidato_id
        FROM operadores o
        ORDER BY o.nombre ASC
        LIMIT 1 OFFSET ?
        `,
        [
            numeroInt - 1
        ]
    );

    return rows.length > 0
        ? rows[0]
        : null;
}