define([
    'core/js/adapt',
    './hotgraphicAudioView',
    'core/js/models/itemsComponentModel'
], function(Adapt, HotgraphicAudioView, ItemsComponentModel) {

    return Adapt.register('hotgraphicAudio', {
        model: ItemsComponentModel,
        view: HotgraphicAudioView
    });

});
