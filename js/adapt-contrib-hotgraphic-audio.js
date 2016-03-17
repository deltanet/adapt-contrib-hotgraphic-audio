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

                if (Adapt.config.get('_audio') && Adapt.config.get('_audio')._isReducedTextEnabled && this.model.get('_reducedText') && this.model.get('_reducedText')._isEnabled) {
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

            // Listen for text change on audio extension
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
        },

        setupNotifyListeners: function() {
            if (componentActive == true) {
                this.listenTo(Adapt, 'hotgraphicNotify:back', this.previousItem);
                this.listenTo(Adapt, 'hotgraphicNotify:next', this.nextItem);
            }
        },

        removeNotifyListeners: function() {;
            this.stopListening(Adapt, 'hotgraphicNotify:back', this.previousItem);
            this.stopListening(Adapt, 'hotgraphicNotify:next', this.nextItem);
            componentActive = false;
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
            if (!Adapt.componentStore.narrative) throw "Narrative not included in build";
            var Narrative = Adapt.componentStore.narrative;

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
            model.set('_component', 'narrative');
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
        /*
        applyNavigationClasses: function (index) {
            var $nav = this.$('.hotgraphic-popup-nav'),
                itemCount = this.$('.hotgraphic-item').length;

            $nav.removeClass('first').removeClass('last');
            this.$('.hotgraphic-popup-done').a11y_cntrl_enabled(true);
            if(index <= 0 && !this.model.get('_canCycleThroughPagination')) {
                this.$('.hotgraphic-popup-nav').addClass('first');
                this.$('.hotgraphic-popup-controls.back').a11y_cntrl_enabled(false);
                this.$('.hotgraphic-popup-controls.next').a11y_cntrl_enabled(true);
            } else if (index >= itemCount-1 && !this.model.get('_canCycleThroughPagination')) {
                this.$('.hotgraphic-popup-nav').addClass('last');
                this.$('.hotgraphic-popup-controls.back').a11y_cntrl_enabled(true);
                this.$('.hotgraphic-popup-controls.next').a11y_cntrl_enabled(false);
            } else {
                this.$('.hotgraphic-popup-controls.back').a11y_cntrl_enabled(true);
                this.$('.hotgraphic-popup-controls.next').a11y_cntrl_enabled(true);
            }
            var classes = this.model.get("_items")[index]._classes 
                ? this.model.get("_items")[index]._classes
                : '';  // _classes has not been defined
      
            this.$('.hotgraphic-popup').attr('class', 'hotgraphic-popup ' + 'item-' + index + ' ' + classes);

        },
        */

        /*
        openHotGraphic: function (event) {
            event.preventDefault();
            this.$('.hotgraphic-popup-inner').a11y_on(false);
            var currentHotSpot = $(event.currentTarget).data('id');
            this.$('.hotgraphic-item').hide().removeClass('active');
            this.$('.'+currentHotSpot).show().addClass('active');
            var currentIndex = this.$('.hotgraphic-item.active').index();
            this.setVisited(currentIndex);
            this.$('.hotgraphic-popup-count .current').html(currentIndex+1);
            this.$('.hotgraphic-popup-count .total').html(this.$('.hotgraphic-item').length);
            this.$('.hotgraphic-popup').attr('class', 'hotgraphic-popup ' + 'item-' + currentIndex);
            this.$('.hotgraphic-popup').show();
            this.$('.hotgraphic-popup-inner .active').a11y_on(true);

            Adapt.trigger('popup:opened',  this.$('.hotgraphic-popup-inner'));

            this.$('.hotgraphic-popup-inner .active').a11y_focus();
            this.applyNavigationClasses(currentIndex);
        },
        */
        /*
        closeHotGraphic: function(event) {
            event.preventDefault();
            var currentIndex = this.$('.hotgraphic-item.active').index();
            this.$('.hotgraphic-popup').hide();
            Adapt.trigger('popup:closed',  this.$('.hotgraphic-popup-inner'));

            ///// Audio /////
            if (this.model.has('_audio') && this.model.get('_audio')._isEnabled && Adapt.audio.audioClip[this.model.get('_audio')._channel].status==1) {
                Adapt.trigger('audio:pauseAudio', this.model.get('_audio')._channel);
            }
            ///// End of Audio /////
        },
        */
        /*
        previousHotGraphic: function (event) {
            event.preventDefault();
            var currentIndex = this.$('.hotgraphic-item.active').index();

            if (currentIndex === 0 && !this.model.get('_canCycleThroughPagination')) {
                return;
            } else if (currentIndex === 0 && this.model.get('_canCycleThroughPagination')) {
                currentIndex = this.model.get('_items').length;
            }

            this.$('.hotgraphic-item.active').hide().removeClass('active');
            this.$('.hotgraphic-item').eq(currentIndex-1).show().addClass('active');
            this.setVisited(currentIndex-1);
            this.$('.hotgraphic-popup-count .current').html(currentIndex);
            this.$('.hotgraphic-popup-inner').a11y_on(false);

            this.applyNavigationClasses(currentIndex-1);
            this.$('.hotgraphic-popup-inner .active').a11y_on(true);
            this.$('.hotgraphic-popup-inner .active').a11y_focus();
        },
        */
        /*
        nextHotGraphic: function (event) {
            event.preventDefault();
            var currentIndex = this.$('.hotgraphic-item.active').index();
            if (currentIndex === (this.model.get('_items').length-1) && !this.model.get('_canCycleThroughPagination')) {
                return;
            } else if (currentIndex === (this.model.get('_items').length-1) && this.model.get('_canCycleThroughPagination')) {
                currentIndex = -1;
            }
            this.$('.hotgraphic-item.active').hide().removeClass('active');
            this.$('.hotgraphic-item').eq(currentIndex+1).show().addClass('active');
            this.setVisited(currentIndex+1);
            this.$('.hotgraphic-popup-count .current').html(currentIndex+2);
            this.$('.hotgraphic-popup-inner').a11y_on(false);

            this.applyNavigationClasses(currentIndex+1);
            this.$('.hotgraphic-popup-inner .active').a11y_on(true);
            this.$('.hotgraphic-popup-inner .active').a11y_focus();
        },
        */

        setVisited: function(index) {
            var item = this.model.get('_items')[index];
            item._isVisited = true;

            var $pin = this.$('.hotgraphic-graphic-pin').eq(index);
            $pin.addClass('visited');
            // append the word 'visited.' to the pin's aria-label
            var visitedLabel = this.model.get('_globals')._accessibility._ariaLabels.visited + ".";
            $pin.attr('aria-label', function(index, val) {return val + " " + visitedLabel});

            $.a11y_alert("visited");

            this.checkCompletionStatus();

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
            this.$('.hotgraphic-item.active').removeClass('active');

            var currentHotSpot = $(event.currentTarget).data('id');
            this.$('.'+currentHotSpot).addClass('active');
            var currentIndex = this.$('.hotgraphic-item.active').index();
            this.setVisited(currentIndex);

            var itemModel = this.model.get('_items')[currentIndex];

            componentActive = true;

            activeItem = currentIndex;
            this.showItemContent(itemModel);
        },

        showItemContent: function(itemModel) {
            if(this.isPopupOpen) return;// ensure multiple clicks don't open multiple notify popups

            this.setupNotifyListeners();

            // Set popup text to default full size
            var popupObject_title = itemModel.title;
            var popupObject_body = itemModel.body;

            // If reduced text is enabled and selected
            if (Adapt.config.get('_audio') && Adapt.config.get('_audio')._isReducedTextEnabled && this.model.get('_reducedText') && this.model.get('_reducedText')._isEnabled && Adapt.audio.textSize == 1) {
                popupObject_title = itemModel.titleReduced;
                popupObject_body = itemModel.bodyReduced;
            }

            // Trigger which type of notify based on the '_canCycleThroughPagination' setting
            if(this.model.get('_canCycleThroughPagination')) {
                var interactionObject = {
                    title: popupObject_title,
                    body: "<div class='notify-container'><div class='notify-body'>" + popupObject_body + "</div>" +
                        "<img class='notify-graphic' src='" +
                        itemModel._graphic.src + "' alt='" +
                        itemModel._graphic.alt + "'/></div>",
                    _back:[
                        {
                            _callbackEvent: "hotgraphicNotify:back"
                        }
                    ],
                    _next:[
                        {
                            _callbackEvent: "hotgraphicNotify:next"
                        }
                    ],
                    _showIcon: false
                }
                Adapt.trigger('notify:interaction', interactionObject);

                // Delay showing the nav arrows until notify has faded in
                _.delay(_.bind(function() {
                    this.updateNotifyNav(activeItem);
                }, this), 600);

            } else {
                var popupObject = {
                    title: popupObject_title,
                    body: "<div class='notify-container'><div class='notify-body'>" + popupObject_body + "</div>" +
                        "<img class='notify-graphic' src='" +
                        itemModel._graphic.src + "' alt='" +
                        itemModel._graphic.alt + "'/></div>"
                }
                Adapt.trigger('notify:popup', popupObject);
            }

            Adapt.once("notify:closed", _.bind(function() {
                this.isPopupOpen = false;
                ///// Audio /////
                if (this.model.has('_audio') && this.model.get('_audio')._isEnabled) {
                    Adapt.trigger('audio:pauseAudio', this.model.get('_audio')._channel);
                }
                ///// End of Audio /////
                this.$('.hotgraphic-item.active').removeClass('active');
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

            this.$('.hotgraphic-item.active').removeClass('active');

            var itemModel = this.model.get('_items')[index];

            // Set popup text to default full size
            var popupObject_title = itemModel.title;
            var popupObject_body = itemModel.body;

            // If reduced text is enabled and selected
            if (Adapt.config.get('_audio') && Adapt.config.get('_audio')._isReducedTextEnabled && this.model.get('_reducedText') && this.model.get('_reducedText')._isEnabled && Adapt.audio.textSize == 1) {
                popupObject_title = itemModel.titleReduced;
                popupObject_body = itemModel.bodyReduced;
            }

            $('.notify-popup-title-inner').html(popupObject_title);
            $('.notify-popup-body-inner').html("<div class='notify-container'><div class='notify-body'>" + popupObject_body + "</div>" +
                "<img class='notify-graphic' src='" +
                itemModel._graphic.src + "' alt='" +
                itemModel._graphic.alt + "'/></div>");

            this.setVisited(index);

            this.updateNotifyNav(activeItem);
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
        },

        closeNotify: function() {
            this.removeNotifyListeners();
        },

        // Reduced text
        replaceText: function(value) {
            // If enabled
            if (Adapt.config.get('_audio') && Adapt.config.get('_audio')._isReducedTextEnabled && this.model.get('_reducedText') && this.model.get('_reducedText')._isEnabled) {
                // Change component title and body
                if(value == 0) {
                    if (this.model.get('displayTitle')) {
                        this.$('.component-title-inner').html(this.model.get('displayTitle')).a11y_text();
                    }
                    if (this.model.get('body')) {
                        this.$('.component-body-inner').html(this.model.get('body')).a11y_text();
                    }
                } else {
                    if (this.model.get('displayTitleReduced')) {
                        this.$('.component-title-inner').html(this.model.get('displayTitleReduced')).a11y_text();
                    }
                    if (this.model.get('bodyReduced')) {
                        this.$('.component-body-inner').html(this.model.get('bodyReduced')).a11y_text();
                    }
                }
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

    Adapt.register('hotgraphic-audio', HotGraphicAudio);

    return HotGraphicAudio;

});