import { db } from "../database/mysql.js";


// =====================================================
// REPORTE GENERAL ADMIN
// =====================================================

export async function obtenerReporteGeneral() {

    const [[reporte]] = await db.execute(
        `
        SELECT

            COUNT(*) AS total,

            COALESCE(
                SUM(
                    CASE
                        WHEN voto = 'S' THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS votos,

            COALESCE(
                SUM(
                    CASE
                        WHEN celunew IS NOT NULL
                        AND celunew <> ''
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS celulares,

            COALESCE(
                SUM(
                    CASE
                        WHEN ubi IS NOT NULL
                        AND ubi <> ''
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS ubicaciones,

            COALESCE(
                SUM(
                    CASE
                        WHEN observacion IS NOT NULL
                        AND observacion <> ''
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS observaciones

        FROM asignaciones
        `
    );

    return reporte || {
        total: 0,
        votos: 0,
        celulares: 0,
        ubicaciones: 0,
        observaciones: 0
    };
}



// =====================================================
// REPORTE CANDIDATO
// =====================================================

export async function obtenerReporteCandidato(
    candidato_id
) {

    const [[reporte]] = await db.execute(
        `
        SELECT

            COUNT(*) AS total,

            COALESCE(
                SUM(
                    CASE
                        WHEN a.voto = 'S' THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS votos,

            COALESCE(
                SUM(
                    CASE
                        WHEN a.celunew IS NOT NULL
                        AND a.celunew <> ''
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS celulares,

            COALESCE(
                SUM(
                    CASE
                        WHEN a.ubi IS NOT NULL
                        AND a.ubi <> ''
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS ubicaciones,

            COALESCE(
                SUM(
                    CASE
                        WHEN a.observacion IS NOT NULL
                        AND a.observacion <> ''
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS observaciones

        FROM asignaciones a

        WHERE a.candidato_id = ?
        `,
        [
            candidato_id
        ]
    );

    return reporte || {
        total: 0,
        votos: 0,
        celulares: 0,
        ubicaciones: 0,
        observaciones: 0
    };
}



// =====================================================
// REPORTE OPERADOR
// =====================================================

export async function obtenerReporteOperador(
    telefono
) {

    const [[reporte]] = await db.execute(
        `
        SELECT

            COUNT(*) AS total,

            COALESCE(
                SUM(
                    CASE
                        WHEN voto = 'S' THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS votos

        FROM asignaciones

        WHERE operador_telefono = ?
        `,
        [
            telefono
        ]
    );

    return reporte || {
        total: 0,
        votos: 0
    };
}



// =====================================================
// LISTAR ASIGNACIONES
//
// telefono:
//   Si viene informado → solamente ese operador.
//
// filtro:
//   voto
//   pendientes
//
// candidato_id:
//   Si viene informado → solamente ese candidato.
//
// Además devuelve:
//
//   - datos de la asignación
//   - datos del operador
//   - datos del candidato
//   - datos del intendente
//   - datos del padrón general
//   - seccional
//   - partido
//   - número de partido
//   - voto de la interna pasada
//
// =====================================================

