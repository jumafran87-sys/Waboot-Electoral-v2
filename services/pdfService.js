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
    //
    // Por seguridad, usamos sus propios datos.
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

            bufferPages: true
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

    const anchoUtil =
        anchoPagina -
        50;


    // =================================================
    // ENCABEZADO
    // =================================================

    doc
        .font("Helvetica-Bold")
        .fontSize(14)
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
                align: "center"
            }
        );


    doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(
            `${texto(
                "INTENDENTE"
            )} - ${texto(
                ciudad,
                "-"
            ).toUpperCase()}`,
            {
                width: anchoUtil,
                align: "center"
            }
        );


    doc.moveDown(0.4);


    doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(
            "LISTA DE ASIGNACIONES",
            {
                width: anchoUtil,
                align: "center"
            }
        );


    doc.moveDown(0.8);


    // =================================================
    // INFORMACIÓN DEL CANDIDATO
    // =================================================

    const yDatos =
        doc.y;


    doc
        .font("Helvetica")
        .fontSize(9)
        .text(
            `Candidato: ${candidatoCompleto || "-"}`,
            margenIzquierdo,
            yDatos
        );


    doc
        .text(
            `Lista: ${candidatoLista || "-"}`,
            300,
            yDatos
        );


    // =================================================
    // OPCIÓN
    //
    // SOLAMENTE PARA CONCEJAL
    // =================================================

    if (
        candidatoCargo !== "INTENDENTE"
    ) {

        doc
            .text(
                `Opción: ${candidatoOpcion || "-"}`,
                430,
                yDatos
            );
    }


    doc
        .text(
            `Fecha: ${fecha}`,
            650,
            yDatos
        );


    doc.moveDown(0.8);


    // =================================================
    // SEGUNDA LÍNEA
    // =================================================

    doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(
            `Cargo: ${candidatoCargo || "-"}`,
            margenIzquierdo
        );


    doc
        .font("Helvetica")
        .fontSize(9)
        .text(
            `Total de personas: ${rows.length}`,
            300,
            doc.y - 11
        );


    doc.moveDown(0.8);


    // =================================================
    // TABLA
    // =================================================

    const columnas = [

        {
            titulo: "N°",
            ancho: 28
        },

        {
            titulo: "NOMBRE Y APELLIDO",
            ancho: 150
        },

        {
            titulo: "CÉDULA",
            ancho: 65
        },

        {
            titulo: "SECCIONAL N°",
            ancho: 70
        },

        {
            titulo: "PARTIDO",
            ancho: 75
        },

        {
            titulo: "LOCAL",
            ancho: 125
        },

        {
            titulo: "MESA",
            ancho: 40
        },

        {
            titulo: "ORDEN",
            ancho: 45
        },

        {
            titulo: "CELULAR",
            ancho: 85
        },

        {
            titulo: "VOTO",
            ancho: 45
        }
    ];


    // =================================================
    // POSICIONES
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
    // ENCABEZADO TABLA
    // =================================================

    function dibujarEncabezadoTabla() {

        const y =
            doc.y;


        const alto =
            25;


        // fondo del encabezado
        doc
            .rect(
                margenIzquierdo,
                y,
                anchoUtil,
                alto
            )
            .fillAndStroke(
                "#E5E5E5",
                "#000000"
            );


        doc
            .fillColor("#000000")
            .font("Helvetica-Bold")
            .fontSize(7);


        columnas.forEach(
            (columna, index) => {

                doc.text(
                    columna.titulo,
                    posiciones[index] + 3,
                    y + 8,
                    {
                        width:
                            columna.ancho - 6,

                        align: "center"
                    }
                );
            }
        );


        doc.y =
            y + alto;
    }


    dibujarEncabezadoTabla();


    // =================================================
    // ALTURA DE FILA
    // =================================================

    const alturaFila =
        22;


    // =================================================
    // FILAS
    // =================================================

    rows.forEach(
        (r, index) => {

            // =============================================
            // SALTO DE PÁGINA
            // =============================================

            if (
                doc.y + alturaFila >
                doc.page.height - 45
            ) {

                doc.addPage();

                doc.y =
                    25;

                dibujarEncabezadoTabla();
            }


            const y =
                doc.y;


            // =============================================
            // BORDE DE FILA
            // =============================================

            doc
                .rect(
                    margenIzquierdo,
                    y,
                    anchoUtil,
                    alturaFila
                )
                .stroke("#000000");


            // =============================================
            // DATOS
            // =============================================

            const nombreCompleto =
                `${texto(r.nombre, "")} ${texto(r.apellido, "")}`
                    .trim();


            const cedula =
                texto(
                    r.cedula
                );


            const seccional =
                texto(
                    r.seccional,
                    ""
                );


            const partido =
                texto(
                    r.partido,
                    ""
                );


            const local =
                texto(
                    r.local
                );


            const mesa =
                texto(
                    r.mesa
                );


            const orden =
                texto(
                    r.orden
                );


            const celular =
                texto(
                    r.celunew ||
                    r.celular
                );


            const voto =
                r.voto === "S"
                    ? "S"
                    : "N";


            const valores = [

                index + 1,

                nombreCompleto,

                cedula,

                seccional,

                partido,

                local,

                mesa,

                orden,

                celular,

                voto
            ];


            // =============================================
            // ESCRIBIR CELDAS
            // =============================================

            doc
                .font("Helvetica")
                .fontSize(7)
                .fillColor("#000000");


            columnas.forEach(
                (columna, colIndex) => {

                    let alineacion =
                        "left";


                    if (
                        [
                            0,
                            2,
                            3,
                            4,
                            6,
                            7,
                            9
                        ].includes(
                            colIndex
                        )
                    ) {

                        alineacion =
                            "center";
                    }


                    doc.text(
                        texto(
                            valores[colIndex]
                        ),
                        posiciones[colIndex] + 3,
                        y + 7,
                        {
                            width:
                                columna.ancho - 6,

                            height:
                                alturaFila - 4,

                            align:
                                alineacion,

                            ellipsis:
                                true
                        }
                    );
                });


            doc.y =
                y + alturaFila;
        }
    );


    // =================================================
    // RESUMEN FINAL
    // =================================================

    doc.moveDown(1);


    const total =
        rows.length;


    const votos =
        rows.filter(
            r => r.voto === "S"
        ).length;


    const pendientes =
        total - votos;


    doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(
            `TOTAL DE PERSONAS: ${total}`
        );


    doc
        .font("Helvetica")
        .fontSize(9)
        .text(
            `VOTOS CONFIRMADOS: ${votos}`
        );


    doc
        .text(
            `PENDIENTES: ${pendientes}`
        );


    doc.moveDown(1);


    // =================================================
    // FIRMAS
    // =================================================

    const yFirma =
        doc.y;


    doc
        .moveTo(100, yFirma + 25)
        .lineTo(350, yFirma + 25)
        .stroke();


    doc
        .moveTo(520, yFirma + 25)
        .lineTo(770, yFirma + 25)
        .stroke();


    doc
        .font("Helvetica")
        .fontSize(8);


    doc
        .text(
            "Firma del Operador",
            100,
            yFirma + 30,
            {
                width: 250,
                align: "center"
            }
        );


    doc
        .text(
            "Firma / Recepción",
            520,
            yFirma + 30,
            {
                width: 250,
                align: "center"
            }
        );


    // =================================================
    // PIE DE PÁGINA
    // =================================================

    const paginas =
        doc.bufferedPageRange();


    for (
        let i = 0;
        i < paginas.count;
        i++
    ) {

        doc.switchToPage(
            i
        );


        doc
            .font("Helvetica")
            .fontSize(7)
            .fillColor("#555555")
            .text(
                `Página ${i + 1} de ${paginas.count}`,
                25,
                doc.page.height - 20,
                {
                    width:
                        doc.page.width - 50,

                    align: "right"
                }
            );
    }


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

        total: rows.length,

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
                : candidatoOpcion
    };
}