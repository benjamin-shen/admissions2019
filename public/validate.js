function validate(form) {
    var pwd = form.pwd.value;
    if (pwd == process.env.PORT) {
        alert('nice');
    } else {
        alert('Wrong Password');
    }
}