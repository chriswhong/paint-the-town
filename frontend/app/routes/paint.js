import Route from '@ember/routing/route';

// TODO move this out to another module
const cities = {
  nyc: {
    mapCenter: [-74.01387, 40.71047],
    mapZoom: 13.54,
  },

  boston: {
    mapCenter: [-71.06149, 42.36409],
    mapZoom: 14.22,
  }
}


export default Route.extend({
  model({ city }) {
    const cityData = { city, ...cities[city]};

    return {
      ...cityData,
      meta: this.store.findAll('borocount'),
    }
  }
});
