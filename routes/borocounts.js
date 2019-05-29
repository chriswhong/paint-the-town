const express = require('express');
const router = express.Router();



const getNycBoroughCounts = async (app) => {
    const boronameLookup = {
      '1': 'Manhattan',
      '2': 'Bronx',
      '3': 'Brooklyn',
      '4': 'Queens',
      '5': 'Staten Island',
    };

    const SQL = `
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
      const counts = await app.db.any(SQL);

      // convert to number and replace borocode with a display-friendly borough name
      return counts.map(({borocode, paintedlots, totallots, percentage}) => {
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
    } catch(e) {
      console.log(e);
    }

}

/* GET /borocounts */
/* Retreives the number of painted lots vs total lots by borough */
router.get('/', async (req, res) => {
  const { app, query } = req;
  const { city } = query;

  const metaQuery = `
    SELECT
      count(color) AS paintedlots,
      count(*)	AS totallots,
      ROUND(count(color)::decimal/count(*),2) AS percentage
    FROM (
      SELECT
        color
      FROM $1:name
      LEFT JOIN (
        SELECT distinct on (parcel_id) * from $2:name
        ORDER BY parcel_id, timestamp DESC
      ) uniquecolors
      ON $1:name.id = uniquecolors.parcel_id
    ) joinedlots
  `;

  const parcelsTable = `${city}_parcels`;
  const colorsTable = `${city}_colors`;

  try {
    const counts = await app.db.any(metaQuery, [parcelsTable, colorsTable]);

    // convert to number and replace borocode with a display-friendly borough name
    let data = counts.map(({paintedlots, totallots, percentage}) => {
      return {
        type: 'borocounts',
        id: '0',
        attributes: {
          paintedlots: parseInt(paintedlots, 10),
          totallots: parseInt(totallots, 10),
          percentage: parseFloat(percentage, 10),
          boroname: 'Citywide Total'
        }
      };
    });

    // if nyc, append special borough counts
    if (city === 'nyc') {
      let nycBoroughCounts = await getNycBoroughCounts(app);
      data = [...data, ...nycBoroughCounts];
    }

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
