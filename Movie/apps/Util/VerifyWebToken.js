var jsonwebtoken = require('jsonwebtoken');
var config = require(global.__basedir + '/Config/Setting.json');

function verifyWebToken(req, res, next) {
    let token = req.cookies.token;
    
    if (!token && req.headers['authorization']) {
        var temp = req.headers['authorization'].split(" ");
        if(temp.length >= 2){
            token = temp[1];
        }
    }

    if (!token) {
        return res.redirect('/auth/login');
    }

    try {
        const decoded = jsonwebtoken.verify(token, config.jwt.secret);
        req.userData = {
            user: decoded.user,
            email: decoded.user,
            role: decoded.role,
            name: decoded.name
        };
        next();
    } catch (err) {
        return res.redirect('/auth/login');
    }
}

module.exports = verifyWebToken;