export async function obtenerListadoAsignaciones(
    telefono = null,
    filtro = null,
    candidato_id = null
) {

    let query = `

        SELECT

            -- =========================================
            -- ASIGNACIÓN
            -- =========================================

            a.id,

            a.operador_telefono,

            o.nombre AS operador_nombre,

            a.candidato_id,

            a.cedula,

            a.nombre,

            a.apellido,

            a.local,

            a.mesa,

            a.orden,

            a.celular,

            a.celunew,

            a.ubi,

            a.observacion,

            a.voto,

            a.fechahora,


            -- =========================================
            -- PADRÓN GENERAL
            -- =========================================

            p.SECCIONAL AS seccional,

            p.PARTIDO AS partido,

            p.N_PARTIDO AS n_partido,

            p.VOTO5 AS voto5,


            -- =========================================
            -- CANDIDATO
            -- =========================================

            c.id AS candidato_id_real,

            c.nombre AS candidato_nombre,

            c.apellido AS candidato_apellido,

            c.cargo AS candidato_cargo,

            c.ciudad AS candidato_ciudad,

            c.departamento AS candidato_departamento,

            c.distrito AS candidato_distrito,

            c.lista_numero AS candidato_lista_numero,

            c.lista_nombre AS candidato_lista_nombre,

            c.opcion AS candidato_opcion,

            c.intendente_id,


            -- =========================================
            -- INTENDENTE
            -- =========================================

            i.id AS intendente_id_real,

            i.nombre AS intendente_nombre,

            i.apellido AS intendente_apellido,

            i.cargo AS intendente_cargo,

            i.ciudad AS intendente_ciudad,

            i.departamento AS intendente_departamento,

            i.distrito AS intendente_distrito,

            i.lista_numero AS intendente_lista_numero,

            i.lista_nombre AS intendente_lista_nombre


        FROM asignaciones a


        -- =========================================
        -- OPERADOR
        -- =========================================

        LEFT JOIN operadores o

            ON o.telefono =
               a.operador_telefono


        -- =========================================
        -- PADRÓN GENERAL
        --
        -- Se cruza por CÉDULA.
        --
        -- Si no existe en regciv2,
        -- la asignación igualmente aparece.
        -- =========================================

        LEFT JOIN padron_gral.regciv2 p

            ON p.CEDULA = a.cedula


        -- =========================================
        -- CANDIDATO
        -- =========================================

        LEFT JOIN candidatos c

            ON c.id =
               a.candidato_id


        -- =========================================
        -- INTENDENTE
        --
        -- Si candidato = INTENDENTE
        --
        --     c.id
        --
        -- Si candidato = CONCEJAL
        --
        --     c.intendente_id
        -- =========================================

        LEFT JOIN candidatos i

            ON i.id =

                CASE

                    WHEN UPPER(
                        TRIM(
                            COALESCE(
                                c.cargo,
                                ''
                            )
                        )
                    ) = 'INTENDENTE'

                    THEN c.id

                    ELSE c.intendente_id

                END


        WHERE 1 = 1

    `;


    const params = [];


    // =================================================
    // FILTRO OPERADOR
    // =================================================

    if (telefono) {

        query += `

            AND a.operador_telefono = ?

        `;

        params.push(
            telefono
        );
    }


    // =================================================
    // FILTRO CANDIDATO
    // =================================================

    if (candidato_id) {

        query += `

            AND a.candidato_id = ?

        `;

        params.push(
            candidato_id
        );
    }


    // =================================================
    // FILTRO VOTO
    // =================================================

    if (filtro === "voto") {

        query += `

            AND a.voto = 'S'

        `;
    }


    // =================================================
    // FILTRO PENDIENTES
    // =================================================

    if (filtro === "pendientes") {

        query += `

            AND (
                a.voto IS NULL
                OR a.voto <> 'S'
            )

        `;
    }


    // =================================================
    // ORDEN
    // =================================================

    query += `

        ORDER BY
            a.fechahora DESC

    `;


    // =================================================
    // EJECUTAR
    // =================================================

    const [rows] =
        await db.execute(
            query,
            params
        );


    return rows;
}



// =====================================================
// LISTAR OPERADORES
//
// Este reporte muestra todos los operadores.
//
// No mezcla las asignaciones por error.
//
// =====================================================

export async function obtenerReporteOperadores() {

    const [rows] = await db.execute(
        `
        SELECT

            o.telefono,

            o.nombre,

            o.activo,

            o.candidato_id,

            COUNT(a.id) AS total,

            COALESCE(
                SUM(
                    CASE
                        WHEN a.voto = 'S'
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS votos

        FROM operadores o

        LEFT JOIN asignaciones a
            ON a.operador_telefono = o.telefono

        GROUP BY

            o.id,
            o.telefono,
            o.nombre,
            o.activo,
            o.candidato_id

        ORDER BY
            o.nombre ASC
        `
    );


    return rows;
}



/// =====================================================
// OPERADORES DE UN CANDIDATO
//
// Devuelve:
// nombre operador
// teléfono
// últimos 3 dígitos
// cantidad de asignaciones
// cantidad de votos
//
// Si el teléfono corresponde al candidato que está
// consultando, se identifica como CARGA DIRECTA.
// =====================================================

export async function obtenerOperadoresCandidato(
    candidato_id,
    telefonoCandidato = null
) {

    let query = `
        SELECT

            a.operador_telefono,

            CASE
                WHEN ? IS NOT NULL
                AND a.operador_telefono = ?
                THEN 'CARGA DIRECTA'
                ELSE COALESCE(
                    o.nombre,
                    'SIN NOMBRE'
                )
            END AS operador_nombre,

            COUNT(DISTINCT a.cedula) AS total,

            COALESCE(
                SUM(
                    CASE
                        WHEN a.voto = 'S'
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS votos

        FROM asignaciones a

        LEFT JOIN operadores o
            ON o.telefono = a.operador_telefono

        WHERE a.candidato_id = ?

        GROUP BY
            a.operador_telefono,
            o.nombre

        ORDER BY
            total DESC
    `;


    const [rows] = await db.execute(
        query,
        [
            telefonoCandidato,
            telefonoCandidato,
            candidato_id
        ]
    );


    return rows;
}



// =====================================================
// BUSCAR CANDIDATO
// =====================================================

export async function buscarCandidato(
    texto
) {

    const [rows] = await db.execute(
        `
        SELECT

            id,

            nombre,

            apellido,

            cargo,

            ciudad

        FROM candidatos

        WHERE

            UPPER(nombre) LIKE UPPER(?)

            OR UPPER(apellido) LIKE UPPER(?)

            OR UPPER(ciudad) LIKE UPPER(?)

            OR UPPER(
                CONCAT(
                    nombre,
                    ' ',
                    apellido
                )
            ) LIKE UPPER(?)

        ORDER BY

            nombre,

            apellido

        LIMIT 10
        `,

        [
            `%${texto}%`,
            `%${texto}%`,
            `%${texto}%`,
            `%${texto}%`
        ]
    );


    return rows;
}