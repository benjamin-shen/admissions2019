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
            const row = {
                number: data['name'],
            }
            updateSpreadsheet(row);
        });
    }
    readSpreadsheet();
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
    fs.writeFile('public/view.html', viewHTML(rows), function(err) {
        if(err) throw err;
    });
}
async function updateSpreadsheet(row) {
    const doc = new GoogleSpreadsheet('1BMPc6UQFxgwS1I6yEHt-RNe241-LmZx1eZEjyzlPLbA');
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[0];
    const rows = await promisify(sheet.addRow)(row);
    return true;
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
                font-family: Calibri, Arial, sans-serif;
                font-size: 16px;
            }
            h1 {
                font-family: 'Trebuchet MS', 'Lucida Sans', sans-serif;
                font-size: 36px;
                text-align: center;
                background: #eeeeee;
                padding: 10px 0px;
                width: 100%;
            }
            p {
                margin: 5px;
            }
            a {
                color: inherit;
                text-decoration: none;
            }
            a:hover {
                cursor: pointer;
            }
            textarea {
                vertical-align: middle;
            }
            .scenario {
                margin: 10px 15px;
                padding: 9px;
                width: calc(100% - 50px);
                border: 1px solid black;
                border-radius: 5px;
            }
            #container {
                display: inline-block;
                min-width: 100%;
            }
            #alert {
                text-align: center;
            }
            #save {
                display: block;
                margin: 0px auto 10px auto;
                padding: 5px 10px;
                border: none;
                border-radius: 10px;
                font-size: 18px;
            }
        </style>
    </head>
    <body>
        <div id="container">
            <a href="/"><h1>Project Testing</h1></a>
            <p id="alert">Please save frequently! Click the header to reload the page.</p>`;
function testHTML(data) {
    var result = htmlTemplate + `
            <form method="post" action="..">`;
    for(var i=0; i<data.length; i++) {
        const row = data[i];
        const title = row['title'].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const dependencies = row['dependencies'].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const steps = row['steps'].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const expectedresults = row['expectedresults'].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        //const title = row['title'].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        //const title = row['title'].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        var scenario = `
                <div class="scenario">
                    <p>Number: ${i+1}</p>
                    <p>Title: <input type="text" name="title${i}" value="${title}"></p>
                    <p>Pre-Condition/Dependencies: <input type="text" name="dependencies${i}" value="${dependencies}"></p>
                    <p>Steps: <textarea name="steps${i}" rows="5" cols="50">${steps}</textarea></p>
                    <p>Expected Results: <textarea name="expectedresults${i}" rows="5" cols="50">${expectedresults}</textarea></p>
                    <p><input type="radio" id="pass${i}" name="pass/fail${i}"> <label for="pass${i}">Pass</label><br />
                    <input type="radio" id="fail${i}" name="pass/fail${i}"> <label for="fail${i}">Fail</label></p>
                    <p id="actualresults${i}"></p>
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
function viewHTML(data) {
    var result = htmlTemplate;
    return result;
}