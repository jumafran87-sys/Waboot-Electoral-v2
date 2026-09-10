import { db } from "../database/mysql.js";


// =====================================================
// OBTENER TABLA PADRON ACTIVA
// =====================================================

async function obtenerTablaPadron() {

    let nombreTablaPadron = "regciv2";


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
// CONSULTA PADRON POR CÉDULA
// =====================================================

export async function consultarPadron(cedula){

    try{

        const nombreTablaPadron =
            await obtenerTablaPadron();



	console.log(
"📌 TABLA USADA:",
nombreTablaPadron
)


        const query = `

SELECT

    r.CEDULA,
    r.NOMBRE,
    r.APELLIDO,

    r.FEC_NAC,
    r.EDAD,
    r.SEXO,

    r.MESA,
    r.ORDEN,

    r.DES_VOTO,
    r.ES_INDIGEN,

    r.PARTIDO,
    r.N_PARTIDO,
    r.SECCIONAL,

    r.VOTO1,
    r.VOTO2,
    r.VOTO3,
    r.VOTO4,
    r.VOTO5,

    r.DEPART,
    r.DISTRITO,
    r.ZONA,
    r.LOCAL,

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


console.log(
    "📋 CONSULTA REGCIV2:",
    cedula,
    rows.length > 0 ? rows[0] : "NO ENCONTRADO"
	
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



// BUSQUEDA SOBRE NOMBRE_COMPLETO

if(palabras.length > 0){

    const textoBusqueda =
        `%${palabras.join('%')}%`;


    query += `

AND r.NOMBRE_COMPLETO LIKE ?

`;

    params.push(textoBusqueda);

}


query += `

LIMIT 10

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
