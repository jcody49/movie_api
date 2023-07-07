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
  }, (username, password, done) => { //"done" indicates the outcome of the authentication
      console.log(username + '  ' + password);
    
    Users.findOne({ Username: username })
      .then(user => {
          if (!user) {
              console.log('incorrect username');
              return done(null, false, { message: 'Incorrect username.' }); //returns error if username already exists
          }
          
          if (!user.validatePassword(password)) {
              console.log('incorrect password');
              return done(null, false, { message: 'Incorrect password.' });
          }
          
          console.log('finished');
          return done(null, user);
      })
      .catch(error => {
          console.log(error);
          return done(error);
      });
  }));
  


//calls jwt strategy
passport.use(new JWTStrategy({
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
  secretOrKey: 'your_jwt_secret'
}, (jwtPayload, callback) => {
  return Users.findById(jwtPayload._id)
    .then((user) => {
      return callback(null, user);
    })
    .catch((error) => {
      return callback(error)
    });
}));

