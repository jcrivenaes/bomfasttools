const sheetId = '1h0HQyp6UF5e5_jgArIX2AJut3vsw631bwPKBDII3hqE';
const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
const sheetName = 'user-data';
const query = encodeURIComponent('Select *')
const url = `${base}&sheet=${sheetName}&tq=${query}`
 
const data = []
document.addEventListener('DOMContentLoaded', init)
 
const output = document.querySelector('.output')

function init() {
    fetch(url)
        .then(res => res.text())
        .then(rep => {
            //Remove additional text and extract only JSON:
            const jsonData = JSON.parse(rep.substring(47).slice(0, -2));
            console.log(rep)


            const colz = [];
            const tr = document.createElement('tr');
            //Extract column labels
            jsonData.table.cols.forEach((heading) => {
                if (heading.label) {
                    let column = heading.label;
                    colz.push(column);
                }
            })

           //extract row data:
           jsonData.table.rows.forEach((rowData) => {
                const row = {};
                colz.forEach((ele, ind) => {
                    row[ele] = (rowData.c[ind] != null) ? rowData.c[ind].v : '';
                    console.log(row[ele])
                })
                console.log(row)
                data.push(row);
            })
        processRows2(data);
    })
}


function processRows2(json) {

    var alltext=""
    let xx = document.getElementById("output");

    json.forEach((row) => {
        const keys = Object.keys(row);
        let dato = "";
        var tittel = "";
        let rowtext = "";
        let anchor = document.createElement('a');
        let tnode;
        keys.forEach((key) => {

            if (key == "Dato") {
                dato = "<span class='dato'>";
                dato = dato.concat(row[key], ": ")
                dato = dato.concat("</span>")
            }
            if (key == "Tittel") {
                tittel += row[key]
            }
            if (key == "Lenke") {
                let url = row[key]
                tittel = "".concat("<A HREF=", url, " class=lenke>", tittel, "</A>")
            }


        })
        rowtext = rowtext.concat(dato.concat(tittel));
        console.log("ROWTEXT:", rowtext)
        alltext = alltext.concat(rowtext, "<p>")
    })
    xx.innerHTML = alltext
}
