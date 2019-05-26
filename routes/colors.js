const express = require('express');
const router = express.Router();

const validateInputs = (city, id, color, username) => {

  if (city === 'nyc') {
    // validate bbl
    const bblRegex = /^[1-5]{1}[0-9]{5}[0-9]{4}$/;
    const bblMatch = id.match(bblRegex);
    if (!bblMatch) return false;
  }

  if (city === 'boston') {
    // validate bbl
    const idRegex = /^[0-9]{2}[0-9]{5}[0-9]{3}$/;
    const idMatch = id.match(idRegex);
    if (!idMatch) return false;
  }



  // validate color
  const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const colorMatch = color.match(colorRegex);
  if (!colorMatch) return false;

  // validate username
  if ((username.length < 4) || (username.length > 15)) return false;

  return true;
};

const insertColorQuery = `INSERT INTO $4:name(parcel_id, color, username, timestamp) VALUES($1, $2, $3, NOW())`

/* POST /colors */
/* Save a parcel id, color, username, and timestamp to the database */
router.post('/:city', async (req, res) => {
  const { app, params } = req;
  const { city } = params;
  const { id, color, username } = req.body;
  console.log(id, color, username)

  if (validateInputs(city, id, color, username)) {
    // write to database
    try {
      const parcelsTable = `${city}_parcels`;
      const colorsTable = `${city}_colors`;

      await app.db.none(insertColorQuery, [id, color, username, colorsTable]);

      // get geometry
      const { geometry, address, timestamp } = await app.db.one(`
        SELECT ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geometry,
        $1:name.id,
        address,
        color,
        username,
        to_char(timestamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS timestamp
        FROM $1:name
        LEFT JOIN (
          SELECT DISTINCT on (parcel_id) * FROM $2:name
          ORDER BY parcel_id, timestamp DESC
        ) uniquecolors
        ON $1:name.id = uniquecolors.parcel_id
        WHERE $1:name.id = $3
      `, [ parcelsTable, colorsTable, id ]);

      // broadcast the new feature to connected clients via socket.io
      app.io.send({
        type: 'colorEvent',
        feature: {
          type: 'Feature',
          geometry: JSON.parse(geometry),
          properties: {
            id,
            address,
            color,
            username,
            timestamp,
          }
        }
      });

      res.send({
        status: 'success',
        message: `id ${id} was set to ${color}`
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
