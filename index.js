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
  mongoose = require('mongoose'),
  Models = require('./models.js'),
  Movies = Models.Movie,
  Users = Models.User
const { send } = require('process');





const app = express();
// create a write stream (in append mode)

const { check, validationResult } = require('express-validator');

app.use(express.static('public'));

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

const cors = require('cors');
let allowedOrigins = ['http://localhost:8080', 'http://testsite.com, https://myflixmovieapp-3df5d197457c.herokuapp.com/'];

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
let auth = require('./auth')(app);
const passport = require('passport');
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





app.post('/users',
  // Validation logic here for request
  //you can either use a chain of methods like .not().isEmpty()
  //which means "opposite of isEmpty" in plain english "is not empty"
  //or use .isLength({min: 5}) which means
  //minimum value of 5 characters are only allowed
  [
    check('Username', 'Username is required').isLength({min: 5}),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ], (req, res) => {

  // check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne({ Username: req.body.Username }) // Search to see if a user with the requested username already exists
      .then((user) => {
        if (user) {
          //If the user is found, send a response that it already exists
          return res.status(400).send(req.body.Username + ' already exists');
        } else {
          Users
            .create({
              Username: req.body.Username,
              Password: hashedPassword,
              Email: req.body.Email,
              Birthday: req.body.Birthday
            })
            .then((user) => { res.status(201).json(user) })
            .catch((error) => {
              console.error(error);
              res.status(500).send('Error: ' + error);
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send('Error: ' + error);
      });
  });

//CREATE--adds movie to favoriteMovies
app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { Username, MovieID } = req.params;

    const updatedUser = await Users.findOneAndUpdate(
      { Username },
      { $push: { FavoriteMovies: MovieID } },
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
app.put('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  const { Username } = req.params;
  const { Username: newUsername, Password, Email, Birthdate } = req.body;

  Users.findOneAndUpdate(
    { Username },
    { $set: { Username: newUsername, Password, Email, Birthdate } },
    { new: true }
  )
    .then((updatedUser) => {
      if (!updatedUser) {
        return res.status(404).send('User not found');
      }
      res.json(updatedUser);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
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









//mongoose.connect('mongodb://localhost:27017/cfDB', { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connect(process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });


const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
 console.log('Listening on Port ' + port);
});