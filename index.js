// integrates modules and packages
const express = require('express'),
  morgan = require('morgan'),
  fs = require('fs'), // import built in node modules fs and path 
  path = require('path'),
  nodemon = require('nodemon'),
  lodash = require('lodash'),
  bodyParser = require('body-parser');
  uuid = require('uuid');
const { send } = require('process');

const app = express();
// create a write stream (in append mode)

app.use(express.static('public'));

app.use(bodyParser.json());


// a ‘log.txt’ file is created in root directory
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {flags: 'a'});



//defines users
let users = [
  {
    id: 1,
    name: "Erica Allen",
    favoriteMovies: "Lord of the Rings: The Fellowship of the Ring"
  },
  {
    id: 2,
    name: "Matt Cody",
    favoriteMovies: []
  },
  {
    id: 3,
    name: "Stieg",
    favoriteMovies: []
  },
]


//Defines all movies
let movies = [
  {
    "Title": "Star Wars",
    "Description": "",
    "Genre": {
      "Name": "Cool", 
      "Description": ""

    },
    "Director": {
      "Name":"Hingle McCringleberry",
      "Bio": "",
      "Birth": ""
    },
    "ImageURL":"",
    "Featured": false 
  },
  {
    "Title": "The Royal Tenenbaums",
    "Description": "",
    "Genre": {
      "Name": "Drama", 
      "Description": ""

    },
    "Director": {
      "Name":"Wes Anderson",
      "Bio": "",
      "Birth": ""
    },
    "ImageURL":"",
    "Featured": false 
  },
]





// setup the logger
app.use(morgan('combined', {stream: accessLogStream}));

// Log errors to the terminal
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});




//CREATE--register new user
app.post('/users', (req, res) => {
  const newUser = req.body;

  if (newUser.name) {
    newUser.id = uuid.v4();
    users.push(newUser);
    res.status(201).json(newUser)
  } else {
    res.status(400).send('users need names')
  }
})


//UPDATE--updates user info
app.put('/users/:id', (req,res) => {
  const { id } = req.params;
  const updatedUser = req.body;

  let user = users.find(user => user.id == id);

  if (user) {
    user.name = updatedUser.name;
    res.status(200).json(user);   
  } else{
    res.status(400).send('no such user')
  }
})

//CREATE--adds movie to favoriteMovies
app.post('/users/:id/:movieTitle', (req, res) => {
  const { id, movieTitle } = req.params;

  let user = users.find(user => user.id == id);

  if (user) {
    user.favoriteMovies.push(movieTitle);
    res.status(200).send(`${movieTitle} has been added to user ${id}'s array`);
  } else{
    res.status(400).send('no such user')
  }
})


//DELETE--deletes movie from favoriteMovies
app.delete('/users/:id/:movieTitle', (req, res) => {
  const { id, movieTitle } = req.params;

  let user = users.find(user => user.id == id);

  if (user) {
    user.favoriteMovies = user.favoriteMovies.filter(title => title !== movieTitle);
    res.status(200).send(`${movieTitle} has been removed from user ${id}s array`);;
  } else{
    res.status(400).send('no such user')
  }
})


//DELETE--unregisters user
app.delete('/users/:id/', (req, res) => {
  const { id } = req.params;

  let user = users.find(user => user.id == id);

  if (user) {
    users = users.filter( user => user.id != id);
    res.status(200).send(`user ${id} has been removed`);
  } else{
    res.status(400).send('no such user')
  }
})




//READ--get all movies
app.get('/movies', (req, res) => {
    res.status(200).json(movies);
})

//READ--get movie by title
app.get('/movies/:title', (req, res) => {
  const { title } = req.params;
  const movie = movies.find( movie => movie.Title === title);

  if (movie) {
    res.status(200).json(movie);
  } else {
    res.status(400).send('No such movie')
  }
})

//READ--get genre of a movie
app.get('/movies/genre/:genreName', (req, res) => {
  const { genreName } = req.params;
  const genre = movies.find( movie => movie.Genre.Name === genreName).Genre;

  if (genre) {
    res.status(200).json(genre);
  } else {
    res.status(400).send('No such genre; you made that up dude...')
  }
})


//READ--get data about a director
app.get('/movies/directors/:directorName', (req, res) => {
  const { directorName } = req.params;
  const director = movies.find( movie => movie.Director.Name === directorName).Director;

  if (director) {
    res.status(200).json(director);
  } else {
    res.status(400).send('No such director; you made that up dude...')
  }
})



app.listen(8080, () => {
  console.log('Your app is listening on port 8080.');
});