const express = require('express');
const SphericalMercator = require('sphericalmercator');

const router = express.Router();
const mercator = new SphericalMercator();

/* GET /tiles/:z/:x/:y.mvt */
/* Retreive a vector tile */
router.get('/:city/:z/:x/:y.mvt', async (req, res) => {
  const { app, params } = req;

  const {
    city,
    z,
    x,
    y,
  } = params;

  // calculate the bounding box for this tile
  const bbox = mercator.bbox(x, y, z, false, '900913');

  const parcelsTable = `${city}_parcels`;
  const colorsTable = `${city}_colors`;

  console.log([...bbox, parcelsTable, colorsTable])

  const vectorTileQuery = `
    WITH tilebounds (geom) AS (SELECT ST_MakeEnvelope($1, $2, $3, $4, 3857))
    SELECT ST_AsMVT(q, 'parcels', 4096, 'geom')
    FROM (
      SELECT
        a.id,
        address,
        geom,
        username,
        to_char(timestamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS timestamp,
        CASE WHEN color IS NOT NULL THEN color ELSE '#FFF' END AS color
  	  FROM (
  		 SELECT
  			$5:name.id,
  			address,
  			ST_AsMVTGeom(
  			  $5:name.geom,
  			  tileBounds.geom,
  			  4096,
  			  256,
  			  false
  			) geom
  		  FROM $5:name, tilebounds
  		  WHERE $5:name.geom && tilebounds.geom
  	   ) a
       LEFT JOIN (
         SELECT distinct on (parcel_id) * from $6:name
         ORDER BY parcel_id, timestamp DESC
       ) uniquecolors
       ON a.id = uniquecolors.parcel_id
    ) q
  `;

  try {
    const tile = await app.db.one(vectorTileQuery, [...bbox, parcelsTable, colorsTable]);

    res.setHeader('Content-Type', 'application/x-protobuf');

    if (tile.st_asmvt.length === 0) {
      res.status(204);
    }
    res.send(tile.st_asmvt);
  } catch (e) {
    res.status(404).send({
      error: e.toString(),
    });
  }
});

module.exports = router;
