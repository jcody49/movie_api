const passport = require('passport'),//authentication middleware
  LocalStrategy = require('passport-local').Strategy,
  Models = require('./models.js'),
  passportJWT = require('passport-jwt');

let Users = Models.User, 
  JWTStrategy = passportJWT.Strategy, //assigns jwt strategy from passportJwt module
    ExtractJWT = passportJWT.ExtractJwt; //allows you to specify where the JWT token should be located in the request--params or headers


  //used for authenticating with a username and password stored locally
  passport.use(new LocalStrategy({
    usernameField: 'Username',
    passwordField: 'Password'
  }, (username, password, done) => {
    console.log('Authenticating user: ' + username);
    
    Users.findOne({ Username: username })
      .then(user => {
        if (!user) {
          console.log('User not found: ' + username);
          return done(null, false, { message: 'Incorrect username.' });
        }
        
        if (!user.validatePassword(password)) {
          console.log('Incorrect password for user: ' + username);
          return done(null, false, { message: 'Incorrect password.' });
        }
        
        console.log('User authenticated successfully: ' + username);
        return done(null, user);
      })
      .catch(error => {
        console.log('Error during authentication: ' + error);
        return done(error);
      });
  }));
  
  


//calls jwt strategy
passport.use(new JWTStrategy({
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
  secretOrKey: 'your_jwt_secret'
}, (jwtPayload, callback) => {
  console.log("INSIDE JWT STRATEGY");
  return Users.findById(jwtPayload._id)
    .then((user) => {
      console.log("FOUND USER " + jwtPayload._id);
      return callback(null, user);
    })
    .catch((error) => {
      console.log("CALL ERROR " + error);
      return callback(error)
    });
}));

