define(function(require) {

    var ComponentView = require('coreViews/componentView');
    var Adapt = require('coreJS/adapt');

    var HotGraphicAudio = ComponentView.extend({

        initialize: function() {
            this.listenTo(Adapt, 'remove', this.remove);
            this.listenTo(this.model, 'change:_isVisible', this.toggleVisibility);
            this.model.set('_globals', Adapt.course.get('_globals'));
            this.preRender();
            if (this.model.get('_canCycleThroughPagination') === undefined) {
                this.model.set('_canCycleThroughPagination', false);
            }
            if (Adapt.device.screenSize == 'large') {
                this.render();

                if (this.model.get('_audio') && this.model.get('_audio')._reducedTextisEnabled) {
                    this.replaceText(Adapt.audio.textSize);
                }
            } else {
                this.reRender();
            }
        },

        events: function() {
            return {
                'click .hotgraphic-graphic-pin': 'onItemClicked'
            }
        },

        preRender: function() {
            this.listenTo(Adapt, 'device:changed', this.reRender, this);
            this.listenTo(Adapt, "audio:changeText", this.replaceText);
            this.listenTo(Adapt, 'notify:closed', this.closeNotify, this);

            // Checks to see if the hotgraphic should be reset on revisit
            this.checkIfResetOnRevisit();
        },

        postRender: function() {
            this.renderState();
            this.$('.hotgraphic-widget').imageready(_.bind(function() {
                this.setReadyStatus();
            }, this));

            this.setupEventListeners();

            var componentActive = false;
            var activeItem = 0;

            // Set string of elements to show the navigation arrows
            this.interactionNav = "<div class='notify-popup-navigation'><button class='base notify-popup-arrow notify-popup-arrow-l' id='notify-arrow-back' role='button'><div class='icon icon-controls-left'></div></button><button class='base notify-popup-arrow notify-popup-arrow-r' id='notify-arrow-next' role='button'><div class='icon icon-controls-right'></div></button></div>";
        },

        // Used to check if the hotgraphic should reset on revisit
        checkIfResetOnRevisit: function() {
            var isResetOnRevisit = this.model.get('_isResetOnRevisit');

            // If reset is enabled set defaults
            if (isResetOnRevisit) {
                this.model.reset(isResetOnRevisit);

                _.each(this.model.get('_items'), function(item) {
                    item._isVisited = false;
                });
            }
        },

        reRender: function() {
            if (Adapt.device.screenSize != 'large') {
                this.replaceWithNarrative();
            }
        },

        inview: function(event, visible, visiblePartX, visiblePartY) {
            if (visible) {
                if (visiblePartY === 'top') {
                    this._isVisibleTop = true;
                } else if (visiblePartY === 'bottom') {
                    this._isVisibleBottom = true;
                } else {
                    this._isVisibleTop = true;
                    this._isVisibleBottom = true;
                }

                if (this._isVisibleTop && this._isVisibleBottom) {
                    this.$('.component-inner').off('inview');
                    this.setCompletionStatus();
                }
            }
        },

        replaceWithNarrative: function() {
            if (!Adapt.componentStore.narrativeAudio) throw "Narrative not included in build";
            var Narrative = Adapt.componentStore.narrativeAudio;

            var model = this.prepareNarrativeModel();
            var newNarrative = new Narrative({ model: model });
            var $container = $(".component-container", $("." + this.model.get("_parentId")));

            newNarrative.reRender();
            newNarrative.setupNarrative();
            $container.append(newNarrative.$el);
            Adapt.trigger('device:resize');
            _.defer(_.bind(function () {
                this.remove();
            }, this));
        },

        prepareNarrativeModel: function() {
            var model = this.model;
            model.set('_component', 'narrativeAudio');
            model.set('_wasHotgraphic', true);
            model.set('originalBody', model.get('body'));
            model.set('originalInstruction', model.get('instruction'));
            if (model.get('mobileBody')) {
                model.set('body', model.get('mobileBody'));
            }
            if (model.get('mobileInstruction')) {
                model.set('instruction', model.get('mobileInstruction'));
            }

            return model;
        },

        setVisited: function(index) {
            var item = this.model.get('_items')[index];
            item._isVisited = true;

            var $pin = this.$('.hotgraphic-graphic-pin').eq(index);
            $pin.addClass('visited');
            // append the word 'visited.' to the pin's aria-label
            var visitedLabel = this.model.get('_globals')._accessibility._ariaLabels.visited + ".";
            $pin.attr('aria-label', function(index, val) {return val + " " + visitedLabel});

            $.a11y_alert("visited");

            ///// Audio /////
            if (this.model.has('_audio') && this.model.get('_audio')._isEnabled && Adapt.audio.audioClip[this.model.get('_audio')._channel].status==1) {
              // Reset onscreen id
              Adapt.audio.audioClip[this.model.get('_audio')._channel].onscreenID = "";
              // Trigger audio
              Adapt.trigger('audio:playAudio', item._audio.src, this.model.get('_id'), this.model.get('_audio')._channel);
            }
            ///// End of Audio /////
        },

        getVisitedItems: function() {
            return _.filter(this.model.get('_items'), function(item) {
                return item._isVisited;
            });
        },

        checkCompletionStatus: function() {
            if (this.getVisitedItems().length == this.model.get('_items').length) {
                this.trigger('allItems');
            }
        },

        onCompletion: function() {
            this.setCompletionStatus();
            if (this.completionEvent && this.completionEvent != 'inview') {
                this.off(this.completionEvent, this);
            }
        },

        setupEventListeners: function() {
            this.completionEvent = (!this.model.get('_setCompletionOn')) ? 'allItems' : this.model.get('_setCompletionOn');
            if (this.completionEvent !== 'inview') {
                this.on(this.completionEvent, _.bind(this.onCompletion, this));
            } else {
                this.$('.component-widget').on('inview', _.bind(this.inview, this));
            }
        },

        onItemClicked: function(event) {
            event.preventDefault();

            this.$('.hotgraphic-graphic-pin.active').removeClass('active');

            var $currentHotSpot = this.$('.' + $(event.currentTarget).data('id'));
            $currentHotSpot.addClass('active');

            var currentIndex = this.$('.hotgraphic-graphic-pin.active').index() - 1;
            this.setVisited(currentIndex);

            var itemModel = this.model.get('_items')[currentIndex];

            componentActive = true;

            activeItem = currentIndex;
            this.showItemContent(itemModel);
        },

        showItemContent: function(itemModel) {
            if(this.isPopupOpen) return;// ensure multiple clicks don't open multiple notify popups

            // Set popup text to default full size
              var popupObject_title = itemModel.title;
              var popupObject_body = itemModel.body;
              var interactionObject_body = "";

              // If reduced text is enabled and selected
              if (Adapt.course.get('_audio') && Adapt.course.get('_audio')._reducedTextisEnabled && this.model.get('_audio') && this.model.get('_audio')._reducedTextisEnabled && Adapt.audio.textSize == 1) {
                  popupObject_title = itemModel.titleReduced;
                  popupObject_body = itemModel.bodyReduced;
              }

              // Check if item has no text - just show graphic
              if(popupObject_body == "") {
                  interactionObject_body = "<div class='notify-container'><div class='notify-graphic fullwidth'><img src='" + itemModel._graphic.src + "' alt='" + itemModel._graphic.alt + "'/></div></div>";
              } else {
                  // Else show text and check if item has a graphic
                  if(itemModel._graphic && itemModel._graphic.src != "") {
                      interactionObject_body = "<div class='notify-container'><div class='notify-graphic'><img src='" + itemModel._graphic.src + "' alt='" + itemModel._graphic.alt + "'/></div><div class='notify-body'>" + popupObject_body + "</div></div>";
                  } else {
                      interactionObject_body = "<div class='notify-container'><div class='notify-body'>" + popupObject_body + "</div></div>";
                  }
              }

              // Add interactionNav to body based on the '_canCycleThroughPagination' setting
              if(this.model.get('_canCycleThroughPagination')) {
                  var interactionObject = {
                      title: popupObject_title,
                      body: interactionObject_body+this.interactionNav
                  }
                  Adapt.trigger('notify:popup', interactionObject);
                  // Delay showing the nav arrows until notify has faded in
                  _.delay(_.bind(function() {
                      this.updateNotifyNav(activeItem);
                  }, this), 600);

              } else {
                  var popupObject = {
                      title: popupObject_title,
                      body: interactionObject_body
                  }
                  Adapt.trigger('notify:popup', popupObject);
              }

            Adapt.once("notify:closed", _.bind(function() {
                this.isPopupOpen = false;
                ///// Audio /////
                if (Adapt.course.get('_audio') && Adapt.course.get('_audio')._isEnabled && this.model.has('_audio') && this.model.get('_audio')._isEnabled) {
                    Adapt.trigger('audio:pauseAudio', this.model.get('_audio')._channel);
                }
                ///// End of Audio /////
                this.$('.hotgraphic-graphic-pin.active').removeClass('active');
                //
            }, this));
        },

        previousItem: function (event) {
            activeItem--;
            this.updateNotifyContent(activeItem);
        },

        nextItem: function (event) {
            activeItem++;
            this.updateNotifyContent(activeItem);
        },

        updateNotifyContent: function(index) {

            this.$('.hotgraphic-graphic-pin.active').removeClass('active');

            var itemModel = this.model.get('_items')[index];

            // Set popup text to default full size
            var popupObject_title = itemModel.title;
            var popupObject_body = itemModel.body;
            var interactionObject_body = "";

            // If reduced text is enabled and selected
            if (Adapt.course.get('_audio') && Adapt.course.get('_audio')._reducedTextisEnabled && this.model.get('_audio') && this.model.get('_audio')._reducedTextisEnabled && Adapt.audio.textSize == 1) {
                popupObject_title = itemModel.titleReduced;
                popupObject_body = itemModel.bodyReduced;
            }

            // Check if item has no text - just show graphic
            if(popupObject_body == "") {
                interactionObject_body = "<div class='notify-container'><div class='notify-graphic fullwidth'><img src='" + itemModel._graphic.src + "' alt='" + itemModel._graphic.alt + "'/></div></div>";
            } else {
                // Else show text and check if item has a graphic
                if(itemModel._graphic && itemModel._graphic.src != "") {
                    interactionObject_body = "<div class='notify-container'><div class='notify-graphic'><img src='" + itemModel._graphic.src + "' alt='" + itemModel._graphic.alt + "'/></div><div class='notify-body'>" + popupObject_body + "</div></div>";
                } else {
                    interactionObject_body = "<div class='notify-container'><div class='notify-body'>" + popupObject_body + "</div></div>";
                }
            }

            // Update elements
            $('.notify-popup-title-inner').html(popupObject_title);
            $('.notify-popup-body-inner').html(interactionObject_body+this.interactionNav);

            this.setVisited(index);

            this.updateNotifyNav(activeItem);

            Adapt.trigger('device:resize');
        },

        updateNotifyNav: function (index) {
            // Hide buttons
            if(index === 0) {
                $('#notify-arrow-back').css('visibility','hidden');
                $('notify-popup-arrow-l').css('visibility','hidden');
            }
            if(index === (this.model.get('_items').length)-1) {
                $('#notify-arrow-next').css('visibility','hidden');
                $('notify-popup-arrow-r').css('visibility','hidden');
            }
            // Show buttons
            if(index > 0) {
                $('#notify-arrow-back').css('visibility','visible');
                $('notify-popup-arrow-l').css('visibility','visible');
            }
            if(index < (this.model.get('_items').length)-1) {
                $('#notify-arrow-next').css('visibility','visible');
                $('notify-popup-arrow-r').css('visibility','visible');
            }

            // Add listerner to notify nav arrows
            $('.notify-popup-arrow-l').on('click', _.bind(this.previousItem, this));
            $('.notify-popup-arrow-r').on('click', _.bind(this.nextItem, this));
            //
        },

        closeNotify: function() {
            this.checkCompletionStatus();

            $('.notify-popup-arrow-l').off('click');
            $('.notify-popup-arrow-r').off('click');

            componentActive = false;
        },

        // Reduced text
        replaceText: function(value) {
            // If enabled
            if (Adapt.course.get('_audio') && Adapt.course.get('_audio')._reducedTextisEnabled && this.model.get('_audio') && this.model.get('_audio')._reducedTextisEnabled) {
                // Change each items title and body
                for (var i = 0; i < this.model.get('_items').length; i++) {
                    if(value == 0) {
                        this.$('.hotgraphic-content-title').eq(i).html(this.model.get('_items')[i].title);
                        this.$('.hotgraphic-content-body').eq(i).html(this.model.get('_items')[i].body);
                    } else {
                        this.$('.hotgraphic-content-title').eq(i).html(this.model.get('_items')[i].titleReduced);
                        this.$('.hotgraphic-content-body').eq(i).html(this.model.get('_items')[i].bodyReduced);
                    }
                }
            }
        }

    });

    Adapt.register('hotgraphicAudio', HotGraphicAudio);

    return HotGraphicAudio;

});
