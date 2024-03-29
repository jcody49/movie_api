const mongoose = require('mongoose');//queries mongo db
const bcrypt = require('bcrypt');//handles hashing


/**
 * Defines and structures a movie schema.
 * @typedef {Object} MovieSchema
 * @property {string} Title - The title of the movie. Required.
 * @property {string} Description - A description of the movie. Required.
 * @property {Object} Genre - The genre of the movie.
 * @property {string} Genre.Name - The name of the genre.
 * @property {string} Genre.Description - The description of the genre.
 * @property {Object} Director - The director of the movie.
 * @property {string} Director.Name - The name of the director.
 * @property {string} Director.Bio - The biography of the director.
 * @property {string[]} Actors - An array of actor names.
 * @property {string} ImagePath - The path to the movie's image.
 * @property {boolean} Featured - Indicates if the movie is featured.
 */
let movieSchema = mongoose.Schema({
    Title: {type: String, required: true},
    Description: {type: String, required: true},
    Genre: {
        Name: String,
        Description: String
    },
    Director: {
        Name: String,
        Bio: String
    },
    Actors: [String],
    ImagePath: String,
    Featured: Boolean
});

/**
 * Defines and structures a user schema.
 * @typedef {Object} UserSchema
 * @property {string} Username - The username of the user. Required.
 * @property {string} Password - The hashed password of the user. Required.
 * @property {string} Email - The email address of the user. Required.
 * @property {Date} Birthdate - The birthdate of the user.
 * @property {mongoose.Types.ObjectId[]} FavoriteMovies - An array of movie IDs representing the user's favorite movies.
 * @property {mongoose.Types.ObjectId[]} MoviesToWatch - An array of movie IDs representing the movies the user wants to watch.
 */
let userSchema = mongoose.Schema({
    Username: {type: String, required: true},
    Password: {type: String, required: true},
    Email: {type: String, required: true},
    Birthdate: Date,
    FavoriteMovies: [{type: mongoose.Schema.Types.ObjectId, ref: "Movie"}],
    MoviesToWatch: [{type: mongoose.Schema.Types.ObjectId, ref: "Movie"}]
});

/**
 * Hashes the provided password using bcrypt.
 * @function
 * @param {string} password - The password to be hashed.
 * @returns {string} - The hashed password.
 */
userSchema.statics.hashPassword = (password) => {
    return bcrypt.hashSync(password, 10);
};

/**
 * Validates a password by comparing it to the hashed password stored in the user schema.
 * @method
 * @param {string} password - The password to be validated.
 * @returns {boolean} - `true` if the password is valid, `false` otherwise.
 */
userSchema.methods.validatePassword = function(password) {
    return bcrypt.compareSync(password, this.Password);
};

/**
 * Represents a Movie model for MongoDB.
 * @type {mongoose.Model}
 */
let Movie = mongoose.model('Movie', movieSchema);
/**
 * Represents a User model for MongoDB.
 * @type {mongoose.Model}
 */
let User = mongoose.model('User', userSchema);

//exports models
module.exports.Movie = Movie;
module.exports.User = User;
