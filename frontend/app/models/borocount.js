import DS from 'ember-data';
const { Model } = DS;

export default Model.extend({
  paintedlots: DS.attr('number'),
  totallots: DS.attr('number'),
  percentage: DS.attr('number'),
  boroname: DS.attr('string')
});
