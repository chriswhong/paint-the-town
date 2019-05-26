const express = require('express');
const router = express.Router();

const boronameLookup = {
  '1': 'Manhattan',
  '2': 'Bronx',
  '3': 'Brooklyn',
  '4': 'Queens',
  '5': 'Staten Island',
};

/* GET /borocounts */
/* Retreives the number of painted lots vs total lots by borough */
router.get('/', async (req, res) => {
  const { app } = req;

  const metaQuery = `
  SELECT
    borocode,
    count(color) AS paintedlots,
    count(borocode)	AS totallots,
    ROUND(count(color)::decimal/count(borocode),2) AS percentage
  FROM (
    SELECT
      borocode,
      color
    FROM nyc_parcels
    LEFT JOIN (
      SELECT distinct on (parcel_id) * from nyc_colors
      ORDER BY parcel_id, timestamp DESC
    ) uniquecolors
    ON nyc_parcels.id = uniquecolors.parcel_id
  ) joinedlots
  GROUP BY borocode
  `

  try {
    const counts = await app.db.any(metaQuery);

    // convert to number and replace borocode with a display-friendly borough name
    const data = counts.map(({borocode, paintedlots, totallots, percentage}) => {
      return {
        type: 'borocounts',
        id: borocode,
        attributes: {
          paintedlots: parseInt(paintedlots, 10),
          totallots: parseInt(totallots, 10),
          percentage: parseFloat(percentage, 10),
          boroname: boronameLookup[borocode]
        }
      };
    });

    res.send({
      data,
    });
  } catch (e) {
    res.status(400).send({
      error: e.toString(),
    });
  }
});

module.exports = router;
