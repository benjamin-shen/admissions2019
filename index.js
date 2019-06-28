const http = require('http');
const path = require('path');
const fs = require('fs');
const auth = require('http-auth');
const basic = auth.basic({
    file: "pw.htpasswd",
});

const server = http.createServer(basic, (req, res) => {
    let filePath = path.join(__dirname, 'public', 
    req.url === '/' ? 'index.html' : 
    req.url === '/test' ? 'test.html' : 
    req.url === '/sheets' ? 'sheets.html' : 
    'error.html');
    let extname = path.extname(filePath);
    var contentType = 'text/plain';
    switch(extname) {
        case '.html':
            contentType = 'text/html';
            break;
        case '.php':
            contentType = 'text/html';
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
    accessSpreadsheet();
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


const GoogleSpreadsheet = require('google-spreadsheet');
const { promisify } = require('util');
const creds = require('./google-sheets-node/client_secret.json');

async function accessSpreadsheet() {
    const doc = new GoogleSpreadsheet('1BMPc6UQFxgwS1I6yEHt-RNe241-LmZx1eZEjyzlPLbA');
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[0];
    const rows = await promisify(sheet.getRows)({
        offset: 1,
    });
    fs.writeFile('public/sheets.html', JSON.stringify(rows), function(err) {
        if(err) throw err;
    });
}
setTimeout(accessSpreadsheet, 60000)