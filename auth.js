const jwtSecret = 'your_jwt_secret'; // This has to be the same key used in the JWTStrategy

const jwt = require('jsonwebtoken'),
  passport = require('passport');

require('./passport'); // Your local passport file

//defines function for creating a jwt
let generateJWTToken = (user) => {
  return jwt.sign(user, jwtSecret, {
    subject: user.Username, // This is the username you’re encoding in the JWT
    expiresIn: '7d', // This specifies that the token will expire in 7 days
    algorithm: 'HS256' // This is the algorithm used to “sign” or encode the values of the JWT
  });
}


/* POST login.*/ 
module.exports = (router) => { //exports a function that handles HTTP POST requests to the /login path--the router object is an Express tool
  router.post('/login', (req, res) => {
    passport.authenticate('local', { session: false }, (error, user, info) => { //passport is to use the localStrategy to authenticate
      console.log('error' + error);
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
