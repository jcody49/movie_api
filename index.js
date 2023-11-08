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

/**
 * The Express application for handling server requests and responses.
 * @type {express.Application}
 */
const app = express();



//Integrates Express Validator to perform checks that data inputs have met all requirements
const { check, validationResult } = require('express-validator');

//Configures Express to serve files in the public directory
app.use(express.static('public'));



//app.use(express.static(path.join(__dirname, 'myFlix-client')));




//Integrates bodyParser to parse request bodies
app.use(bodyParser.json());

//Parses URLs in an encoded format
app.use(bodyParser.urlencoded({ extended: true }));

//Integrates cross origin resource sharing--mult sources can access db 
const cors = require('cors');
let allowedOrigins = ['http://localhost:8080', 'http://testsite.com', 'http://localhost:1234', 'https://myflixmovieapp-3df5d197457c.herokuapp.com', 'http://localhost:54305', 'https://myflixmoviepix.netlify.app'];



app.use(cors())
//calls cors--disallows unknown sources, permits known sources
/*
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
*/
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




// API routes...

/**
 * Registers a new user.
 * @name POST /users
 * @function
 * @async
 * @param {string} Username - The username of the user. Required.
 * @param {string} Password - The password of the user. Required.
 * @param {string} Email - The email address of the user. Required.
 * @param {Date} Birthdate - The birthdate of the user.
 * @returns {Object} The registered user.
 */
app.post('/users',
  [ //validates data--must meet these requirements
    check('Username', 'Username is required').isLength({ min: 5 }),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ], async (req, res) => {//async promise 
    try {
      let errors = validationResult(req);//the occuring validation result will show how many errors
      ////
      if (!errors.isEmpty()) {
        // Check for the specific error related to the username length
        const usernameError = errors.array().find(error => error.param === 'Username');
        const passwordError = errors.array().find(error => error.param === 'Password');
        if (usernameError) {
          return res.status(422).json({ error: 'Username must be at least 5 characters' });
        }
        if (passwordError) {
          return res.status(422).json({ error: 'Password must contain only alphanumeric characters' }); 
        }
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

/**
 * Adds a movie to a user's list of favorite movies.
 * @name POST /users/:Username/movies/:MovieID/favorites
 * @function
 * @async
 * @param {string} Username - The username of the user.
 * @param {string} MovieID - The ID of the movie to add to favorites.
 * @returns {Object} The updated user object.
 */
app.post('/users/:Username/movies/:MovieID/favorites', passport.authenticate('jwt', { session: false }), async (req, res) => {
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

// Adding a movie to the user's MoviesToWatch list
/**
 * Adds a movie to the user watchlist
 * @name POST
 * @function
 * @async
 * @param {String} Username
 * @param {String} MovieID
 * @returns {Object} The updated user object
 */
app.post('/users/:Username/:MovieID/watchlist', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { Username, MovieID } = req.params;
    console.log("INSIDE POST REQUEST");
    const updatedUser = await Users.findOneAndUpdate(
      { Username },
      { $addToSet: { MoviesToWatch: MovieID } }, // Use $addToSet to prevent duplicates
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


/**
 * Deletes a movie from a user's list of favorite movies.
 * @name DELETE /users/:userName/movies/:MovieID/favorites
 * @function
 * @param {string} userName - The username of the user.
 * @param {string} MovieID - The ID of the movie to remove from favorites.
 * @returns {Object} The updated user object.
 */
app.delete(
  '/users/:userName/movies/:MovieID/favorites', passport.authenticate('jwt', { session: false }), 
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


/**
 * Deletes a movie from a user's watchlist.
 * @name DELETE /users/:userName/movies/:MovieID/watchlist
 * @function
 * @param {string} userName - The username of the user.
 * @param {string} MovieID - The ID of the movie to remove from watchlist.
 * @returns {Object} The updated user object.
 */
app.delete(
  '/users/:userName/movies/:MovieID/watchlist', passport.authenticate('jwt', { session: false }), 
  (req, res) => {
    Users.findOneAndUpdate(
      { Username: req.params.userName },
      {
        $pull: { MoviesToWatch: req.params.MovieID }
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

/**
 * Updates a user's information.
 *
 * @name PUT /users/:Username
 * @function
 * @param {string} Username - The username of the user.
 * @param {Object} req.body - The request body containing updated user information.
 * @param {string} req.body.Username - The new username for the user.
 * @param {string} req.body.Password - The new hashed password for the user.
 * @param {string} req.body.Email - The new email address for the user.
 * @param {Date} req.body.Birthdate - The new birthdate for the user.
 * @returns {Object} The updated user object.
 */
app.put('/users/:Username', passport.authenticate('jwt', { session: false }),
  [
    check('Username', 'Username is required').isLength({ min: 5 }),
    check('Username', 'Username contains non-alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ], (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOneAndUpdate(
      { Username: req.params.Username },
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







/**
 * Deletes a user.
 * @name DELETE /users/:Username
 * @function
 * @param {string} userName - The username of the user.
 * @returns {Object} The updated user object.
 */
app.delete('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndRemove({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(400).json({message: req.params.Username + ' was not found'});
      } else {
        res.status(200).json({ message: req.params.Username + ' was deleted.'});
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});






/**
 * Get all users
 * @name GET /users
 * @function
 * @returns all user objects
 */
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

/**
 * Get a user by username
 * @name GET /users/:Username
 * @function
 * @param {string} Username
 * @returns returns user object
 */
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


/**
 * Get all movies
 * @name GET /moves
 * @function
 * @returns all user movie objects
 */
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

/**
 * Get a movie by title
 * @name GET /movies/:title
 * @function
 * @param {string} Title
 * @returns returns movie object
 */
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



/**
 * Get movies by genre
 * @name GET /movies/genre/:genreName
 * @function
 * @param {string} Genre
 * @param {string} genreName
 * @returns returns movie objects that pertain to the genre
 */
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

/**
 * Retrieves information about a director by their name.
 *
 * @name GET /movies/directors/:directorName
 * @function
 * @param {string} directorName - The name of the director.
 * @returns {Object} The director's information or a 404 response if the director is not found.
 */
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

/*
app.get('/', (req, res) => {
  res.send('Greetings! And, welcome to my movie database.');
  res.send(console.log());
});
*/

// Start the server

const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
 console.log('Listening on Port ' + port);
});

