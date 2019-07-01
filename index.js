// https://www.npmjs.com/package/http-auth
const auth = require('http-auth');
const basic = auth.basic({
    file: "pw.htpasswd",
});

// https://stackoverflow.com/a/12022746
const querystring = require('querystring');
function processPost(request, response, callback) {
    var queryData = "";
    if(typeof callback !== 'function') return null;
    if(request.method == 'POST') {
        request.on('data', function(data) {
            queryData += data;
            if(queryData.length > 1e6) {
                queryData = "";
                response.writeHead(413, {'Content-Type': 'text/plain'}).end();
                request.connection.destroy();
            }
        });
        request.on('end', function() {
            request.post = querystring.parse(queryData);
            callback();
        });
    } else {
        response.writeHead(405, {'Content-Type': 'text/plain'});
        response.end();
    }
}

// https://www.youtube.com/watch?v=fBNz5xF-Kx4&t=4648s
const http = require('http');
const path = require('path');
const fs = require('fs');
const server = http.createServer(basic, (req, res) => {
    readSpreadsheet();
    if(req.method == 'POST') {
        processPost(req, res, function() {
            const data = req.post;
            if(data['title']!=null) {
                const row = parseInt(data['number']);
                updateSpreadsheet(row,data);
                setTimeout(readSpreadsheet, 3500);
            }
            else if(data['task']!=null) {
                readRow(parseInt(data['task']));
                req.url = '/test';
            }
        });
    }
    setTimeout(function() {
        let filePath = path.join(__dirname, 'public', 
        req.url === '/' ? 'index.html' : 
        req.url === '/tasks' ? 'tasks.html' : 
        req.url === '/test' ? 'test.html' : 
        req.url === '/delete.html' ? 'delete.html' :
        'error.html');
        let extname = path.extname(filePath);
        var contentType = 'text/plain';
        switch(extname) {
            case '.html':
                contentType = 'text/html';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.js':
                contentType = 'application/javascript';
                break;
        }
        fs.readFile(filePath, (err, content) => {
            if (err) throw err;
            res.writeHead(200, {'Content-Type': contentType});
            res.end(content);
        });
    }, 1000);
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// https://www.youtube.com/watch?v=UGN6EUi4Yio
const GoogleSpreadsheet = require('google-spreadsheet');
const { promisify } = require('util');
const creds = require('./google-sheets-node/client_secret.json');
async function readSpreadsheet() {
    const doc = new GoogleSpreadsheet('1BMPc6UQFxgwS1I6yEHt-RNe241-LmZx1eZEjyzlPLbA');
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[0];
    const rows = await promisify(sheet.getRows)({
        offset: 1,
    });
    fs.writeFile('public/tasks.html', tasks(rows), function(err) {
        if(err) throw err;
    });
    fs.writeFile('public/view.html', view(rows), function(err) {
        if(err) throw err;
    });
    fs.writeFile('public/failed.html', failed(rows), function(err) {
        if(err) throw err;
    });
}
async function readRow(taskNum) {
    const doc = new GoogleSpreadsheet('1BMPc6UQFxgwS1I6yEHt-RNe241-LmZx1eZEjyzlPLbA');
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[0];
    const rows = await promisify(sheet.getRows)({
        offset: 1,
    });
    fs.writeFile('public/test.html', test(rows,taskNum), function(err) {
        if(err) throw err;
    });
}
async function updateSpreadsheet(row,data) {
    const doc = new GoogleSpreadsheet('1BMPc6UQFxgwS1I6yEHt-RNe241-LmZx1eZEjyzlPLbA');
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[0];
    sheet.getCells({
        'min-row': 2 + row,
        'min-col': 2,
        'return-empty': true,
    }, function(err, cells) {
        if(err) throw err;
        cells[0].value = data['title'];
        cells[1].value = data['dependencies'];
        cells[2].value = data['steps'];
        cells[3].value = data['expectedresults'];
        cells[4].value = data['passed'];
        cells[5].value = data['actualresults'];
        sheet.bulkUpdateCells(cells);
    })
}
async function newRow(data) {
    const doc = new GoogleSpreadsheet('1BMPc6UQFxgwS1I6yEHt-RNe241-LmZx1eZEjyzlPLbA');
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[0];
    const row = {
        title: data['title'],
        dependencies: data['dependencies'],
        steps: data['steps'],
        expectedresults: data['expectedresults'],
        passed: data['passed'],
        actualresults: data['actualresults'],
    }
    await promisify(sheet.addRow)(row);
    const cell = [{
        row: info.rowCount,
        col: 1,
        formula: '=ROW()-2',
    }]
    await promisify(sheet.bulkUpdateCells)(cell);
}

var htmlTemplate = `<!DOCTYPE html>
    <head>
        <meta charset="utf-8">
        <title>Project Testing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
        * {
            margin: 0px;
            padding: 0px;
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 16px;
            background: #eeeeee;
        }
        h1 {
            font-family: 'Trebuchet MS', 'Lucida Sans', sans-serif;
            font-size: 36px;
            background: lightgray;
            padding: 10px 0px;
            width: 100%;
            text-align: center;
        }
        p {
            margin: 5px;
        }
        tr {
            margin: 0px auto;
        }
        a {
            color: inherit;
            text-decoration: none;
        }
        a:hover {
            cursor: pointer;
        }
        input {
            padding: 5px;
            font-family: Calibri, Arial, sans-serif;
            vertical-align: middle;
        }
        textarea {
            vertical-align: top;
            margin: 3px 10px;
            padding: 5px 7px;
            font-family: Calibri, Arial, sans-serif;
        }
        button {
            padding: 3px;
        }
        .scenario {
            display: inline-block;
            margin: 6px 4px;
            padding: 9px;
            border: 1px;
            background: white;
        }
        #container {
            display: inline-block;
            text-align: center;
            background: #eeeeee;
            width: 100%;
            min-height: 100%;
        }
        #alert {
            text-align: center;
        }
        #tasks {
            margin: 10px auto;
            border: 1px solid black;
            border-collapse: collapse;
        }
        #tasks td {
            padding: 5px;
        }
        #save {
            display: block;
            margin: 4px auto 10px auto;
            padding: 5px 10px;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            font-family: 'Segoe UI', serif;
        }
        </style>
    </head>
    <body>
        <div id="container">
            <a href="."><h1>Project Testing</h1></a>
            <p id="alert">Click the header to reload the data.</p>`;
function tasks(data) {
    var result = htmlTemplate;
    result += `
            <table id="tasks" border="1">`
    for(var i=0; i<data.length; i++) {
        const row = data[i];
        const number = safe(row['number']);
        const title = safe(row['title']);
        const link = safe(row['link']);
        result += `
                <tr>
                    <td><b>${number}</b></td>`
        const passed = safe(row['passed']);
        if (passed=='TRUE') {
            result += `
                    <td style="background:palegreen">`;
        }
        else if (passed=='FALSE') {
            result += `
                    <td style="background:crimson">`;
        }
        else {
            result += `
                    <td>`;
        }
        result += `<a href="${link}" target="_blank">${title}</a></td>
                    <td>
                        <form action="." method="post">
                            <input type="hidden" name="task" value="${number}">
                            <button type="submit">Edit</button>
                        </form>
                    </td>
                </tr>`;
    }
    result += `
            </table>
        </div>
    </body>\n</html>`;
    return result;
}
function test(data,taskNum) {
    var result = htmlTemplate + `
            <form method="post" action="..">`;
    const i = taskNum;
    const row = data[i];
    const title = safe(row['title']);
    const dependencies = safe(row['dependencies']);
    const steps = safe(row['steps']);
    const expectedresults = safe(row['expectedresults']);
    var scenario = `
                <div class="scenario">
                    <p>Number: ${i+1}<input type="hidden" name="number" value="${i}"></p>
                    <p>Title: <input type="text" name="title" value="${title}" size="45"></p>
                    <p>Pre-Condition/Dependencies:<br /><textarea name="dependencies" rows="5" cols="50">${dependencies}</textarea></p>
                    <p>Steps:<br /><textarea name="steps" rows="5" cols="50">${steps}</textarea></p>
                    <p>Expected Results:<br /><textarea name="expectedresults" rows="5" cols="50">${expectedresults}</textarea></p>`;
    const passed = safe(row['passed']);
    if (passed=='TRUE') {
        scenario += `
                    <p><input type="radio" id="pass" name="passed" value="TRUE" checked> <label for="pass">Pass</label>&nbsp;&nbsp;&nbsp;&nbsp;
                    <input type="radio" id="fail" name="passed" value="FALSE"> <label for="fail">Fail</label></p>`;
    }
    else if (passed=='FALSE') {
        scenario += `
                    <p><input type="radio" id="pass" name="passed" value="TRUE"> <label for="pass">Pass</label>&nbsp;&nbsp;&nbsp;&nbsp;
                    <input type="radio" id="fail" name="passed" value="FALSE" checked> <label for="fail">Fail</label></p>`;
    }
    else {
        scenario += `
                    <p><input type="radio" id="pass" name="passed" value="TRUE"> <label for="pass">Pass</label>&nbsp;&nbsp;&nbsp;&nbsp;
                    <input type="radio" id="fail" name="passed" value="FALSE"> <label for="fail">Fail</label></p>`;
    }
    const actualresults = safe(row['actualresults']);
    scenario += `
                    <p id="actualresults">Actual Results (if failed):<br /><textarea name="actualresults" rows="5" cols="50" class="actualresults">${actualresults}</textarea></p>
                </div>`;
    result += scenario;
    result += `
                <input type="submit" id="save" value="Save">
            </form>
        </div>
    </body>\n</html>`
    return result;
}
function view(data) {
    return "incomplete";
}
function failed(data) {
    return "incomplete";
}
function safe(text) { // prevent html injection
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}