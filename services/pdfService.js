import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import os from "os";


// =====================================================
// FORMATEAR FECHA
// =====================================================

function formatearFecha(fecha = new Date()) {

    const d = new Date(fecha);

    const dia =
        String(d.getDate()).padStart(2, "0");

    const mes =
        String(d.getMonth() + 1).padStart(2, "0");

    const anio =
        d.getFullYear();

    return `${dia}/${mes}/${anio}`;
}


// =====================================================
// LIMPIAR TEXTO
// =====================================================

function texto(valor, defecto = "-") {

    if (
        valor === null ||
        valor === undefined ||
        String(valor).trim() === ""
    ) {
        return defecto;
    }

    return String(valor).trim();
}


// =====================================================
// NOMBRE DEL ARCHIVO
// =====================================================

function limpiarNombreArchivo(valor) {

    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
}


// =====================================================
// NORMALIZAR VOTO
// =====================================================

function normalizarVoto(valor) {

    if (
        valor === null ||
        valor === undefined
    ) {
        return "-";
    }

    const v =
        String(valor)
            .trim()
            .toUpperCase();

    if (v === "S") {
        return "S";
    }

    if (v === "N") {
        return "N";
    }

    return "-";
}


// =====================================================
// GENERAR PDF DE ASIGNACIONES
// =====================================================

