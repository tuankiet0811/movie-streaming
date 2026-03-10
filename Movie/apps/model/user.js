class User {
    _id;
    email;
    password;
    name;
    role;
    constructor(email, password, name, role = "user") {
        this.email = email;
        this.password = password;
        this.name = name;
        this.role = role;
    }
}
module.exports = User;
