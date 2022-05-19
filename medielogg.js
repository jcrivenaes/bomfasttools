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
            console.log(rep);

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
                    console.log(row[ele]);
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

    json.forEach((row) => {
        const keys = Object.keys(row);
        let headerdato = "";
        let dato = "";
        let tittel = "";
        let kommentar = "";
        let media = "";
        let abo = "";
        let dot = "";

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
                tittel = "".concat("<A HREF=", url, " class=lenke>", tittel, "</A>. ");
            }

            if (key == "Media" && row[key] != null) {
                media = "<span class='media'>(".concat(row[key]);
            }

            if (key == "Abo" && row[key] != null) {
                if (row[key] == "Ja") {
                    console.log("AboBAO");
                    abo = " [Abo])</span>";
                } else {
                    abo = ")</span>";
                }
            }
            if (key == "Kommentar" && row[key] != null) {
                kommentar = row[key];
            }
            if (key == "Alt" && row[key] != null) {
                let url2 = wixstatic.concat(row[key]);
                dot = "".concat("<A HREF=", url2, " class=ilenke>", ".", "</A>");
            } else {
                dot = ".";
            }
        });
        if (headerdato != null) {
            rowtext = rowtext.concat(headerdato);
        } else {
            rowtext = rowtext.concat(
                dato.concat(tittel, media, abo, dot, " ", kommentar)
            );
        }
        console.log("ROWTEXT:", rowtext);
        alltext = alltext.concat(rowtext, "<p>");
    });
    xx.innerHTML = alltext;
}
