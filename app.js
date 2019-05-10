const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

// use .env for local environment variables
require('dotenv').config();

// instantiate express app
const app = express();
var server = require('http').Server(app);

// set up socket.io, which will listen on the same port as the express server
app.io = require('socket.io')(server);

// require pg-promise
const pgp = require('pg-promise')({
  query(e) {
     (process.env.DEBUG === 'true') ? console.log(e.query) : null; // eslint-disable-line
  },
});

// initialize database connection
app.db = pgp(process.env.DATABASE_URL);

// socket.io events
app.io.on( "connection", function( socket ) {
    console.log( "A user connected" );
});

// allows CORS
app.all('*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type');
  next();
});

app.use('/nyc', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public/index.html'));
});

// serve static files
app.use('/', express.static('public'))
// parse JSON request bodies
app.use(bodyParser.json());

app.use('/tiles', require('./routes/tiles'))
app.use('/colors', require('./routes/colors'))


module.exports = {app: app, server: server};
