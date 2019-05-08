const express = require('express');
const SphericalMercator = require('sphericalmercator');

const router = express.Router();
const mercator = new SphericalMercator();

/* GET /tiles/:z/:x/:y.mvt */
/* Retreive a vector tile */
router.get('/:z/:x/:y.mvt', async (req, res) => {
  const { app, params } = req;

  const {
    z,
    x,
    y,
  } = params;

  // calculate the bounding box for this tile
  const bbox = mercator.bbox(x, y, z, false, '900913');

  const vectorTileQuery = `
    WITH tilebounds (geom) AS (SELECT ST_MakeEnvelope($1, $2, $3, $4, 3857))
    SELECT ST_AsMVT(q, 'pluto', 4096, 'geom')
    FROM (
      SELECT
        a.bbl,
        address,
        geom,
        CASE WHEN color IS NOT NULL THEN color ELSE '#FFF' END AS color
  	  FROM (
  		 SELECT
  			mappluto.bbl,
  			address,
  			ST_AsMVTGeom(
  			  mappluto.geom,
  			  tileBounds.geom,
  			  4096,
  			  256,
  			  false
  			) geom
  		  FROM mappluto, tilebounds
  		  WHERE mappluto.geom && tilebounds.geom
  	   ) a
  	   LEFT JOIN colors ON a.bbl = colors.bbl
    ) q
  `;

  try {
    const tile = await app.db.one(vectorTileQuery, bbox);

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
