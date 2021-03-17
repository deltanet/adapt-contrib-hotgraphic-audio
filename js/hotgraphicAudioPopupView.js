define([
  'core/js/adapt'
], function(Adapt) {

  class HotgraphicAudioPopupView extends Backbone.View {

    className() {
      return 'hotgraphicaudio-popup';
    }

    events() {
      return {
        'click .js-hotgraphicaudio-popup-close': 'closePopup',
        'click .js-hotgraphicaudio-controls-click': 'onControlClick'
      };
    }

    initialize(...args) {
      super.initialize(...args);
      // Debounce required as a second (bad) click event is dispatched on iOS causing a jump of two items.
      this.onControlClick = _.debounce(this.onControlClick.bind(this), 100);
      this.listenToOnce(Adapt, 'notify:opened', this.onOpened);
      this.listenTo(this.model.get('_children'), {
        'change:_isActive': this.onItemsActiveChange,
        'change:_isVisited': this.onItemsVisitedChange
      });
      this.render();
    }

    onOpened() {
      this.applyNavigationClasses(this.model.getActiveItem().get('_index'));
      this.handleTabs();
      this.playAudio(this.model.getActiveItem().get('_index'));this.playAudio(this.model.getActiveItem().get('_index'));
    }

    applyNavigationClasses(index) {
      const itemCount = this.model.get('_items').length;
      const canCycleThroughPagination = this.model.get('_canCycleThroughPagination');

      const shouldEnableBack = (canCycleThroughPagination && index > 0) || false;
      const shouldEnableNext = (canCycleThroughPagination && index < itemCount - 1) || false;
      const $controls = this.$('.hotgraphicaudio-popup__controls');

      this.$('hotgraphicaudio-popup__controls')
        .toggleClass('.back', !shouldEnableBack)
        .toggleClass('.next', !shouldEnableNext);

      Adapt.a11y.toggleAccessibleEnabled($controls.filter('.back'), shouldEnableBack);
      Adapt.a11y.toggleAccessibleEnabled($controls.filter('.next'), shouldEnableNext);
    }

    handleTabs() {
      Adapt.a11y.toggleHidden(this.$('.hotgraphicaudio-popup__item:not(.is-active)'), true);
      Adapt.a11y.toggleHidden(this.$('.hotgraphicaudio-popup__item.is-active'), false);
    }

    onItemsActiveChange(item, _isActive) {
      if (!_isActive) return;
      const index = item.get('_index');
      this.applyItemClasses(index);
      this.handleTabs();
      this.handleFocus(index);
    }

    applyItemClasses(index) {
      this.$(`.hotgraphicaudio-popup__item[data-index="${index}"]`).addClass('is-active').removeAttr('aria-hidden');
      this.$(`.hotgraphicaudio-popup__item[data-index="${index}"] .hotgraphicaudio-popup__item-title`).attr('id', 'notify-heading');
      this.$(`.hotgraphicaudio-popup__item:not([data-index="${index}"])`).removeClass('is-active').attr('aria-hidden', 'true');
      this.$(`.hotgraphicaudio-popup__item:not([data-index="${index}"]) .hotgraphicaudio-popup__item-title`).removeAttr('id');
    }

    handleFocus(index) {
      Adapt.a11y.focusFirst(this.$('.hotgraphicaudio-popup__inner .is-active'));
      this.applyNavigationClasses(index);
    }

    onItemsVisitedChange(item, _isVisited) {
      if (!_isVisited) return;

      this.$('.hotgraphicaudio-popup__item')
        .filter(`[data-index="${item.get('_index')}"]`)
        .addClass('is-visited');
    }

    preRender() {
      if (Adapt.device.screenSize === 'large') {
        if (Adapt.audio && this.model.get('_audio') && this.model.get('_audio')._reducedTextisEnabled) {
          this.replaceText(Adapt.audio.textSize);
        }

        this.render();
        return;
      }

      this.reRender();
    }

    render() {
      const data = this.model.toJSON();
      data.view = this;
      const template = Handlebars.templates[this.constructor.template];
      this.$el.html(template(data));
    }

    closePopup() {
      Adapt.trigger('notify:close');
    }

    onControlClick(event) {
      const direction = $(event.currentTarget).data('direction');
      const index = this.getNextIndex(direction);
      if (index === -1) return;

      this.setItemState(index);

      this.playAudio(index);
    }

    getNextIndex(direction) {
      let index = this.model.getActiveItem().get('_index');
      const lastIndex = this.model.get('_items').length - 1;

      switch (direction) {
        case 'back':
          if (index > 0) return --index;
          if (this.model.get('_canCycleThroughPagination')) return lastIndex;
          break;
        case 'next':
          if (index < lastIndex) return ++index;
          if (this.model.get('_canCycleThroughPagination')) return 0;
      }
      return -1;
    }

    setItemState(index) {
      this.model.getActiveItem().toggleActive();

      const nextItem = this.model.getItem(index);
      nextItem.toggleActive();
      nextItem.toggleVisited(true);
    }

    replaceText(value) {
      if (Adapt.audio && Adapt.course.get('_audio')._reducedTextisEnabled && this.model.get('_audio') && this.model.get('_audio')._reducedTextisEnabled) {
        if (value == 0) {
          this.$('.hotgraphicaudio-popup-title-inner').html(this.model.get('_items')[i].title);
          this.$('.hotgraphicaudio-popup-body-inner').html(this.model.get('_items')[i].body);
        } else {
          this.$('.hotgraphicaudio-popup-title-inner').html(this.model.get('_items')[i].titleReduced);
          this.$('.hotgraphicaudio-popup-body-inner').html(this.model.get('_items')[i].bodyReduced);
        }
      }
    }

    playAudio(index) {
      var currentItem = this.model.getItem(index);

      if (Adapt.audio && this.model.has('_audio') && this.model.get('_audio')._isEnabled && Adapt.audio.audioClip[this.model.get('_audio')._channel].status==1) {
        Adapt.audio.audioClip[this.model.get('_audio')._channel].onscreenID = "";
        Adapt.trigger('audio:playAudio', currentItem.get('_audio').src, this.model.get('_id'), this.model.get('_audio')._channel);
      }
    }
  };

  HotgraphicAudioPopupView.template = 'hotgraphicaudioPopup';

  return HotgraphicAudioPopupView;

});
