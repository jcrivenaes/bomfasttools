const sheetId = '1h0HQyp6UF5e5_jgArIX2AJut3vsw631bwPKBDII3hqE';
const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
const sheetName = 'user-data';
const query = encodeURIComponent('Select *')
const url = `${base}&sheet=${sheetName}&tq=${query}`
 
const data = []
document.addEventListener('DOMContentLoaded', init)
 
const output = document.querySelector('.output')
 
function initorig() {
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
                    const th = document.createElement('th');
                    th.innerText = column;
                    tr.appendChild(th);
                }
            })
            output.appendChild(tr);

           //extract row data:
           jsonData.table.rows.forEach((rowData) => {
            const row = {};
            colz.forEach((ele, ind) => {
                row[ele] = (rowData.c[ind] != null) ? rowData.c[ind].v : '';
            })
            data.push(row);
        })
        processRows2(data);
    })
}
function init() {
    fetch(url)
        .then(res => res.text())
        .then(rep => {
            //Remove additional text and extract only JSON:
            const jsonData = JSON.parse(rep.substring(47).slice(0, -2));
            // console.log(rep)


            const colz = [];
            const tr = document.createElement('tr');
            //Extract column labels
            jsonData.table.cols.forEach((heading) => {
                if (heading.label) {
                    let column = heading.label;
                    colz.push(column);
                    // const th = document.createElement('th');
                    // th.innerText = column;
                    // tr.appendChild(th);
                }
            })
            // output.appendChild(tr);

           //extract row data:
           jsonData.table.rows.forEach((rowData) => {
                //console.log(rowData)
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

function processRows(json) {
    json.forEach((row) => {

        const tr = document.createElement('tr');
        const keys = Object.keys(row);

        keys.forEach((key) => {
            const td = document.createElement('td');
            td.textContent = row[key];
            tr.appendChild(td);
        })
        output.appendChild(tr);
    })
}

function processRows2(json) {
    json.forEach((row) => {
        let xx = document.getElementById("output");
        const keys = Object.keys(row);

        keys.forEach((key) => {
            xx.innerHTML = row[key]
            console.log("ELEMENT:", row[key])
        })
        // output.appendChild(tr);
    })
}
