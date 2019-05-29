import Controller from '@ember/controller';
import mapboxgl from 'mapbox-gl';

import cities from '../utils/cities';
import baseStyle from '../styles/base-style';

// extend mapboxGL Marker so we can pass in an onClick handler
class Marker extends mapboxgl.Marker {
  onClick(handleClick) {
    this._handleClick = handleClick;
    return this;
  }

  _onMapClick(e) {
    const targetElement = e.originalEvent.target;
    const element = this._element;

    if (targetElement === element || element.contains((targetElement))) {
        this._handleClick();
    }
  }
}

export default Controller.extend({
  baseStyle,

  mapCenter: [-72.301025,41.409776],

  mapZoom: 5,

  actions: {
    mapLoaded(map) {
      Object.keys(cities).forEach((cityId) => {
        const city = cities[cityId];

        const marker = new Marker({ color: '#75a2d8' })
          .setLngLat(city.markerLngLat)
          .onClick(() => { this.transitionToRoute(`/${cityId}`) })
          .addTo(map);

        const cityLabel = document.createElement('div');
        cityLabel.classList.add("marker-label");
        cityLabel.appendChild(document.createTextNode(`${city.displayName}`));
        marker.getElement().appendChild(cityLabel);
      });
    }
  }
});
