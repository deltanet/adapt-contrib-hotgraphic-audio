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
                'click .hotgraphic-graphic-pin': 'onItemClicked',
                'click .hotgraphic-popup-back': 'previousItem',
                'click .hotgraphic-popup-next': 'nextItem',
                'click .hotgraphic-popup-close': 'closePopup',
                'click .hotgraphic-shadow': 'closePopup'
            }
        },

        preRender: function() {
            this.listenTo(Adapt, 'device:changed', this.reRender, this);

            // Listen for text change on audio extension
            this.listenTo(Adapt, "audio:changeText", this.replaceText);

            _.bindAll(this, 'onKeyUp');

            // Checks to see if the hotgraphic should be reset on revisit
            this.checkIfResetOnRevisit();
        },

        postRender: function() {
            this.renderState();
            this.$('.hotgraphic-widget').imageready(_.bind(function() {
                this.setReadyStatus();
            }, this));

            this.setupEventListeners();

            var activeItem = 0;
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
            $('body').scrollEnable();
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
            this.$('.hotgraphic-popup-inner').a11y_on(false);
            this.$('.hotgraphic-popup-item.active').removeClass('active');

            this.$('.hotgraphic-popup-item').hide();

            var currentHotSpot = $(event.currentTarget).data('id');
            this.$('.'+currentHotSpot).addClass('active');
            var currentIndex = this.$('.hotgraphic-popup-item.active').index();
            this.setVisited(currentIndex);

            var itemModel = this.model.get('_items')[currentIndex];

            activeItem = currentIndex;

            this.resizeElements(activeItem);

            this.$('.item-'+activeItem).show();

            this.openPopup(activeItem);
        },

        previousItem: function (event) {
            activeItem--;
            this.updatePopupContent(activeItem);
        },

        nextItem: function (event) {
            activeItem++;
            this.updatePopupContent(activeItem);
        },

        resizeElements: function(activeItem) {
          var itemModel = this.model.get('_items')[activeItem];
          // Check if item has no text - show graphic fullwidth
          if(itemModel.body == "") {
            this.$('.item-'+activeItem+ ' > .hotgraphic-popup-graphic').addClass('fullwidth');
          }
          // Check if item has no graphic - show text fullwidth
          if(itemModel._graphic.src == "") {
            this.$('.item-'+activeItem+ ' > .hotgraphic-popup-graphic').addClass('hidden');
          }
        },

        updatePopupContent: function(activeItem) {

            this.$('.hotgraphic-popup-item.active').removeClass('active');

            var popupItems = this.$(".hotgraphic-narrative").children();
            this.$(popupItems[activeItem]).addClass('active');

            var itemModel = this.model.get('_items')[activeItem];

            this.$('.hotgraphic-popup-item').hide();

            if(!itemModel.visited) {
              this.$(popupItems[activeItem]).addClass("visited");
              itemModel.visited = true;
            }

            this.resizeElements(activeItem);

            this.$('.item-'+activeItem).show();

            ///// Audio /////
            if (Adapt.course.get('_audio') && Adapt.course.get('_audio')._isEnabled && this.model.has('_audio') && this.model.get('_audio')._isEnabled && Adapt.audio.audioClip[this.model.get('_audio')._channel].status==1) {
                // Trigger audio
                Adapt.trigger('audio:playAudio', itemModel._audio.src, this.model.get('_id'), this.model.get('_audio')._channel);
            }
            ///// End of Audio /////

            this.setVisited(activeItem);

            if(this.model.get('_canCycleThroughPagination')) {
              this.updatePopupNav(activeItem);
            }

            this.resizePopup();
        },

        openPopup: function(activeItem) {

          var itemModel = this.model.get('_items')[activeItem];

          if(this.model.get('_canCycleThroughPagination')) {
            this.updatePopupNav(activeItem);
          }

          if (this.disableAnimation) {
              this.$('.hotgraphic-shadow').css("display", "block");
          } else {
            // Show shadow
            this.$('.hotgraphic-shadow').velocity({ opacity: 0 }, {duration:0}).velocity({ opacity: 1 }, {duration:400, begin: _.bind(function() {
              this.$('.hotgraphic-shadow').css("display", "block");
            }, this)});

          }

          this.resizePopup();

          if (this.disableAnimation) {
            this.$('.hotgraphic-popup').css("display", "block");
              complete.call(this);
            } else {
              this.$('.hotgraphic-popup').velocity({ opacity: 0 }, {duration:0}).velocity({ opacity: 1 }, { duration:400, begin: _.bind(function() {
              this.$('.hotgraphic-popup').css("display", "block");
              complete.call(this);
          }, this) });

          function complete() {
            /*ALLOWS POPUP MANAGER TO CONTROL FOCUS*/
            Adapt.trigger('popup:opened', this.$('.hotgraphic-popup'));
            $('body').scrollDisable();

            //set focus to first accessible element
            this.$('.hotgraphic-popup').a11y_focus();

            ///// Audio /////
            if (Adapt.course.get('_audio') && Adapt.course.get('_audio')._isEnabled && this.model.has('_audio') && this.model.get('_audio')._isEnabled && Adapt.audio.audioClip[this.model.get('_audio')._channel].status==1) {
              // Trigger audio
              Adapt.trigger('audio:playAudio', itemModel._audio.src, this.model.get('_id'), this.model.get('_audio')._channel);
            }
            ///// End of Audio /////
          }

          this.isPopupOpen = true;
          Adapt.trigger('popup:opened',  this.$('.hotgraphic-popup-inner'));
          this.$('.hotgraphic-popup-inner .active').a11y_focus();
          this.setupEscapeKey();
        }
      },

      updatePopupNav: function (index) {
            // Hide buttons
            if(index === 0) {
                this.$('.hotgraphic-popup-back').css('visibility','hidden');
            }
            if(index === (this.model.get('_items').length)-1) {
                this.$('.hotgraphic-popup-next').css('visibility','hidden');
            }
            // Show buttons
            if(index > 0) {
                this.$('.hotgraphic-popup-back').css('visibility','visible');
            }
            if(index < (this.model.get('_items').length)-1) {
                this.$('.hotgraphic-popup-next').css('visibility','visible');
            }
        },

        closePopup: function(event) {
          event.preventDefault();
          if (this.disableAnimation) {

              this.$('.hotgraphic-popup').css("display", "none");
              this.$('.hotgraphic-shadow').css("display", "none");

          } else {

              this.$('.hotgraphic-popup').velocity({ opacity: 0 }, {duration:400, complete: _.bind(function() {
                  this.$('.hotgraphic-popup').css("display", "none");
              }, this)});

              this.$('.hotgraphic-shadow').velocity({ opacity: 0 }, {duration:400, complete:_.bind(function() {
                  this.$('.hotgraphic-shadow').css("display", "none");
              }, this)});
          }

          this.isPopupOpen = false;

          Adapt.trigger('popup:closed',  this.$('.hotgraphic-popup-inner'));

          $('body').scrollEnable();

          ///// Audio /////
          if (Adapt.course.get('_audio') && Adapt.course.get('_audio')._isEnabled && this.model.has('_audio') && this.model.get('_audio')._isEnabled) {
              Adapt.trigger('audio:pauseAudio', this.model.get('_audio')._channel);
          }
          ///// End of Audio /////
          this.$('.hotgraphic-grid-item.active').removeClass('active');
          //
          this.checkCompletionStatus();
        },

        resizePopup: function() {
            var windowHeight = $(window).height();
            var popupHeight = this.$('.hotgraphic-popup').outerHeight();

            if (popupHeight > windowHeight) {
                this.$('.hotgraphic-popup').css({
                    'height':'100%',
                    'top':0,
                    'overflow-y': 'scroll',
                    '-webkit-overflow-scrolling': 'touch'
                });
            } else {
                this.$('.hotgraphic-popup').css({
                    'margin-top': -(popupHeight/2)
                });
            }
        },

        // Reduced text
        replaceText: function(value) {
          // If enabled
          if (Adapt.course.get('_audio') && Adapt.course.get('_audio')._reducedTextisEnabled && this.model.get('_audio') && this.model.get('_audio')._reducedTextisEnabled) {
              // Change each items title and body
              for (var i = 0; i < this.model.get('_items').length; i++) {
                  if(value == 0) {
                      this.$('.item-'+i).find('.hotgraphic-popup-title-inner').html(this.model.get('_items')[i].title);
                      this.$('.item-'+i).find('.hotgraphic-popup-body-inner').html(this.model.get('_items')[i].body).a11y_text();
                  } else {
                      this.$('.item-'+i).find('.hotgraphic-popup-title-inner').html(this.model.get('_items')[i].titleReduced);
                      this.$('.item-'+i).find('.hotgraphic-popup-body-inner').html(this.model.get('_items')[i].bodyReduced).a11y_text();
                  }
              }
          }
      },

        setupEscapeKey: function() {
          var hasAccessibility = Adapt.config.has('_accessibility') && Adapt.config.get('_accessibility')._isActive;

          if (!hasAccessibility && this.isPopupOpen) {
              $(window).on("keyup", this.onKeyUp);
          } else {
              $(window).off("keyup", this.onKeyUp);
          }
        },

        onAccessibilityToggle: function() {
            this.setupEscapeKey();
        },

        onKeyUp: function(event) {
            if (event.which != 27) return;
            event.preventDefault();
            this.closePopup();
        }

    });

    Adapt.register('hotgraphicAudio', HotGraphicAudio);

    return HotGraphicAudio;

});
