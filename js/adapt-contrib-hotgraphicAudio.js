define([
  'core/js/adapt',
  './hotgraphicAudioView',
  'core/js/models/itemsComponentModel'
], function(Adapt, HotGraphicAudioView, ItemsComponentModel) {

  return Adapt.register('hotgraphicAudio', {
    model: ItemsComponentModel.extend({}),
    view: HotGraphicAudioView
  });

});
