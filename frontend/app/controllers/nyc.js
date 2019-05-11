import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import MapboxGL from 'mapbox-gl/dist/mapbox-gl.js'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import moment from 'moment';

import baseStyle from '../styles/base-style';
import ENV from 'frontend/config/environment';

export default Controller.extend({
  socketIOService: service('socket-io'),

  init() {
    this._super(...arguments);

    // connect to socket.io server
    const socket = this.socketIOService.socketFor(ENV.host);
    socket.on('message', this.onMessage, this);

    // get username
    const username = window.localStorage.getItem('username');
    this.set('username', username || '');

  },

  tooltipX: 0,
  tooltipY: 0,
  tooltipText: '',

  // initialization options for the mapboxGL map
  mapInit: {
    style: baseStyle,
    center: [-73.955178, 40.733433],
    zoom: 15.23,
    hash: true,
    minZoom: 13.5,
  },

  colorPalette0: '#F44842',
  colorPalette1: '#F48C41',
  colorPalette2: '#F4F441',
  colorPalette3: '#55F441',
  colorPalette4: '#4176F2',
  colorPalette5: '#713DDF',
  colorPalette6: '#A83CBD',

  activeColor: '#F44842',

  // if the user has already painted a lot, remember the color
  // and use it as the default in the color picker on the next paint operation
  // lastColor: "#FFF",
  lastColor: "#292972",


  // persists username as long as this controller is around
  username: '',

  // array of geoJSON features received via socket.io messages
  // these reflect new activity and are displayed on top of the vector tiles
  tempFeatures: [],

  // primary vector tile source for tax lots with color, bbl, address, username, and timestamp
  plutoSource: {
    type: 'vector',
    tiles: [`${ENV.host}/tiles/{z}/{x}/{y}.mvt`],
  },

  plutoLineLayer: {
    id: 'pluto-line',
    type: 'line',
    'source-layer': 'pluto',
    paint: {
      'line-width': 0.1,
      'line-opacity': {
        stops: [
          [14, 0],
          [15, 0.5],
        ]
      },
    }
  },

  plutoFillLayer: {
    id: 'pluto-fill',
    type: 'fill',
    'source-layer': 'pluto',
    paint: {
      'fill-opacity': 1,
      'fill-color': {
        type: 'identity',
        property: 'color',
      }
    }
  },

  // source for temporary features received via socket.io messages
  tempFeaturesSource: Ember.computed('tempFeatures.[]', function() {
    const features = this.get('tempFeatures');
    return {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features
      },
    };
  }),

  tempFeaturesFillLayer: {
    id: 'temp-features-fill',
    type: 'fill',
    paint: {
      'fill-opacity': 1,
      'fill-color': {
        type: 'identity',
        property: 'color',
      }
    }
  },

  // selectedFeature is the one currently being painted, and needs a computed
  // so we can update its color constantly as the user interacts with the color picker
  selectedFeatureSource: Ember.computed('selectedFeature', 'selectedFeature.properties.proposedColor', function() {
    const data = this.get('selectedFeature');
    return {
      type: 'geojson',
      data,
    };
  }),

  selectedFeatureFillLayer: {
    id: 'selected-feature-fill',
    type: 'fill',
    paint: {
      'fill-opacity': 1,
      'fill-color': {
        type: 'identity',
        property: 'proposedColor',
      }
    }
  },

  selectedFeatureLineLayer: {
    id: 'selected-feature-line',
    type: 'line',
    paint: {
      'line-width': 3,
      'line-opacity': 1,
    }
  },

  highlightFeature: null,

  highlightFeatureSource: Ember.computed('highlightFeature', function() {
    const data = this.get('highlightFeature');
    return {
      type: 'geojson',
      data,
    };
  }),

  highlightFeatureLineLayer: {
    id: 'highlight-feature-line',
    type: 'line',
    paint: {
      'line-width': 2,
      'line-opacity': 1,
      'line-color': '#82A7FD',
    }
  },

  // when a socket.io message is received, push the feature to tempFeatures
  // this will trigger a computed mapboxGL source and update the map
  onMessage({ type, feature }) {
    if (type === 'colorEvent') {
      this.get('tempFeatures').pushObject(feature);
    }
  },

  // validates that the user has chosen a color and provided a sufficiently long username
  isValid: Ember.computed('selectedFeature.properties.proposedColor', 'username', function() {
    // username must be > 3 characters
    const username = this.get('username');
    if (username.length < 4) return false;

    // proposedColor must be different than color
    const selectedFeature = this.get('selectedFeature');
    const { color, proposedColor } = selectedFeature.properties;
    if (!proposedColor || (color === proposedColor)) return false;

    return true;
  }),

  postColorChange(bbl, color) {
    const body = JSON.stringify({
      bbl,
      color,
      username: this.get('username'),
    });

    fetch(`${ENV.host}/colors`, {
      method: 'post',
      headers: {
        'Content-type': 'application/json',
        'Content-Length': body.length,
      },
      body,
    });
  },

  actions: {
    mapLoaded(map) {
      this.set('mapInstance', map);
      window.map = map;

      // add search control
      map.addControl(new MapboxGeocoder({
        accessToken: ENV['mapbox-gl'].accessToken,
        mapboxgl: MapboxGL,
      }));

      map.addControl(new MapboxGL.NavigationControl());
    },

    // if the user clicked a lot, set selectedFeature to its feature
    handleMapClick(e) {
      const { mapInstance: map } = this;
      const [feature] = map.queryRenderedFeatures(e.point, {
        layers: ['pluto-fill', 'temp-features-fill']
      });

      if (feature) {
        const { bbl } = feature.properties;
        const color = this.get('activeColor');

        // POST a color change to set this BBL's color to activeColor;
        this.postColorChange(bbl, color)
      }

      // feature.properties.proposedColor = this.get('lastColor');
      //
      // if (feature) {
      //   // set selectedFeature
      //   this.set('selectedFeature', feature);
      // }
    },

    handleMapMousemove(e) {
      const { mapInstance: map } = this;
      const [feature] = map.queryRenderedFeatures(e.point, {
        layers: ['pluto-fill', 'temp-features-fill']
      });

      if (feature) {
        map.getCanvas().style.cursor = 'pointer';
        this.set('highlightFeature', feature);

        // tooltip text
        const { address, color, username, timestamp } = feature.properties;
        let tooltipText = `${address} has not been painted yet`

        if (timestamp) {
          tooltipText = `${address} was painted by ${username} ${moment(timestamp).fromNow()}`;
        }

        this.set('tooltipText', tooltipText)
      } else {
        map.getCanvas().style.cursor = 'default';
        this.set('highlightFeature', null);
      }

      // popup
      this.set('tooltipX', `${e.point.x + 15}px`);
      this.set('tooltipY', `${e.point.y + 15}px`);
    },

    // on keypress in the username input, set username
    updateUsername(e) {
      this.set('username', e.target.value);
    },

    // // store the proposed color in selectedFeature.properties
    // handleColorChange(hsva) {
    //   const color = hsva.toHEXA().toString();
    //   this.set('selectedFeature.properties.proposedColor', color);
    // },

    // // POSTs data to the server
    // handlePaint() {
    //   const selectedFeature = this.get('selectedFeature');
    //   const { bbl, proposedColor:color } = selectedFeature.properties;
    //
    //   const body = JSON.stringify({
    //     bbl,
    //     color,
    //     username: this.get('username'),
    //   });
    //
    //   // remember the color for next time
    //   this.set('lastColor', color);
    //
    //   // remember username
    //   window.localStorage.setItem('username', this.get('username'));
    //
    //   fetch(`${ENV.host}/colors`, {
    //     method: 'post',
    //     headers: {
    //       'Content-type': 'application/json',
    //       'Content-Length': body.length,
    //     },
    //     body,
    //   });
    //
    //   // clear selectedFeature
    //   this.set('selectedFeature', undefined);
    // },

    setActiveColor(color) {
      this.set('activeColor', color);
    },
  }
});
