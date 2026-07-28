import { db } from "../database/mysql.js";


// =====================================================
// OBTENER TABLA PADRON ACTIVA
// =====================================================

async function obtenerTablaPadron() {

    let nombreTablaPadron = "regciv";


    try {


        const [config] = await db.execute(
            `
            SELECT tabla_padron
            FROM config_eleccion
            WHERE estado = 1
            LIMIT 1
            `
        );


        if(config.length > 0){

            nombreTablaPadron =
                config[0].tabla_padron;

        }


    } catch(err){


        console.log(
            "⚠️ Sin tabla config_eleccion, usando:",
            nombreTablaPadron
        );


    }


    return nombreTablaPadron;

}




// =====================================================
// CONSULTA POR CÉDULA
// =====================================================

export async function consultarPadron(cedula){


    try{


        const nombreTablaPadron =
            await obtenerTablaPadron();



        const query = `

        SELECT

        r.CEDULA,
        r.NOMBRE,
        r.APELLIDO,
        r.FEC_NAC,
        r.SEXO,

        r.DEPART,
        r.DISTRITO,
        r.ZONA,

        d.DESCRIP AS departamento,

        di.DESCRIP AS distrito,

        l.DESCRIP AS local


        FROM ${nombreTablaPadron} r


        LEFT JOIN dep d
        ON d.DEPART = r.DEPART


        LEFT JOIN dis di
        ON di.DEPART = r.DEPART
        AND di.DISTRITO = r.DISTRITO


        LEFT JOIN loc l
        ON l.DPTO = r.DEPART
        AND l.DISTRITO = r.DISTRITO
        AND l.ZONA = r.ZONA
        AND l.LOCAL = r.LOCAL


        WHERE r.CEDULA = ?


        LIMIT 1

        `;



        const [rows] =
            await db.execute(
                query,
                [cedula]
            );



        return rows.length > 0
            ? rows[0]
            : null;



    }catch(error){


        console.error(
            "❌ Error consultar padrón:",
            error
        );


        throw error;

    }


}





// =====================================================
// BUSQUEDA OPTIMIZADA POR NOMBRE
// =====================================================

export async function buscarPorNombre(
    nombreCompleto,
    departamento = null,
    distrito = null
){

    try{

        const tabla = await obtenerTablaPadron();


        const palabras =
            nombreCompleto
            .trim()
            .toUpperCase()
            .split(/\s+/)
            .filter(p => p.length > 1);



        let query = `

SELECT

    r.CEDULA,
    r.NOMBRE,
    r.APELLIDO,

    r.DEPART,
    r.DISTRITO,
    r.ZONA,

    d.DESCRIP AS departamento,
    di.DESCRIP AS distrito


FROM ${tabla} r


LEFT JOIN dep d
ON d.DEPART = r.DEPART


LEFT JOIN dis di
ON di.DEPART = r.DEPART
AND di.DISTRITO = r.DISTRITO


WHERE 1=1

`;



        const params=[];



        // FILTRO OPERADOR

        if(departamento !== null){

            query += `
AND r.DEPART = ?
`;

            params.push(departamento);

        }


        if(distrito !== null){

            query += `
AND r.DISTRITO = ?
`;

            params.push(distrito);

        }



        // BUSCAR CADA PALABRA

        for(const palabra of palabras){


            query += `

AND
(
    r.NOMBRE LIKE ?
    OR
    r.APELLIDO LIKE ?
)

`;

            params.push(`%${palabra}%`);
            params.push(`%${palabra}%`);

        }



        query += `

ORDER BY
r.APELLIDO,
r.NOMBRE

LIMIT 5

`;



        console.log("🔎 BUSQUEDA:");
        console.log(query);
        console.log(params);



        const [rows] =
            await db.execute(
                query,
                params
            );


        return rows;



    }catch(error){


        console.error(
            "❌ Error búsqueda nombre:",
            error
        );


        throw error;

    }

}
