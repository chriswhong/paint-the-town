import Route from '@ember/routing/route';

import cities from '../utils/cities';

export default Route.extend({
  model({ city }) {
    const cityData = { city, ...cities[city]};

    return {
      ...cityData,
      meta: this.store.findAll('borocount'),
    }
  }
});
