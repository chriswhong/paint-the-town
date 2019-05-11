const express = require('express');
const router = express.Router();

const validateInputs = (bbl, color, username) => {
  // validate bbl
  const bblRegex = /^[1-5]{1}[0-9]{5}[0-9]{4}$/;
  const bblMatch = bbl.match(bblRegex);
  if (!bblMatch) return false;

  // validate color
  const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const colorMatch = color.match(colorRegex);
  if (!colorMatch) return false;

  // validate username
  if ((username.length < 4) || (username.length > 15)) return false;

  return true;
};

const insertColorQuery = `INSERT INTO colors(bbl, color, username, timestamp) VALUES($1, $2, $3, NOW())`

/* POST /colors */
/* Save a bbl, color, username, and timestamp to the database */
router.post('/', async (req, res) => {
  const { app } = req;
  const { bbl, color, username } = req.body;

  if (validateInputs(bbl, color, username)) {
    // write to database
    try {
      await app.db.none(insertColorQuery, [bbl, color, username]);

      // get geometry
      const { geometry, address, timestamp } = await app.db.one(`
        SELECT ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geometry,
        mappluto.bbl,
        address,
        color,
        username,
        to_char(timestamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS timestamp
        FROM mappluto
        LEFT JOIN (
          SELECT distinct on (bbl) * from colors
          ORDER BY bbl, timestamp DESC
        ) uniquecolors
        ON mappluto.bbl = uniquecolors.bbl
        WHERE mappluto.bbl = $1
      `, bbl);

      // broadcast the new feature to connected clients via socket.io
      app.io.send({
        type: 'colorEvent',
        feature: {
          type: 'Feature',
          geometry: JSON.parse(geometry),
          properties: {
            bbl,
            address,
            color,
            username,
            timestamp,
          }
        }
      });

      res.send({
        status: 'success',
        message: `bbl ${bbl} was set to ${color}`
      });
    } catch (e) {
      res.status(400).send({
        error: e.toString(),
      });
    }
  } else {
    res.status(400).send({
      status: 'error',
      message: 'invalid input',
    })
  }
});

module.exports = router;
