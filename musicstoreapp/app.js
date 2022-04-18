let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');

let indexRouter = require('./routes/index');

let app = express();

let expressSession = require('express-session');
app.use(expressSession({
    secret: 'abcdefg',
    resave: true,
    saveUninitialized: true
}));

let crypto = require('crypto');

let fileUpload = require('express-fileupload');
app.use(fileUpload({
    limits: {fileSize: 50 * 1024 * 1024},
    createParentPath: true
}));
app.set('uploadPath', __dirname)
app.set('clave', 'abcdefg');
app.set('crypto', crypto);

let bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

//Conexión mongodb
const {MongoClient} = require("mongodb");
const url = 'mongodb+srv://uo277306:Chocolatina.@tiendamusica.cu9is.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
app.set('connectionStrings', url);

const userSessionRouter = require('./routes/userSessionRouter');
app.use("/songs/add", userSessionRouter);
app.use("/publications", userSessionRouter);
app.use("/shop", userSessionRouter)
app.use("/songs/buy", userSessionRouter);
app.use("/purchases", userSessionRouter);


const userAudiosRouter = require('./routes/userAudiosRouter');
app.use("/audios", userAudiosRouter);

const userAuthorRouter = require('./routes/userAuthorRouter');
app.use("/songs/edit", userAuthorRouter);
app.use("/songs/delete", userAuthorRouter);


const songsRepository = require("./repositories/songsRepository.js");
const commentsRepository = require("./repositories/commentsRepository.js");
const usersRepository = require("./repositories/usersRepository.js");
songsRepository.init(app, MongoClient);
commentsRepository.init(app, MongoClient);
usersRepository.init(app, MongoClient);

require("./routes/songs.js")(app, songsRepository, commentsRepository);
require("./routes/comments.js")(app, commentsRepository);
require("./routes/authors.js")(app);
require("./routes/users.js")(app, usersRepository);

require("./routes/api/songsAPIv1.0.js")(app, songsRepository);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    console.log("Se ha producido un error " + err);
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error.twig');
});

module.exports = app;
