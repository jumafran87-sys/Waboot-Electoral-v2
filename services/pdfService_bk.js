import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import os from "os";


// =====================================================
// GENERAR PDF - LISTA DE ASIGNACIONES
// A4 HORIZONTAL
// =====================================================

export async function generarPdfAsignaciones({
    rows = [],
    usuario = {},
    candidato = {},
    lista = "1",
    opcion = "-"
}) {

    if (!rows || rows.length === 0) {
        throw new Error("No hay registros para generar el PDF.");
    }


    // =================================================
    // ARCHIVO TEMPORAL
    // =================================================

    const nombreArchivo =
        `lista_asignaciones_${Date.now()}.pdf`;

    const rutaArchivo =
        path.join(
            os.tmpdir(),
            nombreArchivo
        );


    // =================================================
    // DOCUMENTO A4 HORIZONTAL
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
            rutaArchivo
        );


    doc.pipe(stream);


    // =================================================
    // MEDIDAS
    // =================================================

    const pageWidth =
        doc.page.width;

    const pageHeight =
        doc.page.height;

    const margenIzq = 25;
    const margenDer = 25;

    const anchoUtil =
        pageWidth -
        margenIzq -
        margenDer;


    // =================================================
    // DATOS ENCABEZADO
    // =================================================

    const nombreCandidato =
        candidato.nombre ||
        usuario.candidato_nombre ||
        usuario.nombre ||
        "-";


    const apellidoCandidato =
        candidato.apellido ||
        usuario.candidato_apellido ||
        "";


    const candidatoCompleto =
        `${nombreCandidato} ${apellidoCandidato}`
            .trim();


    const nombreLista =
        candidato.lista_nombre ||
        "JULIÁN VEGA";


    const cargo =
        candidato.cargo ||
        "INTENDENTE";


    const ciudad =
        candidato.ciudad ||
        "MARIANO ROQUE ALONSO";


    const nombreOperador =
        usuario.nombre ||
        usuario.telefono ||
        "-";


    const fecha =
        new Date()
            .toLocaleDateString(
                "es-PY",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }
            );


    // =================================================
    // FUNCIÓN ENCABEZADO
    // =================================================

    function dibujarEncabezado() {

        let y = 25;


        // ---------------------------------------------
        // LISTA
        // ---------------------------------------------

        doc
            .font("Helvetica-Bold")
            .fontSize(15)
            .text(
                `LISTA ${lista} - ${nombreLista}`,
                margenIzq,
                y,
                {
                    width: anchoUtil,
                    align: "center"
                }
            );


        y += 19;


        // ---------------------------------------------
        // CARGO / CIUDAD
        // ---------------------------------------------

        doc
            .font("Helvetica-Bold")
            .fontSize(9)
            .text(
                `${cargo} - ${ciudad}`,
                margenIzq,
                y,
                {
                    width: anchoUtil,
                    align: "center"
                }
            );


        y += 18;


        // ---------------------------------------------
        // TITULO
        // ---------------------------------------------

        doc
            .font("Helvetica-Bold")
            .fontSize(13)
            .text(
                "LISTA DE ASIGNACIONES",
                margenIzq,
                y,
                {
                    width: anchoUtil,
                    align: "center"
                }
            );


        y += 24;


        // ---------------------------------------------
        // INFORMACIÓN
        // ---------------------------------------------

        doc
            .font("Helvetica")
            .fontSize(8);


        doc.text(
            `Candidato: ${candidatoCompleto}`,
            margenIzq,
            y
        );


        doc.text(
            `Lista: ${lista}`,
            300,
            y
        );


        doc.text(
            `Opción: ${opcion}`,
            390,
            y
        );


        doc.text(
            `Operador: ${nombreOperador}`,
            500,
            y
        );


        doc.text(
            `Fecha: ${fecha}`,
            700,
            y
        );


        y += 18;


        return y;
    }


    // =================================================
    // COLUMNAS
    // =================================================

    const columnas = [

        {
            key: "numero",
            titulo: "N°",
            ancho: 25,
            align: "center"
        },

        {
            key: "nombre",
            titulo: "NOMBRE Y APELLIDO",
            ancho: 170,
            align: "left"
        },

        {
            key: "cedula",
            titulo: "CÉDULA N°",
            ancho: 65,
            align: "center"
        },

        {
            key: "seccional",
            titulo: "SECCIONAL N°",
            ancho: 65,
            align: "center"
        },

        {
            key: "partido",
            titulo: "PARTIDO",
            ancho: 65,
            align: "center"
        },

        {
            key: "local",
            titulo: "LOCAL",
            ancho: 145,
            align: "left"
        },

        {
            key: "mesa",
            titulo: "MESA",
            ancho: 42,
            align: "center"
        },

        {
            key: "orden",
            titulo: "ORDEN",
            ancho: 42,
            align: "center"
        },

        {
            key: "celular",
            titulo: "CELULAR",
            ancho: 75,
            align: "center"
        },

        {
            key: "voto",
            titulo: "VOTO",
            ancho: 45,
            align: "center"
        }

    ];


    // =================================================
    // VERIFICAR ANCHO
    // =================================================

    const anchoColumnas =
        columnas.reduce(
            (total, columna) =>
                total + columna.ancho,
            0
        );


    // =================================================
    // TABLA
    // =================================================

    function dibujarCabeceraTabla(y) {

        const alto = 22;

        let x = margenIzq;


        doc
            .font("Helvetica-Bold")
            .fontSize(7);


        for (const columna of columnas) {

            doc
                .rect(
                    x,
                    y,
                    columna.ancho,
                    alto
                )
                .stroke();


            doc.text(
                columna.titulo,
                x + 3,
                y + 7,
                {
                    width:
                        columna.ancho - 6,

                    align:
                        columna.align
                }
            );


            x += columna.ancho;
        }


        return y + alto;
    }


    // =================================================
    // FILA
    // =================================================

    function dibujarFila(
        y,
        row,
        numero
    ) {

        const alto = 20;

        let x = margenIzq;


        const celular =
            row.celunew ||
            row.celular ||
            "";


        const nombre =
            `${row.nombre || ""} ${row.apellido || ""}`
                .trim();


        const datos = {

            numero,

            nombre,

            cedula:
                row.cedula ||
                "",

            seccional:
                row.seccional ||
                row.seccional_numero ||
                "",

            partido:
                row.partido ||
                "",

            local:
                row.local ||
                "",

            mesa:
                row.mesa ||
                "",

            orden:
                row.orden ||
                "",

            celular,

            voto:
                row.voto === "S"
                    ? "S"
                    : ""

        };


        doc
            .font("Helvetica")
            .fontSize(7);


        for (const columna of columnas) {

            doc
                .rect(
                    x,
                    y,
                    columna.ancho,
                    alto
                )
                .stroke();


            doc.text(
                String(
                    datos[columna.key] ?? ""
                ),
                x + 3,
                y + 6,
                {
                    width:
                        columna.ancho - 6,

                    align:
                        columna.align,

                    ellipsis: true
                }
            );


            x += columna.ancho;
        }


        return y + alto;
    }


    // =================================================
    // PRIMERA PÁGINA
    // =================================================

    let y =
        dibujarEncabezado();


    y =
        dibujarCabeceraTabla(y);


    // =================================================
    // FILAS
    // =================================================

    const altoFila = 20;

    const altoPie = 75;


    rows.forEach((row, index) => {

        // ---------------------------------------------
        // ¿NECESITAMOS NUEVA PÁGINA?
        // ---------------------------------------------

        if (
            y + altoFila >
            pageHeight - altoPie
        ) {

            doc.addPage();

            y =
                dibujarEncabezado();

            y =
                dibujarCabeceraTabla(y);
        }


        y =
            dibujarFila(
                y,
                row,
                index + 1
            );

    });


    // =================================================
    // PIE
    // =================================================

    if (
        y + altoPie >
        pageHeight - 20
    ) {

        doc.addPage();

        y = 30;
    }


    y += 15;


    doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(
            `TOTAL DE PERSONAS: ${rows.length}`,
            margenIzq,
            y
        );


    y += 20;


    // =================================================
    // OBSERVACIONES
    // =================================================

    doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(
            "OBSERVACIONES:",
            margenIzq,
            y
        );


    y += 12;


    doc
        .moveTo(
            margenIzq,
            y
        )
        .lineTo(
            pageWidth - margenDer,
            y
        )
        .stroke();


    y += 15;


    doc
        .moveTo(
            margenIzq,
            y
        )
        .lineTo(
            pageWidth - margenDer,
            y
        )
        .stroke();


    // =================================================
    // FIRMAS
    // =================================================

    const firmaY =
        pageHeight - 45;


    doc
        .font("Helvetica")
        .fontSize(8);


    doc
        .moveTo(
            120,
            firmaY
        )
        .lineTo(
            300,
            firmaY
        )
        .stroke();


    doc.text(
        "Firma del Operador",
        120,
        firmaY + 5,
        {
            width: 180,
            align: "center"
        }
    );


    doc
        .moveTo(
            pageWidth - 300,
            firmaY
        )
        .lineTo(
            pageWidth - 120,
            firmaY
        )
        .stroke();


    doc.text(
        "Firma / Recepción",
        pageWidth - 300,
        firmaY + 5,
        {
            width: 180,
            align: "center"
        }
    );


    // =================================================
    // FINALIZAR
    // =================================================

    doc.end();


    // =================================================
    // ESPERAR QUE TERMINE DE ESCRIBIR
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


    return {
        ruta: rutaArchivo,
        nombre: nombreArchivo
    };
}