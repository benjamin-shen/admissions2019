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
    if(req.method == 'POST') {
        processPost(req, res, function() {
            var data = req.post;
            updateSpreadsheet(data);
        });
    }
    let filePath = path.join(__dirname, 'public', 
    req.url === '/' ? 'index.html' : 
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
    setTimeout(readSpreadsheet, 3000);
    fs.readFile(filePath, (err, content) => {
        if (err) throw err;
        res.writeHead(200, {'Content-Type': contentType});
        res.end(content);
    });
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
    fs.writeFile('public/test.html', testHTML(rows), function(err) {
        if(err) throw err;
    });
    fs.writeFile('public/view.html', view(rows), function(err) {
        if(err) throw err;
    });
    fs.writeFile('public/failed.html', viewFailed(rows), function(err) {
        if(err) throw err;
    });
}
async function updateSpreadsheet(data) {
    const doc = new GoogleSpreadsheet('1BMPc6UQFxgwS1I6yEHt-RNe241-LmZx1eZEjyzlPLbA');
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[0];
    sheet.getCells({
        'min-row': 2,
        'min-col': 2,
        'return-empty': true,
    }, function(err, cells) {
        if(err) throw err;
        var j=0;
        for(var i=0; i<cells.length; i+=6) {
            cells[i].value = data['title'][i];
            cells[i+1].value = data['dependencies'][i];
            cells[i+2].value = data['steps'][i];
            cells[i+3].value = data['expectedresults'][i];
            if(data[`passed${j}`]!=null) {
                cells[i+4].value = data[`passed${j}`];
            }
            cells[i+5].value = data['actualresults'][i];
            j++;
        }
        sheet.bulkUpdateCells(cells);
    })
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
            <p id="alert">Please save frequently! Click the header to reload the page.</p>`;
function testHTML(data) {
    var result = htmlTemplate + `
            <form method="post" action="..">`;
    for(var i=0; i<data.length; i++) {
        const row = data[i];
        const title = safe(row['title']);
        const dependencies = safe(row['dependencies']);
        const steps = safe(row['steps']);
        const expectedresults = safe(row['expectedresults']);
        var scenario = `
                <div class="scenario">
                    <p>Number: ${i+1}</p>
                    <p>Title: <input type="text" name="title" value="${title}" size="45"></p>
                    <p>Pre-Condition/Dependencies:<br /><textarea name="dependencies" rows="5" cols="50">${dependencies}</textarea></p>
                    <p>Steps:<br /><textarea name="steps" rows="5" cols="50">${steps}</textarea></p>
                    <p>Expected Results:<br /><textarea name="expectedresults" rows="5" cols="50">${expectedresults}</textarea></p>`;
        const passed = safe(row['passed']);
        if (passed=='TRUE') {
            scenario += `
                    <p><input type="radio" id="pass${i}" name="passed${i}" value="TRUE" checked> <label for="pass${i}">Pass</label>&nbsp;&nbsp;&nbsp;&nbsp;
                    <input type="radio" id="fail${i}" name="passed${i}" value="FALSE"> <label for="fail${i}">Fail</label></p>`;
        }
        else if (passed=='FALSE') {
            scenario += `
                    <p><input type="radio" id="pass${i}" name="passed${i}" value="TRUE"> <label for="pass${i}">Pass</label>&nbsp;&nbsp;&nbsp;&nbsp;
                    <input type="radio" id="fail${i}" name="passed${i}" value="FALSE" checked> <label for="fail${i}">Fail</label></p>`;
        }
        else {
            scenario += `
                    <p><input type="radio" id="pass${i}" name="passed${i}" value="TRUE"> <label for="pass${i}">Pass</label>&nbsp;&nbsp;&nbsp;&nbsp;
                    <input type="radio" id="fail${i}" name="passed${i}" value="FALSE"> <label for="fail${i}">Fail</label></p>`;
        }
        const actualresults = safe(row['actualresults']);
        scenario += `
                    <p id="actualresults${i}" style="display:hidden">Actual Results (if failed):<br /><textarea name="actualresults" rows="5" cols="50" class="actualresults">${actualresults}</textarea></p>
                </div>`;
        result += scenario;
    }
    result += `
                <input type="submit" id="save" value="Save">
            </form>
        </div>
    </body>\n</html>`
    return result;
}
function view(data) {
    var result = htmlTemplate;
    return result;
}
function viewFailed(data) {
    return "incomplete";
}
function safe(text) { // prevent html injection
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}