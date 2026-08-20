import { db } from "../database/mysql.js";


// =====================================================
// BUSQUEDA FULLTEXT POR NOMBRE
// UNA SOLA PERSONA POR C.I.
// =====================================================

export async function buscarPorNombre(
    nombreCompleto,
    departamento = null,
    distrito = null
) {

    try {

        // ---------------------------------------------
        // Normalizar texto recibido
        // ---------------------------------------------

        const palabras = nombreCompleto
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase()
            .split(/\s+/)
            .filter(p => p.length > 1);


        if (palabras.length === 0) {
            return [];
        }


        // ---------------------------------------------
        // Construir búsqueda FULLTEXT
        // ---------------------------------------------

        const criterioBusqueda = palabras
            .map(p => `+${p}`)
            .join(" ");


        // ---------------------------------------------
        // CONSULTA
        // ---------------------------------------------

        let query = `

SELECT

    CEDULA,

    MAX(NOMBRE) AS NOMBRE,

    MAX(APELLIDO) AS APELLIDO,

    MAX(DEPART) AS DEPART,

    MAX(DISTRITO) AS DISTRITO,

    MAX(DEPARTAMENTO) AS DEPARTAMENTO,

    MAX(DISTRITO_NOMBRE) AS DISTRITO_NOMBRE,

    MAX(ZONA) AS ZONA,

    MAX(LOCAL) AS LOCAL

FROM regciv_busqueda

WHERE 1=1

`;


        const params = [];


        // ---------------------------------------------
        // FILTRO POR DEPARTAMENTO
        // ---------------------------------------------

        if (departamento !== null) {

            query += `
AND DEPART = ?
`;

            params.push(departamento);

        }


        // ---------------------------------------------
        // FILTRO POR DISTRITO
        // ---------------------------------------------

        if (distrito !== null) {

            query += `
AND DISTRITO = ?
`;

            params.push(distrito);

        }


        // ---------------------------------------------
        // FULLTEXT
        // ---------------------------------------------

        query += `
AND MATCH(BUSQUEDA)
AGAINST(? IN BOOLEAN MODE)

GROUP BY CEDULA

ORDER BY CEDULA

LIMIT 10
`;


        params.push(criterioBusqueda);


        console.log("🔎 BUSQUEDA FULLTEXT");
        console.log(query);
        console.log(params);


        const inicio = Date.now();


        const [rows] = await db.execute(
            query,
            params
        );


        console.log(
            `⚡ FULLTEXT: ${Date.now() - inicio} ms`
        );


        console.log(
            `👥 PERSONAS ENCONTRADAS: ${rows.length}`
        );


        return rows;


    } catch (error) {

        console.error(
            "❌ Error búsqueda FULLTEXT:",
            error
        );

        throw error;

    }

}