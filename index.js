const http = require('http');
const path = require('path');
const fs = require('fs');

const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, 'public', 
    req.url === '/' ? 'index.html' : 
    req.url === '/login' ? 'login.html' : 
    req.url === '/validate' ? 'validate.js' :
    'error.html');
    let extname = path.extname(filePath);
    let contentType = 'text/html';
    switch(extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
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