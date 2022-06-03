const sheetId = "1h0HQyp6UF5e5_jgArIX2AJut3vsw631bwPKBDII3hqE";
const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
const sheetName = "medielogg";
const query = encodeURIComponent("Select *");
const url = `${base}&sheet=${sheetName}&tq=${query}`;

const data = [];
document.addEventListener("DOMContentLoaded", init);

const output = document.querySelector(".output");

function init() {
    fetch(url)
        .then((res) => res.text())
        .then((rep) => {
            //Remove additional text and extract only JSON:
            const jsonData = JSON.parse(rep.substring(47).slice(0, -2));
            //console.log(rep);

            const colz = [];
            const tr = document.createElement("tr");
            //Extract column labels
            jsonData.table.cols.forEach((heading) => {
                if (heading.label) {
                    let column = heading.label;
                    colz.push(column);
                }
            });

            //extract row data:
            jsonData.table.rows.forEach((rowData) => {
                const row = {};
                colz.forEach((ele, ind) => {
                    row[ele] = rowData.c[ind] != null ? rowData.c[ind].v : "";
                    //console.log(row[ele]);
                });

                data.push(row);
            });
            processRows2(data);
        });
}

function processRows2(json) {
    var alltext = "";
    let xx = document.getElementById("output");
    let wixstatic = "https://static.wixstatic.com/media/";
    let wixpdf = "https://www.bomfast.info/_files/ugd/";

    json.forEach((row) => {
        const keys = Object.keys(row);
        let headerdato = "";
        let dato = "";
        let tittel = "";
        let kommentar = "";
        let media = "";
        let abo = "";
        let dot = ".";

        let urlpattern = "<A HREF=xxx TARGET='_BLANK'> ttt </A>";
        const lenke1pattern = /{LENKE1:.*?}/;
        let lenke1url = "";
        let lenke1txt = "";
        const lenke2pattern = /{LENKE2:.*?}/;
        let lenke2url = "";
        let lenke2txt = "";

        let rowtext = "";
        let anchor = document.createElement("a");
        let tnode;
        keys.forEach((key) => {
            if (key == "ID") {
                let datotext = row[key].toString();
                if (datotext.length == 4) {
                    headerdato = "<h1>".concat(datotext, "</h1>");
                } else {
                    let aar = datotext.substring(0, 4);
                    let mnd = datotext.substring(4, 6);
                    let dag = datotext.substring(6, 8);
                    dato = "<span class='dato'>";
                    dato = dato.concat(aar, "-", mnd, "-", dag);
                    dato = dato.concat("</span><BR>");
                    headerdato = null;
                }
            }
            if (key == "Tittel" && row[key] != null) {
                tittel += row[key];
            }
            if (key == "Lenke" && row[key] != null) {
                let url = row[key];
                tittel = "".concat(
                    "<A HREF=",
                    url,
                    " target='_blank' class=lenke>",
                    tittel,
                    "</A>. "
                );
            }

            if (key == "Media" && row[key] != null) {
                media = "<span class='media'>(".concat(row[key]);
            }

            if (key == "Abo" && row[key] != null) {
                if (row[key] == "Ja") {
                    //console.log("AboBAO");
                    abo = " [Abo])</span>";
                } else {
                    abo = ")</span>";
                }
            }
            if (key == "Kommentar" && row[key] != null) {
                kommentar = row[key];
                kommentar = kommentar.replace(/\n/g, " ");

                lenke1txt = kommentar.match(lenke1pattern);
                if (lenke1txt != null) {
                    lenke1txt = lenke1txt[0].replace("{LENKE1:", "").replace("}", "");
                }
                lenke2txt = kommentar.match(lenke2pattern);
                if (lenke2txt != null) {
                    lenke2txt = lenke2txt[0].replace("{LENKE2:", "").replace("}", "");
                }
            }
            if (key == "Alt" && row[key] != null) {
                let is_jpg = false;
                is_jpg = row[key].toLowerCase().endsWith("jpg");
                let is_pdf = false;
                is_pdf = row[key].toLowerCase().endsWith("pdf");
                let url2 = "";
                if (is_pdf) {
                    url2 = wixpdf.concat(row[key]);
                }
                if (is_jpg) {
                    url2 = wixstatic.concat(row[key]);
                }
                if (is_pdf || is_jpg) {
                    dot = "".concat(
                        "<A HREF=",
                        url2,
                        " class=ilenke target='_blank'>",
                        ";",
                        "</A>"
                    );
                } else {
                    dot = ".";
                }
            }

            if (key == "LENKE1" && row[key] != null) {
                lenke1url = row[key];
            }
            if (key == "LENKE2" && row[key] != null) {
                lenke2url = row[key];
            }
        });
        if (headerdato != null) {
            rowtext = rowtext.concat(headerdato);
        } else {
            let url1 = urlpattern.replace("xxx", lenke1url).replace("ttt", lenke1txt);
            kommentar = kommentar.replace(lenke1pattern, url1);
            let url2 = urlpattern.replace("xxx", lenke2url).replace("ttt", lenke2txt);
            kommentar = kommentar.replace(lenke2pattern, url2);

            rowtext = rowtext.concat(
                dato.concat(tittel, media, abo, dot, " ", kommentar)
            );
        }
        console.log("ROWTEXT:", rowtext);
        alltext = alltext.concat(rowtext, "<p>");
    });
    xx.innerHTML = alltext;
}
