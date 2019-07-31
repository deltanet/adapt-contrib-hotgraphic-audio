define([
    'core/js/adapt',
    'core/js/views/componentView',
    './hotgraphicAudioPopupView'
], function(Adapt, ComponentView, HotgraphicAudioPopupView) {
    'use strict';

    var HotgraphicAudioView = ComponentView.extend({

        events: {
            'click .hotgraphicAudio-graphic-pin': 'onPinClicked'
        },

        initialize: function() {
            ComponentView.prototype.initialize.call(this);
            this.setUpViewData();
            this.setUpModelData();
            this.setUpEventListeners();
            this.checkIfResetOnRevisit();
        },

        setUpViewData: function() {
            this.popupView = null;
            this._isPopupOpen = false;
        },

        setUpModelData: function() {
            if (this.model.get('_canCycleThroughPagination') === undefined) {
                this.model.set('_canCycleThroughPagination', false);
            }
        },

        setUpEventListeners: function() {
            this.listenTo(Adapt, 'device:changed', this.reRender);
            this.listenTo(Adapt, "audio:changeText", this.replaceText);

            this.listenTo(this.model.get('_children'), {
                'change:_isActive': this.onItemsActiveChange,
                'change:_isVisited': this.onItemsVisitedChange
            });
        },

        reRender: function() {
            if (Adapt.device.screenSize !== 'large') {
                this.replaceWithNarrative();
            }
        },

        replaceWithNarrative: function() {
            var NarrativeAudioView = Adapt.getViewClass('narrativeAudio');

            var model = this.prepareNarrativeModel();
            var newNarrativeAudio = new NarrativeAudioView({ model: model });
            var $container = $(".component-container", $("." + this.model.get("_parentId")));

            newNarrativeAudio.reRender();
            newNarrativeAudio.setupNarrative();
            $container.append(newNarrativeAudio.$el);
            Adapt.trigger('device:resize');
            _.defer(this.remove.bind(this));
        },

        prepareNarrativeModel: function() {
            var model = this.model;
            model.set({
                '_component': 'narrativeAudio',
                '_wasHotgraphic': true,
                'originalBody': model.get('body'),
                'originalInstruction': model.get('instruction')
            });

            // Check if active item exists, default to 0
            var activeItem = model.getActiveItem();
            if (!activeItem) {
                model.getItem(0).toggleActive(true);
            }

            // Swap mobile body and instructions for desktop variants.
            if (model.get('mobileBody')) {
                model.set('body', model.get('mobileBody'));
            }
            if (model.get('mobileInstruction')) {
                model.set('instruction', model.get('mobileInstruction'));
            }

            return model;
        },

        onItemsActiveChange: function(model, _isActive) {
            this.getItemElement(model).toggleClass('active', _isActive);
        },

        getItemElement: function(model) {
            var index = model.get('_index');
            return this.$('.hotgraphicAudio-graphic-pin').filter('[data-index="' + index + '"]');
        },

        onItemsVisitedChange: function(model, _isVisited) {
            if (!_isVisited) return;
            var $pin = this.getItemElement(model);

            // Append the word 'visited.' to the pin's aria-label
            var visitedLabel = this.model.get('_globals')._accessibility._ariaLabels.visited + ".";
            $pin.attr('aria-label', function(index, val) {
                return val + " " + visitedLabel;
            });

            $pin.addClass('visited');
        },

        checkIfResetOnRevisit: function() {
            var isResetOnRevisit = this.model.get('_isResetOnRevisit');

            // If reset is enabled set defaults
            if (isResetOnRevisit) {
                this.model.reset(isResetOnRevisit);
            }
        },

        preRender: function() {
            if (Adapt.device.screenSize === 'large') {
                this.render();

                if (Adapt.audio && this.model.get('_audio') && this.model.get('_audio')._reducedTextisEnabled) {
                    this.replaceText(Adapt.audio.textSize);
                }
            } else {
                this.reRender();
            }
        },

        postRender: function() {
            this.$('.hotgraphicAudio-widget').imageready(this.setReadyStatus.bind(this));
            if (this.model.get('_setCompletionOn') === 'inview') {
                this.setupInviewCompletion('.component-widget');
            }
        },

        onPinClicked: function (event) {
            if(event) event.preventDefault();

            var item = this.model.getItem($(event.currentTarget).data('index'));
            item.toggleActive(true);
            item.toggleVisited(true);

            this.openPopup();
        },

        openPopup: function() {
            if (this._isPopupOpen) return;

            this._isPopupOpen = true;

            Adapt.trigger('audio:stopAllChannels');

            this.popupView = new HotgraphicAudioPopupView({
                model: this.model
            });

            Adapt.trigger("notify:popup", {
                _view: this.popupView,
                _isCancellable: true,
                _showCloseButton: false,
                _closeOnBackdrop: true,
                _classes: ' hotgraphicAudio'
            });

            this.listenToOnce(Adapt, {
                'popup:closed': this.onPopupClosed
            });
        },

        onPopupClosed: function() {
            this.model.getActiveItem().toggleActive();
            this._isPopupOpen = false;
        },

        replaceText: function(value) {
            if (Adapt.audio && Adapt.course.get('_audio')._reducedTextisEnabled && this.model.get('_audio') && this.model.get('_audio')._reducedTextisEnabled) {
                // Change each items title and body
                for (var i = 0; i < this.model.get('_items').length; i++) {
                    if(value == 0) {
                      this.$('.item-'+i).find('.hotgraphicAudio-popup-title-inner').html(this.model.get('_items')[i].title);
                      this.$('.item-'+i).find('.hotgraphicAudio-popup-body-inner').html(this.model.get('_items')[i].body);
                  } else {
                      this.$('.item-'+i).find('.hotgraphicAudio-popup-title-inner').html(this.model.get('_items')[i].titleReduced);
                      this.$('.item-'+i).find('.hotgraphicAudio-popup-body-inner').html(this.model.get('_items')[i].bodyReduced);
                    }
                }
            }
        }

    });

    return HotgraphicAudioView;

});
