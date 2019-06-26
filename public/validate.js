const aws = require('aws-sdk');

function validate(form) {
    var pwd = form.pwd.value;
    if (pwd == process.env.PASSWORD) {
        alert('nice');
    } else {
        alert('Wrong Password');
    }
}