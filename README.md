# paint-the-town
A Collaborative Civic Data Art Project using NYC's MapPLUTO Dataset

<img width="1255" alt="Screen Shot 2019-05-11 at 7 50 56 PM" src="https://user-images.githubusercontent.com/1833820/57576087-2895dc80-7426-11e9-9054-f5d68500429a.png">

## About

Paint the town shows a map of New York City where users can click the map to "paint" a tax lot using any color they like.  Paint actions are stored in a database and updated on all user's maps in real time.  Over time, interesting patterns and color schemes will emerge as individual users add color to the part of the map that interests them.

## Architecture

Paint the town is an ember.js frontend and an express.js + postgres/postgis backend.  (PEEN Stack? PostgreSQL-Express-Ember-Node)

### Backend

The express API serves three major functions:

- Provide a `POST /colors` endpoint for submitting paint actions.  This endpoint checks for a valid bbl (tax lot id), color, and a username of more than 3 characters.  There is no authentication, anyone can POST a paint action with valid inputs.

- Serve vector tiles of NYC MapPLUTO joined with paint actions.  This is accomplished using `ST_AsMVT` so no additional processing is needed in express, the vector tile protocol buffers come straight from PostGIS.

- Provide a websocket (socket.io) server.  Clients connect to the socket.io server and receive a message whenever a paint action has occurred.  The response is used to update the map in real-time as other users are painting.

### Frontend

The ember.js app lives in the `frontend` directory in this repo.  Loading the `/` route redirects to `/nyc`, as we may want to add more cities to paint in the future. 100% of the app state is in the controller for the `/nyc` route.  

#### LocalStorage

LocalStorage is used to persist the username and 7-color palette, so users can come back to the app without having to re-enter a username and set up custom colors.

### Database

The postgreSQL/postgis database has just two tables, `mappluto` and `colors`.  New paint activity writes a bbl, username, timestamp, and hex color code, which are joined with geometries in pluto to create vector tiles.  Some scripts for starting up a postgis database with docker and importing PLUTO are in `/scripts`

## Development

- Clone this repository `git clone git@github.com:chriswhong/paint-the-town.git`
- Create a `.env` file with your `DATABASE_URL` connection string
- Install dependencies `cd paint-the-town && yarn`
- Run the Express server `npm run devstart` (requires nodemon `npm install -g nodemon`)

In a new terminal window:

- Install frontend dependencies `cd frontend && yarn`
- Start the ember app `ember serve --environment = development`.  Using this environment flag tells the app to send its api calls and websocket traffic to `localhost:3000`

## Contributing

I would LOVE your help on this.  Check out the issues, and hit me up on twitter at @chris_whong if you'd like to contribute.
