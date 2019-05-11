import Component from '@ember/component';

export default Component.extend({
  classNames: ['color-palette-item'],
  actions: {
    handleClick(value) {
      this.onClick(value);
    },

    handleSave(hsva) {
      const color = hsva.toHEXA().toString();
      this.onSave(color);
    },
  },
});
