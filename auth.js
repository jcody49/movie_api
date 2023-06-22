const jwtSecret = 'your_jwt_secret';

const jwt = require('jsonwebtoken'),
    passport = require('passport');

require('./passport'); //local passport file

let = generateJWTToken = (user) => {
    return jwt.sign(user, jwtSecret, {
        subject: user.Username, //the username getting encoded in the JWT
        expiresIn: '7d', //specifies when token expires
        algorithm: 'HS256' //Algorithm for signing/encoding values of the JWT
    });
}

/* POST login. */
module.exports = (router) => {
    router.post('/login', (req, res) => {
        passport.authenticate('local', { session: false}, (error, user, info) => {
            if (error || !user) {
                return res.status(400).json({
                    message: 'Something is not right, old chap',
                    user: user
                });
            }
            req.login(user, { session: false}, (error) => {
                if (error) {
                    res.send(error);
                }
                let token = generateJWTToken(user.toJSON());
                return res.json({ user, token});
            });
        })(req, res);
    });
} 

