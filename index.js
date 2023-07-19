// integrates modules and packages
const express = require('express'),
  morgan = require('morgan'),
  fs = require('fs'), // import built in node modules fs and path 
  path = require('path'),
  nodemon = require('nodemon'),
  lodash = require('lodash'),
  bodyParser = require('body-parser'),
  uuid = require('uuid'),
  mongodb = require('mongodb'),
  mongoose = require('mongoose'),// logic for whole server enpoints
  Models = require('./models.js'),// logic for whole server enpoints
  Movies = Models.Movie,// logic for whole server enpoints
  Users = Models.User// logic for whole server enpoints
const { send } = require('process');


//local connection
//mongoose.connect('mongodb://localhost:27017/cfDB', { useNewUrlParser: true, useUnifiedTopology: true });



//port
mongoose.connect(process.env.CONNECTION_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});

//creates a new Express app object that can be used to configure request methods
const app = express();



//Integrates Express Validator to perform checks that data inputs have met all requirements
const { check, validationResult } = require('express-validator');

//Configures Express to serve files in the public directory
app.use(express.static('public'));


//Integrates bodyParser to parse request bodies
app.use(bodyParser.json());

//Parses URLs in an encoded format
app.use(bodyParser.urlencoded({ extended: true }));

//Integrates cross origin resource sharing--mult sources can access db 
const cors = require('cors');
let allowedOrigins = ['http://localhost:8080', 'http://testsite.com', 'http://localhost:1234', 'http://localhost:9940'];


//calls cors--disallows unknown sources, permits known sources
app.use(cors({
  origin: (origin, callback) => {
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){ // If a specific origin isn’t found on the list of allowed origins
      let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
      return callback(new Error(message ), false);
    }
    return callback(null, true);
  }
}));
//implements auth.js and passport files and their authentication code
let auth = require('./auth')(app);
const passport = require('passport');//authentication middleware
require('./passport');





// a ‘log.txt’ file is created in root directory
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {flags: 'a'});



// setup the logger
app.use(morgan('combined', {stream: accessLogStream}));

// Log errors to the terminal
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});




//CREATE--registers new user 
app.post('/users',
  [ //validates data--must meet these requirements
    check('Username', 'Username is required').isLength({ min: 5 }),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ], async (req, res) => {//async promise 
    try {
      let errors = validationResult(req);//the occuring validation result will show how many errors

      if (!errors.isEmpty()) {//if there are errors with the array of requirements...
        return res.status(422).json({ errors: errors.array() });
      }

      let hashedPassword = await Users.hashPassword(req.body.Password);//hashes password and creates a variable for it
      let user = await Users.findOne({ Username: req.body.Username });//finds user in db

      if (user) {
        return res.status(400).send(req.body.Username + ' already exists');//returns error if the user already exists
      } else {//otherwise, a new user will be registered--must be in the format below
        user = await Users.create({
          Username: req.body.Username,
          Password: hashedPassword,
          Email: req.body.Email,
          Birthdate: req.body.Birthdate
        });

        res.status(201).json(user);//if user is created successfully,201 will result
      }
    } catch (error) {//if the user is unable to be created, 500 will be returned
      console.error(error);
      res.status(500).send('Error: ' + error);
    }
});

//CREATE--adds movie to favoriteMovies
app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { Username, MovieID } = req.params; //extracts specific objects within a request and assigns them as variables

    const updatedUser = await Users.findOneAndUpdate( //defines the updated user's favorite movies
      { Username },//searches for user by username
      { $push: { FavoriteMovies: MovieID } },//pushes movie to favoriteMovies by MovieID
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).send('User not found');
    }

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error: ' + error);
  }
});



// UPDATE--Update a user's info, by username
/* We’ll expect JSON in this format
{
  Username: String, (required)
  Password: String, (required)
  Email: String, (required)
  Birthday: Date
}*/

app.put('/users/:Username', passport.authenticate('jwt', { session: false }),
  [
    check('Username', 'Username is required').isLength({ min: 5 }),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ], (req, res) => {
    let errors = validationResult(req);
    let hashedPassword = Users.hashPassword(req.body.password);
    Users.findOneAndUpdate(
      { username: req.params.username },
      {
        $set: {
          Username: req.body.Username,
          Password: hashedPassword,
          Email: req.body.Email,
          Birthdate: req.body.Birthdate
        },
      },
      { new: true }
    )
      .then((user) => {
        if (!user) {
          return res.status(404).send('Error: No user was found');
        } else {
          res.json(user);
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
});



//DELETE--deletes movie from favoriteMovies
app.delete(
  '/users/:userName/movies/:MovieID', passport.authenticate('jwt', { session: false }), 
  (req, res) => {
    Users.findOneAndUpdate(
      { Username: req.params.userName },
      {
        $pull: { FavoriteMovies: req.params.MovieID }
      },
      { new: true }
    )
      .then((updatedUser) => {
        if (!updatedUser) {
          return res.status(404).send("Error: User doesn't exist");
        } else {
          res.json(updatedUser);
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  }
);



//DELETE--unregisters user
app.delete('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndRemove({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.Username + ' was not found');
      } else {
        res.status(200).send(req.params.Username + ' was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});





//READ--Get all users
app.get('/users', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.find()
  .then((users) => {
    res.status(201).json(users);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  });
});

//READ--Get a user by username
app.get('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOne({ Username: req.params.Username })
  .then((user) => {
    res.json(user);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  });
});


//READ--get all movies
app.get('/movies', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.find()
    .then((movies) => {
      res.status(200).json(movies);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Internal server error');
    });
});

//READ--get movie by title
app.get('/movies/:title', passport.authenticate('jwt', { session: false }), (req, res) => {
  const { title } = req.params;
  Movies.findOne({ Title: title })
    .then((movie) => {
      if (movie) {
        res.status(200).json(movie);
      } else {
        res.status(404).send('Movie not found');
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Internal server error');
    });
});

//READ--get movies by genre
app.get('/movies/genre/:genreName', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.find({ 'Genre.Name': req.params.genreName })
    .then((movies) => {
      res.status(200).json(movies);
    })
    .catch((err) => {
      res.status(500).send('Error: ' + err);
    });
  }  
);



//READ--get data about a director
app.get('/movies/directors/:directorName', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.findOne({ 'Director.Name': req.params.directorName })
    .select('Director') // Select the entire Director object
    .then((movie) => {
      if (movie && movie.Director) {
        res.status(200).json(movie.Director);
      } else {
        res.status(404).send('Director not found');
      }
    })
    .catch((err) => {
      res.status(500).send('Error: ' + err);
    });
});




const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
 console.log('Listening on Port ' + port);
});

