import DS from 'ember-data';
import ENV from 'frontend/config/environment';


export default DS.JSONAPIAdapter.extend({
  host: ENV.host,
});
