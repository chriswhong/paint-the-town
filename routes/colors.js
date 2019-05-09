const express = require('express');
const router = express.Router();

const validateInputs = (bbl, color) => {
  // validate bbl
  const bblRegex = /^[1-5]{1}[0-9]{5}[0-9]{4}$/;
  const bblMatch = bbl.match(bblRegex);
  if (!bblMatch) return false;

  // validate color
  const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const colorMatch = color.match(colorRegex);
  if (!colorMatch) return false;

  return true;
};

const insertColorQuery = `INSERT INTO colors(bbl, color, timestamp) VALUES($1, $2, NOW())`

/* POST /colors */
/* Save a bbl + color to the database */
router.post('/', async (req, res) => {
  const { app } = req;
  const { bbl, color } = req.body;

  if (validateInputs(bbl, color)) {
    // write to database
    try {
      await app.db.none(insertColorQuery, [bbl, color]);

      // get geometry
      const { geometry } = await app.db.one(`
        SELECT ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geometry
        FROM mappluto
        WHERE bbl = $1
      `, bbl);

      app.io.send({
        type: 'colorEvent',
        feature: {
          type: 'Feature',
          geometry: JSON.parse(geometry),
          properties: {
            color,
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
