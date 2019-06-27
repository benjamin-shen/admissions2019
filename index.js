const http = require('http');
const path = require('path');
const fs = require('fs');
var auth = require('http-auth');
var basic = auth.basic({
    file: "pw.htpasswd",
});

const server = http.createServer(basic, (req, res) => {
    let filePath = path.join(__dirname, 'public', 
    req.url === '/' ? 'index.html' : 
    req.url === '/test' ? 'test.html' : 
    req.url === '/save' ? 'save.php' : 
    'error.html');
    let extname = path.extname(filePath);
    var contentType = 'text/plain';
    switch(extname) {
        case '.html':
            contentType = 'text/html';
            break;
        case '.php':
            contentType = 'text/php';
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