export async function generarPdfAsignaciones(
    rows = []
) {

    if (
        !Array.isArray(rows) ||
        rows.length === 0
    ) {

        throw new Error(
            "No existen registros para generar el PDF."
        );
    }


    // =================================================
    // DATOS PRINCIPALES
    // =================================================

    const primero = rows[0];


    // =================================================
    // CANDIDATO
    // =================================================

    const candidatoNombre =
        texto(
            primero.candidato_nombre,
            ""
        );

    const candidatoApellido =
        texto(
            primero.candidato_apellido,
            ""
        );

    const candidatoCompleto =
        `${candidatoNombre} ${candidatoApellido}`
            .trim();


    const candidatoCargo =
        texto(
            primero.candidato_cargo,
            ""
        ).toUpperCase();


    const candidatoLista =
        texto(
            primero.candidato_lista_numero,
            ""
        );


    const candidatoListaNombre =
        texto(
            primero.candidato_lista_nombre,
            ""
        );


    const candidatoOpcion =
        texto(
            primero.candidato_opcion,
            ""
        );


    // =================================================
    // INTENDENTE
    // =================================================

    let intendenteNombre =
        texto(
            primero.intendente_nombre,
            ""
        );

    let intendenteApellido =
        texto(
            primero.intendente_apellido,
            ""
        );

    let intendenteCompleto =
        `${intendenteNombre} ${intendenteApellido}`
            .trim();


    let intendenteCiudad =
        texto(
            primero.intendente_ciudad,
            ""
        );


    let intendenteLista =
        texto(
            primero.intendente_lista_numero,
            ""
        );


    // =================================================
    // SI EL CANDIDATO ES INTENDENTE
    // =================================================

    if (
        candidatoCargo === "INTENDENTE"
    ) {

        intendenteCompleto =
            candidatoCompleto;

        intendenteCiudad =
            texto(
                primero.candidato_ciudad,
                ""
            );

        intendenteLista =
            candidatoLista;
    }


    // =================================================
    // CIUDAD
    // =================================================

    const ciudad =
        intendenteCiudad ||
        texto(
            primero.candidato_ciudad,
            ""
        );


    // =================================================
    // OPERADOR
    // =================================================

    /*
     * El operador ya viene desde reporteService
     * como operador_nombre.
     */

    const operadorNombre =
        texto(
            primero.operador_nombre,
            "Operador"
        );


    // =================================================
    // FECHA
    // =================================================

    const fecha =
        formatearFecha();


    // =================================================
    // DIRECTORIO TEMPORAL
    // =================================================

    const directorio =
        os.tmpdir();


    // =================================================
    // NOMBRE PDF
    // =================================================

    const candidatoArchivo =
        limpiarNombreArchivo(
            candidatoCompleto ||
            "asignaciones"
        );


    const nombreArchivo =
        `lista_asignaciones_${candidatoArchivo}.pdf`;


    const ruta =
        path.join(
            directorio,
            nombreArchivo
        );


    // =================================================
    // DOCUMENTO
    // A4 HORIZONTAL
    // =================================================

    const doc =
        new PDFDocument({

            size: "A4",

            layout: "landscape",

            margins: {
                top: 25,
                bottom: 25,
                left: 25,
                right: 25
            },

            bufferPages: false
        });


    const stream =
        fs.createWriteStream(
            ruta
        );


    doc.pipe(stream);


    // =================================================
    // MEDIDAS
    // =================================================

    const margenIzquierdo = 25;

    const anchoPagina =
        doc.page.width;

    const altoPagina =
        doc.page.height;

    const anchoUtil =
        anchoPagina - 50;


    // =================================================
    // CONFIGURACIÓN DE TABLA
    // =================================================

    const ALTURA_ENCABEZADO = 24;

    const ALTURA_FILA = 20;

    const MARGEN_INFERIOR_TABLA = 55;


    // =================================================
    // COLUMNAS
    // =================================================

    const columnas = [

        {
            titulo: "N°",
            ancho: 25
        },

        {
            titulo: "NOMBRE Y APELLIDO",
            ancho: 135
        },

        {
            titulo: "CÉDULA",
            ancho: 58
        },

        {
            titulo: "SECCIONAL",
            ancho: 58
        },

        {
            titulo: "PARTIDO",
            ancho: 62
        },

        {
            titulo: "LOCAL",
            ancho: 105
        },

        {
            titulo: "MESA",
            ancho: 35
        },

        {
            titulo: "ORDEN",
            ancho: 38
        },

        {
            titulo: "CELULAR",
            ancho: 80
        },

        {
            titulo: "VOTO",
            ancho: 40
        },

        {
            titulo: "INT. PASADA",
            ancho: 55
        }
    ];


    // =================================================
    // ANCHO REAL DE LA TABLA
    // =================================================

    const anchoTabla =
        columnas.reduce(
            (total, columna) =>
                total + columna.ancho,
            0
        );


    // =================================================
    // POSICIONES X
    // =================================================

    function obtenerX() {

        let x =
            margenIzquierdo;

        return columnas.map(
            columna => {

                const posicion =
                    x;

                x += columna.ancho;

                return posicion;
            }
        );
    }


    const posiciones =
        obtenerX();


    // =================================================
    // CONTROL DE PÁGINAS
    // =================================================

    let numeroPagina = 1;


    // =================================================
    // ENCABEZADO PRINCIPAL
    // =================================================

    function dibujarEncabezadoPrincipal() {

        doc
            .font("Helvetica-Bold")
            .fontSize(14)
            .fillColor("#000000")
            .text(

                `LISTA ${texto(
                    intendenteLista ||
                    candidatoLista,
                    "-"
                )} - ${texto(
                    intendenteCompleto,
                    "-"
                ).toUpperCase()}`,

                margenIzquierdo,
                25,

                {
                    width: anchoUtil,
                    align: "center",
                    lineBreak: false
                }
            );


        doc
            .font("Helvetica-Bold")
            .fontSize(10)
            .text(

                `INTENDENTE - ${texto(
                    ciudad,
                    "-"
                ).toUpperCase()}`,

                margenIzquierdo,
                44,

                {
                    width: anchoUtil,
                    align: "center",
                    lineBreak: false
                }
            );


        doc
            .font("Helvetica-Bold")
            .fontSize(12)
            .text(

                "LISTA DE ASIGNACIONES",

                margenIzquierdo,
                65,

                {
                    width: anchoUtil,
                    align: "center",
                    lineBreak: false
                }
            );


        // =================================================
        // DATOS DEL CANDIDATO
        // =================================================

        const yDatos = 88;


        doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor("#000000")
            .text(
                `Candidato: ${candidatoCompleto || "-"}`,
                margenIzquierdo,
                yDatos,
                {
                    lineBreak: false
                }
            );


        doc
            .text(
                `Lista: ${candidatoLista || "-"}`,
                300,
                yDatos,
                {
                    lineBreak: false
                }
            );


        if (
            candidatoCargo !== "INTENDENTE"
        ) {

            doc
                .text(
                    `Opción: ${candidatoOpcion || "-"}`,
                    430,
                    yDatos,
                    {
                        lineBreak: false
                    }
                );
        }


        doc
            .text(
                `Fecha: ${fecha}`,
                650,
                yDatos,
                {
                    lineBreak: false
                }
            );


        // =================================================
        // SEGUNDA LÍNEA
        // =================================================

        doc
            .font("Helvetica-Bold")
            .fontSize(9)
            .text(

                `Cargo: ${candidatoCargo || "-"}`,

                margenIzquierdo,
                104,

                {
                    lineBreak: false
                }
            );


        doc
            .font("Helvetica")
            .fontSize(9)
            .text(

                `Total de personas: ${rows.length}`,

                300,
                104,

                {
                    lineBreak: false
                }
            );


        doc.y = 124;
    }


    // =================================================
    // ENCABEZADO PEQUEÑO
    // PARA PÁGINAS SIGUIENTES
    // =================================================

    function dibujarEncabezadoPaginaSecundaria() {

        doc.y = 25;


        doc
            .font("Helvetica-Bold")
            .fontSize(10)
            .fillColor("#000000")
            .text(

                `LISTA ${texto(
                    intendenteLista ||
                    candidatoLista,
                    "-"
                )} - ${texto(
                    intendenteCompleto,
                    "-"
                ).toUpperCase()}`,

                margenIzquierdo,
                25,

                {
                    width: anchoUtil,
                    align: "center",
                    lineBreak: false
                }
            );


        doc
            .font("Helvetica")
            .fontSize(8)
            .text(

                `Candidato: ${candidatoCompleto || "-"}`,

                margenIzquierdo,
                42,

                {
                    width: anchoUtil,
                    align: "center",
                    lineBreak: false
                }
            );


        doc.y = 58;
    }


    // =================================================
    // ENCABEZADO DE TABLA
    // =================================================

    function dibujarEncabezadoTabla() {

        const y =
            doc.y;


        // =================================================
        // FONDO
        // =================================================

        doc
            .rect(
                margenIzquierdo,
                y,
                anchoTabla,
                ALTURA_ENCABEZADO
            )
            .fillAndStroke(
                "#E5E5E5",
                "#000000"
            );


        doc
            .fillColor("#000000")
            .font("Helvetica-Bold")
            .fontSize(6.5);


        // =================================================
        // LÍNEAS VERTICALES
        // =================================================

        let x =
            margenIzquierdo;


        columnas.forEach(
            columna => {

                doc
                    .moveTo(
                        x,
                        y
                    )
                    .lineTo(
                        x,
                        y + ALTURA_ENCABEZADO
                    )
                    .stroke();

                x += columna.ancho;
            }
        );


        doc
            .moveTo(
                margenIzquierdo + anchoTabla,
                y
            )
            .lineTo(
                margenIzquierdo + anchoTabla,
                y + ALTURA_ENCABEZADO
            )
            .stroke();


        // =================================================
        // TÍTULOS
        // =================================================

        columnas.forEach(
            (columna, index) => {

                doc.text(

                    columna.titulo,

                    posiciones[index] + 2,

                    y + 8,

                    {

                        width:
                            columna.ancho - 4,

                        height:
                            ALTURA_ENCABEZADO - 4,

                        align: "center",

                        lineBreak: false
                    }
                );
            }
        );


        doc.y =
            y + ALTURA_ENCABEZADO;
    }


    // =================================================
    // DIBUJAR FILA
    // =================================================

    function dibujarFila(
        r,
        numero
    ) {

        const y =
            doc.y;


        // =================================================
        // BORDE GENERAL
        // =================================================

        doc
            .rect(
                margenIzquierdo,
                y,
                anchoTabla,
                ALTURA_FILA
            )
            .stroke("#000000");


        // =================================================
        // LÍNEAS VERTICALES
        // =================================================

        let x =
            margenIzquierdo;


        columnas.forEach(
            columna => {

                doc
                    .moveTo(
                        x,
                        y
                    )
                    .lineTo(
                        x,
                        y + ALTURA_FILA
                    )
                    .stroke();

                x += columna.ancho;
            }
        );


        doc
            .moveTo(
                margenIzquierdo + anchoTabla,
                y
            )
            .lineTo(
                margenIzquierdo + anchoTabla,
                y + ALTURA_FILA
            )
            .stroke();


        // =================================================
        // NOMBRE
        // =================================================

        const nombre =
            texto(
                r.nombre,
                ""
            );


        const apellido =
            texto(
                r.apellido,
                ""
            );


        const nombreCompleto =
            `${nombre} ${apellido}`
                .trim();


        // =================================================
        // CÉDULA
        // =================================================

        const cedula =
            texto(
                r.cedula,
                ""
            );


        // =================================================
        // SECCIONAL
        // =================================================

        const seccional =
            texto(
                r.seccional,
                ""
            );


        // =================================================
        // PARTIDO
        // NÚMERO + NOMBRE
        // =================================================

        const numeroPartido =
            texto(
                r.n_partido,
                ""
            );


        const nombrePartido =
            texto(
                r.partido,
                ""
            );


        let partido = "";


        if (
            numeroPartido &&
            nombrePartido
        ) {

            partido =
                `${numeroPartido} - ${nombrePartido}`;

        } else {

            partido =
                nombrePartido ||
                numeroPartido ||
                "";
        }


        // =================================================
        // LOCAL
        // =================================================

        const local =
            texto(
                r.local,
                ""
            );


        // =================================================
        // MESA
        // =================================================

        const mesa =
            texto(
                r.mesa,
                ""
            );


        // =================================================
        // ORDEN
        // =================================================

        const orden =
            texto(
                r.orden,
                ""
            );


        // =================================================
        // CELULAR
        // =================================================

        const celular =
            texto(
                r.celunew ||
                r.celular,
                ""
            );


        // =================================================
        // VOTO ACTUAL
        // =================================================

        const voto =
            normalizarVoto(
                r.voto
            );


        // =================================================
        // VOTO INTERNA PASADA
        // VOTO5
        // =================================================

        const votoInternaPasada =
            normalizarVoto(
                r.voto5
            );


        // =================================================
        // VALORES
        // =================================================

        const valores = [

            numero,

            nombreCompleto,

            cedula,

            seccional,

            partido,

            local,

            mesa,

            orden,

            celular,

            voto,

            votoInternaPasada
        ];


        // =================================================
        // ESCRIBIR
        // =================================================

        doc
            .font("Helvetica")
            .fontSize(6.8)
            .fillColor("#000000");


        columnas.forEach(
            (columna, colIndex) => {

                let alineacion =
                    "left";


                // =================================================
                // CENTRADOS
                // =================================================

                if (
                    [
                        0,
                        2,
                        3,
                        4,
                        6,
                        7,
                        9,
                        10
                    ].includes(
                        colIndex
                    )
                ) {

                    alineacion =
                        "center";
                }


                const valor =
                    valores[colIndex];


                if (
                    valor !== null &&
                    valor !== undefined &&
                    String(valor).trim() !== ""
                ) {

                    doc.text(

                        String(valor),

                        posiciones[colIndex] + 2,

                        y + 6,

                        {

                            width:
                                columna.ancho - 4,

                            height:
                                ALTURA_FILA - 3,

                            align:
                                alineacion,

                            ellipsis:
                                true,

                            lineBreak:
                                false
                        }
                    );
                }
            }
        );


        doc.y =
            y + ALTURA_FILA;
    }


    // =================================================
    // PIE DE PÁGINA
    // =================================================

  function dibujarPiePagina() {

    doc.save();

    doc.font("Helvetica")
        .fontSize(7)
        .fillColor("#555555");

    doc.text(
        `Lista de asignaciones - Página ${numeroPagina}`,
        margenIzquierdo,
        altoPagina - 18,
        {
            width: anchoUtil,
            height: 10,
            align: "right",
            lineBreak: false
        }
    );

    doc.restore();
}

    // =================================================
    // PRIMERA PÁGINA
    // =================================================

    dibujarEncabezadoPrincipal();

    dibujarEncabezadoTabla();


    // =================================================
    // DIBUJAR REGISTROS
    // SIN FILAS VACÍAS
    // =================================================

    for (
        let i = 0;
        i < rows.length;
        i++
    ) {

        // =================================================
        // CONTROL REAL DEL ESPACIO
        // =================================================

        if (
            doc.y +
            ALTURA_FILA >
            altoPagina -
            MARGEN_INFERIOR_TABLA
        ) {

            dibujarPiePagina();

            doc.addPage();

            numeroPagina++;

            dibujarEncabezadoPaginaSecundaria();

            dibujarEncabezadoTabla();
        }


        dibujarFila(
            rows[i],
            i + 1
        );
    }


    // =================================================
    // RESUMEN
    // =================================================

    const total =
        rows.length;


    const votos =
        rows.filter(
            r =>
                String(r.voto || "")
                    .trim()
                    .toUpperCase() === "S"
        ).length;


    const pendientes =
        total - votos;


    // =================================================
    // ESPACIO NECESARIO PARA RESUMEN + FIRMAS
    // =================================================

    const ALTURA_RESUMEN_FIRMAS = 105;


    if (
        doc.y +
        ALTURA_RESUMEN_FIRMAS >
        altoPagina - 25
    ) {

        dibujarPiePagina();

        doc.addPage();

        numeroPagina++;

        dibujarEncabezadoPaginaSecundaria();

        doc.y = 75;
    }


    // =================================================
    // RESUMEN FINAL
    // =================================================

    doc.moveDown(0.4);


    doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#000000")
        .text(

            `TOTAL DE PERSONAS: ${total}`,

            margenIzquierdo,
            doc.y,

            {
                lineBreak: false
            }
        );


    doc
        .font("Helvetica")
        .fontSize(9)
        .text(

            `VOTOS CONFIRMADOS: ${votos}`,

            220,
            doc.y - 11,

            {
                lineBreak: false
            }
        );


    doc
        .text(

            `PENDIENTES: ${pendientes}`,

            430,
            doc.y - 11,

            {
                lineBreak: false
            }
        );


    doc.y += 22;


    // =================================================
    // FIRMAS
    // =================================================

    const yFirma =
        doc.y;


    // =================================================
    // LÍNEA FIRMA OPERADOR
    // =================================================

    doc
        .moveTo(
            100,
            yFirma + 25
        )
        .lineTo(
            350,
            yFirma + 25
        )
        .stroke();


    // =================================================
    // LÍNEA FIRMA RECEPCIÓN
    // =================================================

    doc
        .moveTo(
            520,
            yFirma + 25
        )
        .lineTo(
            770,
            yFirma + 25
        )
        .stroke();


    // =================================================
    // TEXTO FIRMA OPERADOR
    // =================================================

    doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#000000")
        .text(

            operadorNombre,

            100,
            yFirma + 30,

            {
                width: 250,
                align: "center",
                lineBreak: false
            }
        );


    doc
        .font("Helvetica")
        .fontSize(7)
        .text(

            "Operador",

            100,
            yFirma + 42,

            {
                width: 250,
                align: "center",
                lineBreak: false
            }
        );


    // =================================================
    // FIRMA / RECEPCIÓN
    // =================================================

    doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(

            "Firma / Recepción",

            520,
            yFirma + 30,

            {
                width: 250,
                align: "center",
                lineBreak: false
            }
        );


    // =================================================
    // PIE ÚLTIMA PÁGINA
    // =================================================

    dibujarPiePagina();


    // =================================================
    // FINALIZAR
    // =================================================

    doc.end();


    // =================================================
    // ESPERAR ARCHIVO
    // =================================================

    await new Promise(
        (resolve, reject) => {

            stream.on(
                "finish",
                resolve
            );

            stream.on(
                "error",
                reject
            );
        }
    );


    // =================================================
    // RESULTADO
    // =================================================

    return {

        ruta,

        nombreArchivo,

        total:
            rows.length,

        candidato:
            candidatoCompleto,

        intendente:
            intendenteCompleto,

        lista:
            intendenteLista ||
            candidatoLista,

        opcion:
            candidatoCargo === "INTENDENTE"
                ? null
                : candidatoOpcion,

        operador:
            operadorNombre
    };
}