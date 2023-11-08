/**
 * Secret key used for JWT (JSON Web Token) encoding.
 * @type {string}
 */
const jwtSecret = 'your_jwt_secret'; // This has to be the same key used in the JWTStrategy

const jwt = require('jsonwebtoken'),
  passport = require('passport');

require('./passport'); // local passport file


/**
 * Generates a JWT (JSON Web Token) for the given user.
 *
 * @param {Object} user - The user object to be encoded in the JWT.
 * @returns {string} The JWT token.
 */
let generateJWTToken = (user) => {
  return jwt.sign(user, process.env.JWT_SECRET, {
    subject: user.Username, // This is the username you’re encoding in the JWT
    expiresIn: '7d', // This specifies that the token will expire in 7 days
    algorithm: 'HS256' // This is the algorithm used to “sign” or encode the values of the JWT
  });
}


/**
 * Generates a JWT (JSON Web Token) for the given user.
 *
 * @param {Object} user - The user object to be encoded in the JWT.
 * @returns {string} The JWT token.
 *//*
let generateJWTToken = (user) => {
  return jwt.sign(user, jwtSecret, {
    subject: user.Username, // This is the username you’re encoding in the JWT
    expiresIn: '7d', // This specifies that the token will expire in 7 days
    algorithm: 'HS256' // This is the algorithm used to “sign” or encode the values of the JWT
  });
}
*/

/**
 * Handles HTTP POST requests to the /login path.
 *
 * @param {Object} router - The Express router object.
 */
module.exports = (router) => { //exports a function that handles HTTP POST requests to the /login path--the router object is an Express tool
  router.post('/login', (req, res) => {
    passport.authenticate('local', { session: false }, (error, user, info) => { //passport is to use the localStrategy to authenticate
      console.log('error', error);
      if (error || !user) {
        return res.status(400).json({
          error: 'Error is: ' + error,
          user: 'Cannot find the user: ' + user,
        });
      }
      req.login(user, { session: false }, (error) => {
        if (error) {
          res.send(error);
        }
        let token = generateJWTToken(user.toJSON()); //grants jwt if login is successful
        return res.json({ user, token });
      });
    })(req, res);
  });
}
