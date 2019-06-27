const express = require('express');
const app = express();
app.use(express.urlencoded());

const GoogleSpreadsheet = require('google-spreadsheet');
const { promisify } = require('util');
const creds = require('../google-sheets-node/client_secret.json');

async function accessSpreadsheet() {
    const doc = new GoogleSpreadsheet('1BMPc6UQFxgwS1I6yEHt-RNe241-LmZx1eZEjyzlPLbA');
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[0];
    const rows = await promisify(sheet.getRows)({
        offset: 1,
    })
    console.log(rows);
}
accessSpreadsheet();