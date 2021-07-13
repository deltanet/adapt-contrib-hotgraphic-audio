define([
  'core/js/adapt',
  'core/js/views/componentView',
  './hotgraphicAudioPopupView'
], function(Adapt, ComponentView, HotgraphicAudioPopupView) {

  class HotgraphicAudioView extends ComponentView {

    events() {
      return {
        'click .js-hotgraphicaudio-item-click': 'onPinClicked'
      };
    }

    initialize(...args) {
      super.initialize(...args);

      this.setUpViewData();
      this.setUpModelData();
      this.setUpEventListeners();
      this.checkIfResetOnRevisit();
    }

    setUpViewData() {
      this.popupView = null;
      this._isPopupOpen = false;
    }

    setUpModelData() {
      if (this.model.get('_canCycleThroughPagination') === undefined) {
        this.model.set('_canCycleThroughPagination', false);
      }
    }

    setUpEventListeners() {
      this.listenTo(Adapt, 'device:changed', this.reRender);

      this.listenTo(this.model.get('_children'), {
        'change:_isActive': this.onItemsActiveChange,
        'change:_isVisited': this.onItemsVisitedChange
      });
    }

    reRender() {
      if (Adapt.device.screenSize === 'large' || this.model.get('_isNarrativeOnMobile') === false) return;

      this.replaceWithNarrative();
    }

    replaceWithNarrative() {
      const NarrativeAudioView = Adapt.getViewClass('narrativeAudio');
      if (!NarrativeAudioView) return;

      const model = this.prepareNarrativeModel();
      const newNarrative = new NarrativeAudioView({ model });
      // NOTE: if this component is doing its inital render in 'narrative mode',
      // this.$el.parents() won't exist at this point - which is why the following is
      // written the way it is, instead of (what would appear to be) the more efficient
      // this.$el.parents('.component__container')
      const $container = Adapt.findViewByModelId(model.get('_parentId')).$el.find('.component__container');
      $container.append(newNarrative.$el);

      this.remove();
      _.defer(() => {
        Adapt.trigger('device:resize');
      });
    }

    prepareNarrativeModel() {
      this.model.set({
        _component: 'narrativeAudio',
        _wasHotgraphic: true,
        originalBody: this.model.get('body'),
        originalInstruction: this.model.get('instruction')
      });

      // Check if active item exists, default to 0
      const activeItem = this.model.getActiveItem();
      if (!activeItem) {
        this.model.getItem(0).toggleActive(true);
      }

      // Swap mobile body and instructions for desktop variants.
      if (this.model.get('mobileBody')) {
        this.model.set('body', this.model.get('mobileBody'));
      }
      if (this.model.get('mobileInstruction')) {
        this.model.set('instruction', this.model.get('mobileInstruction'));
      }

      return this.model;
    }

    onItemsActiveChange(model, _isActive) {
      this.getItemElement(model).toggleClass('is-active', _isActive);
    }

    getItemElement(model) {
      const index = model.get('_index');
      return this.$('.js-hotgraphicaudio-item-click').filter(`[data-index="${index}"]`);
    }

    onItemsVisitedChange(model, _isVisited) {
      if (!_isVisited) return;

      const $pin = this.getItemElement(model);
      // Append the word 'visited.' to the pin's aria-label
      const visitedLabel = ` ${this.model.get('_globals')._accessibility._ariaLabels.visited}.`;
      $pin.find('.aria-label').each(function(index, el) {
        el.innerHTML += visitedLabel;
      });

      $pin.addClass('is-visited');
    }

    checkIfResetOnRevisit() {
      const isResetOnRevisit = this.model.get('_isResetOnRevisit');

      // If reset is enabled set defaults
      if (isResetOnRevisit) {
        this.model.reset(isResetOnRevisit);
      }
    }

    preRender() {
      if (Adapt.device.screenSize === 'large') {
        this.render();
        return;
      }

      this.reRender();
    }

    postRender() {
      this.$('.hotgraphicaudio__widget').imageready(this.setReadyStatus.bind(this));
      if (this.model.get('_setCompletionOn') === 'inview') {
        this.setupInviewCompletion('.component__widget');
      }
    }

    onPinClicked(event) {
      const item = this.model.getItem($(event.currentTarget).data('index'));
      item.toggleActive(true);
      item.toggleVisited(true);

      this.openPopup();
    }

    openPopup() {
      if (this._isPopupOpen) return;

      this._isPopupOpen = true;

      this.popupView = new HotgraphicAudioPopupView({
        model: this.model
      });

      const showCloseButton = this.model.get('close') ? false : true;

      Adapt.notify.popup({
        _view: this.popupView,
        _isCancellable: true,
        _showCloseButton: showCloseButton,
        _classes: 'hotgraphicaudio ' + this.model.get('_classes')
      });

      this.listenToOnce(Adapt, {
        'popup:closed': this.onPopupClosed
      });
    }

    onPopupClosed() {
      this.model.getActiveItem().toggleActive();
      this._isPopupOpen = false;
    }

  }

  HotgraphicAudioView.template = 'hotgraphicaudio';

  return HotgraphicAudioView;

});