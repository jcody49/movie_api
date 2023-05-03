const express = require('express'),
  morgan = require('morgan'),
  fs = require('fs'), // import built in node modules fs and path 
  path = require('path'),
  lodash = require('lodash'),
  bodyParser = require('body-parser');

const app = express();
// create a write stream (in append mode)

app.use(express.static('public'));



// a ‘log.txt’ file is created in root directory
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {flags: 'a'});




const topTenMovies = [
    { title: 'The Royal Tenenbaums', director: 'Wes Anderson', year: 2001 },
    { title: 'The Shawshank Redemption', director: 'Frank Darabont', year: 1994 },
    { title: 'Star Wars: Episode II: Attack of the Clones', director: 'George Lucas', year: 2002 },
    { title: 'Star Wars: Episode VI: Return of the Jedi', director: 'Richard Marquand', year: 1983 },
    { title: 'Star Wars: Episode III: Revenge of the Sith', director: 'George Lucas', year: 2005 },
    { title: 'Star Wars: Episode V: The Empire Strikes Back', director: 'Irvin Kershner', year: 1980 },
    { title: 'The Lord of the Rings: The Return of the King', director: 'Peter Jackson', year: 2003 },
    { title: 'Good Fellas', director: 'Martin Scorsese', year: 1990 },
    { title: 'The Lord of the Rings: The Fellowship of the Rings', director: 'Peter Jackson', year: 2001 },
    { title: 'The Lord of the Rings: The Two Towers', director: 'David Fincher', year: 2002 }
];





// setup the logger
app.use(morgan('combined', {stream: accessLogStream}));

// Log errors to the terminal
app.use(morgan('combined', {
    skip: function (req, res) { return res.statusCode < 400 },
    stream: process.stderr
}));


app.get('/movies', (req, res) => {
    res.json(topTenMovies);
});

app.get('/', (req, res) => {
  res.send('Greetings! And, welcome to my movie database.');
});

app.listen(8080, () => {
  console.log('Your app is listening on port 8080.');
});