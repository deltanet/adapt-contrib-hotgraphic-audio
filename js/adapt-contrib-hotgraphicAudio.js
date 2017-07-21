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
            this.listenTo(Adapt, "audio:changeText", this.replaceText);
            this.listenTo(Adapt, 'device:resize', this.resetPopup);

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

            this.isPopupOpen = false;
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

            if(this.model.get('_useGraphicsAsPins')) {
              this.$('.hotgraphic-graphic-pin-image.active').removeClass('active');
            } else {
              this.$('.hotgraphic-graphic-pin.active').removeClass('active');
            }

            this.$('.hotgraphic-popup-item').hide();

            var $currentHotSpot = this.$('.' + $(event.currentTarget).data('id'));

            $currentHotSpot.addClass('active');

            if(this.model.get('_useGraphicsAsPins')) {
              var currentIndex = this.$('.hotgraphic-graphic-pin-image.active').parent().index();
            } else {
              if(this.model.get('_graphic').attribution) {
                var currentIndex = this.$('.hotgraphic-graphic-pin.active').index() - 2;
              } else {
                var currentIndex = this.$('.hotgraphic-graphic-pin.active').index() - 1;
              }
            }

            this.setVisited(currentIndex);

            var itemModel = this.model.get('_items')[currentIndex];

            activeItem = currentIndex;

            this.resizeElements(activeItem);

            this.isPopupOpen = true;

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
              // Reset onscreen id
              Adapt.audio.audioClip[this.model.get('_audio')._channel].onscreenID = "";
              // Trigger audio
              Adapt.trigger('audio:playAudio', itemModel._audio.src, this.model.get('_id'), this.model.get('_audio')._channel);
            }
            ///// End of Audio /////

            this.setVisited(activeItem);

            this.updatePopupNav(activeItem);
            this.resetPopup();
        },

        updatePopupNav: function (index) {
          // Hide all
          this.$('.hotgraphic-popup-back').css('visibility','hidden');
          this.$('.hotgraphic-popup-next').css('visibility','hidden');

          // Show buttons
          if(index > 0) {
            this.$('.hotgraphic-popup-back').css('visibility','visible');
          }
          if(index < (this.model.get('_items').length)-1) {
            this.$('.hotgraphic-popup-next').css('visibility','visible');
          }

        },

        openPopup: function(activeItem) {

          this.isPopupOpen = true;

          if (this.disableAnimation) {
            $('#shadow').removeClass("display-none");
          } else {
            $('#shadow').velocity({opacity:1},{duration:400, begin: _.bind(function() {
                $("#shadow").removeClass("display-none");
            }, this)});
          }
          $('#shadow').css("z-index","549");

          $('body').scrollDisable();

          var itemModel = this.model.get('_items')[activeItem];

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

            this.resetPopup();

            //set focus to first accessible element
            this.$('.hotgraphic-popup').a11y_focus();

            if(this.model.get('_canCycleThroughPagination')) {
              _.delay(_.bind(function() {
                this.updatePopupNav(activeItem);
              }, this), 400);
            }

            ///// Audio /////
            if (Adapt.course.get('_audio') && Adapt.course.get('_audio')._isEnabled && this.model.has('_audio') && this.model.get('_audio')._isEnabled && Adapt.audio.audioClip[this.model.get('_audio')._channel].status==1) {
              // Reset onscreen id
              Adapt.audio.audioClip[this.model.get('_audio')._channel].onscreenID = "";
              // Trigger audio
              Adapt.trigger('audio:playAudio', itemModel._audio.src, this.model.get('_id'), this.model.get('_audio')._channel);
            }
            ///// End of Audio /////
          }

          $('#shadow').on('click', _.bind(this.closePopup, this));

          this.setupEscapeKey();
        }
      },

        closePopup: function(event) {
          event.preventDefault();

          if (this.disableAnimation) {
            $('#shadow').addClass("display-none");
          } else {
            $('#shadow').velocity({opacity:0}, {duration:400, complete:function() {
                $('#shadow').addClass("display-none");
            }});
          }
          $('#shadow').css("z-index","500");

          if (this.disableAnimation) {
              this.$('.hotgraphic-popup').css("display", "none");
          } else {
              this.$('.hotgraphic-popup').velocity({ opacity: 0 }, {duration:400, complete: _.bind(function() {
                  this.$('.hotgraphic-popup').css("display", "none");
              }, this)});
          }

          Adapt.trigger('popup:closed',  this.$('.hotgraphic-popup'));

          $('body').scrollEnable();

          ///// Audio /////
          if (Adapt.course.get('_audio') && Adapt.course.get('_audio')._isEnabled && this.model.has('_audio') && this.model.get('_audio')._isEnabled) {
              Adapt.trigger('audio:pauseAudio', this.model.get('_audio')._channel);
          }
          ///// End of Audio /////

          this.$('.hotgraphic-popup-item.active').removeClass('active');

          this.$('.hotgraphic-popup-back').css('visibility','hidden');
          this.$('.hotgraphic-popup-next').css('visibility','hidden');

          this.checkCompletionStatus();

          $('#shadow').off('click');

          this.isPopupOpen = false;

        },

        resizePopup: function() {
            var windowHeight = $(window).height();
            var popupHeight = this.$('.hotgraphic-popup').outerHeight();

            if (popupHeight > windowHeight) {
              this.$('.hotgraphic-popup').addClass('small');
              this.$('.hotgraphic-popup').css({
                'margin-top': 0
              });
            } else {
              this.$('.hotgraphic-popup').addClass('large');
              this.$('.hotgraphic-popup').css({
                'margin-top': -(popupHeight/2)
              });
            }
        },

        resetPopup: function() {
          if(this.isPopupOpen) {
            this.$('.hotgraphic-popup').removeClass('large');
            this.$('.hotgraphic-popup').removeClass('small');
            this.resizePopup();
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
      },

        // Reduced text
        replaceText: function(value) {
            // If enabled
            if (Adapt.course.get('_audio') && Adapt.course.get('_audio')._reducedTextisEnabled && this.model.get('_audio') && this.model.get('_audio')._reducedTextisEnabled) {
                // Change each items title and body
                for (var i = 0; i < this.model.get('_items').length; i++) {
                    if(value == 0) {
                      this.$('.hotgraphic-popup-title-inner').eq(i).html(this.model.get('_items')[i].title);
                      this.$('.hotgraphic-popup-body-inner').eq(i).html(this.model.get('_items')[i].body);
                  } else {
                      this.$('.hotgraphic-popup-title-inner').eq(i).html(this.model.get('_items')[i].titleReduced);
                      this.$('.hotgraphic-popup-body-inner').eq(i).html(this.model.get('_items')[i].bodyReduced);
                    }
                }
            }
        }

    });

    Adapt.register('hotgraphicAudio', HotGraphicAudio);

    return HotGraphicAudio;

});
