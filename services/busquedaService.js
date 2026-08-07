import { db } from "../database/mysql.js";


// =====================================================
// BUSQUEDA FULLTEXT POR NOMBRE
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
        // ejemplo:
        // +JUAN +MARCELO +FRANCO
        // ---------------------------------------------

        const criterioBusqueda = palabras
            .map(p => `+${p}`)
            .join(" ");



        let query = `

SELECT

    CEDULA,

    NOMBRE,

    APELLIDO,

    DEPART,

    DISTRITO,

    DEPARTAMENTO,

    DISTRITO_NOMBRE,

    ZONA,

    LOCAL

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
AND
MATCH(BUSQUEDA)
AGAINST(? IN BOOLEAN MODE)

LIMIT 5
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



        return rows;

    } catch (error) {

        console.error(
            "❌ Error búsqueda FULLTEXT:",
            error
        );

        throw error;

    }

}