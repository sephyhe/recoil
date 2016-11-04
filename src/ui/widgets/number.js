goog.provide('recoil.ui.widgets.NumberWidget');


goog.require('goog.events');
goog.require('goog.events.InputHandler');
goog.require('goog.events.KeyCodes');
goog.require('goog.events.PasteHandler');
goog.require('goog.ui.Component');
goog.require('goog.ui.Tooltip');
goog.require('recoil.frp.Util');
goog.require('recoil.ui.BoolWithExplanation');
goog.require('recoil.ui.LabeledWidget');
goog.require('recoil.ui.TooltipHelper');
goog.require('recoil.ui.Widget');
goog.require('recoil.ui.widgets.LabelWidget');

/**
 *
 * @param {!recoil.ui.WidgetScope} scope
 * @constructor
 * @implements {recoil.ui.LabeledWidget}
 */
recoil.ui.widgets.NumberWidget = function(scope) {
    this.scope_ = scope;

    this.labelWidget_ = new recoil.ui.widgets.LabelWidget(scope);
    this.number_ = new recoil.ui.widgets.NumberWidget.NumberInput();

    this.valueHelper_ = new recoil.ui.ComponentWidgetHelper(scope, this.number_, this, this.updateValue_);

    this.configHelper_ = new recoil.ui.ComponentWidgetHelper(scope, this.number_, this, this.updateConfig_);

    this.changeHelper_ = new recoil.ui.EventHelper(scope, this.number_, goog.events.EventType.BLUR);
    this.enabledHelper_ = new recoil.ui.TooltipHelper(scope, this.number_);

};
/**
 * @private
 * @return {!goog.dom.DomHelper}
 */
recoil.ui.widgets.NumberWidget.DomHelper_ = function() {
    return goog.dom.getDomHelper();
};


/**
 * @constructor
 * @extends {goog.ui.LabelInput}}
 */
recoil.ui.widgets.NumberWidget.NumberInput = function() {
    goog.ui.LabelInput.call(this);
    this.min_ = undefined;
    this.max_ = undefined;
    this.step_ = undefined;

    // we need this because some browsers don't filter keys
    this.keyFilter_ = function(e) {

        if (!goog.events.KeyCodes.isTextModifyingKeyEvent(e)) {
            return;
        }
        // Allow: backspace, delete, tab, escape, enter and .
        if (goog.array.contains([116, 46, 40, 8, 9, 27, 13, 110, 190], e.keyCode) ||
            // Allow: Ctrl+A
            (e.keyCode == 65 && e.ctrlKey === true) ||
            // Allow: Ctrl+C
            (e.keyCode == 67 && e.ctrlKey === true) ||
            // Allow: Ctrl+C
            (e.keyCode == 86 && e.ctrlKey === true) ||
            // Allow: Ctrl+X
               (e.keyCode == 88 && e.ctrlKey === true) ||
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)) {
            // let it happen, don't do anything
            return;
        }
        // Ensure that it is a number and stop the keypress
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            console.log('prevent', e.keyCode);
            e.preventDefault();
        }
    };

};
goog.inherits(recoil.ui.widgets.NumberWidget.NumberInput, goog.ui.LabelInput);

/**
 *
 */
recoil.ui.widgets.NumberWidget.NumberInput.prototype.enterDocument = function() {
  recoil.ui.widgets.NumberWidget.NumberInput.superClass_.enterDocument.call(this);
};


/**
 *
 */

recoil.ui.widgets.NumberWidget.NumberInput.prototype.exitDocument = function() {
  recoil.ui.widgets.NumberWidget.NumberInput.superClass_.exitDocument.call(this);
};

/**
 * @param {number} min
 */

recoil.ui.widgets.NumberWidget.NumberInput.prototype.setMin = function(min) {
    this.min_ = min;
    if (this.getElement()) {
        this.getElement().min = min;
    }
};

/**
 * @param {number} max
 */
recoil.ui.widgets.NumberWidget.NumberInput.prototype.setMax = function(max) {
    this.max_ = max;
    if (this.getElement()) {
        this.getElement().max = '';
    }
};

/**
 * @param {number} step
 */
recoil.ui.widgets.NumberWidget.NumberInput.prototype.setStep = function(step) {
    this.step_ = step;
    if (this.getElement()) {
        this.getElement().step = step;
    }
};


/**
 * Creates the DOM nodes needed for the label input.
 * @override
 */
recoil.ui.widgets.NumberWidget.NumberInput.prototype.createDom = function() {
    var element = this.getDomHelper().createDom(
        goog.dom.TagName.INPUT,
        {'type': goog.dom.InputType.NUMBER, step: this.step_, min: this.min_, max: this.max_});
    var lastValid = 88;

    goog.events.listen(element
, goog.events.EventType.KEYDOWN, this.keyFilter_);
    goog.events.listen(element, goog.events.EventType.BLUR,
                       function() {
                           if (!element.validity.valid) {
                               element.value = lastValid;
                           }
                       });



    goog.events.listen(new goog.events.PasteHandler(element)
                       , goog.events.PasteHandler.EventType.PASTE,
                       function(e) {
                           var inputEl = e.target;
                           var origText = inputEl;

                           var clip = e.getBrowserEvent().clipboardData;

                           var txt = clip.getData('text/plain');

                           txt = txt.replace(/[^0-9.+]/g, 'F');
                           console.log('paste', e, txt);
//            e.preventDefault();
//                           e.stopPropagation();
                           //filter stuff here
                       });

    goog.events.listen(new goog.events.InputHandler(element)
                       , goog.events.PasteHandler.EventType.PASTE,
                       function(e) {
                           var inputEl = e.target;
                           var origText = inputEl;

                           console.log('innerHtml', inputEl.innerHTML);

//            e.preventDefault();
//                           e.stopPropagation();
                           //filter stuff here
                       });

    this.setElementInternal(element);
};

/**
 *
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.NumberWidget.prototype.getComponent = function() {
    return this.number_;
};

/**
 *
 * @return {!recoil.ui.Widget}
 */
recoil.ui.widgets.NumberWidget.prototype.getLabel = function() {
    return this.labelWidget_;
};


/**
 *
 * @param {recoil.frp.Behaviour<!string>|!string} name
 * @param {recoil.frp.Behaviour<number>|number} value
 * @param {!recoil.frp.Behaviour<?>} options
 */
recoil.ui.widgets.NumberWidget.prototype.attachMeta = function(name, value, options) {
    var frp = this.valueHelper_.getFrp();

    this.attachStruct(recoil.frp.struct.extend(frp, options, {'name' : name, value: value}));
};


/**
 *
 * @param {!Object|!recoil.frp.Behaviour<!Object>} options
 */

recoil.ui.widgets.NumberWidget.prototype.attachStruct = function(options) {
    var frp = this.valueHelper_.getFrp();
    var util = new recoil.frp.Util(frp);
    var structs = recoil.frp.struct;
    var optionsB = structs.flatten(frp, options);

    this.nameB_ = structs.get('name', optionsB, '');
    this.valueB_ = structs.get('value', optionsB);
    this.minB_ = structs.get('min', optionsB, NaN);
    this.maxB_ = structs.get('max', optionsB, NaN);
    this.stepB_ = structs.get('step', optionsB, 1);
    this.enabledB_ = structs.get('enabled', optionsB, recoil.ui.BoolWithExplanation.TRUE);

    var readyB = util.isAllGood(
        this.nameB_, this.valueB_,
        this.enabledB_, this.minB_,
        this.maxB_, this.stepB_);

    this.labelWidget_.attach(
        this.nameB_,
        recoil.ui.BoolWithExplanation.and(
            frp,     /** @type {!recoil.frp.Behaviour<!recoil.ui.BoolWithExplanation>} */ (this.enabledB_),
            recoil.ui.BoolWithExplanation.fromBool(frp, readyB)));

    this.valueHelper_.attach(this.valueB_);
    this.configHelper_.attach(this.minB_, this.maxB_, this.stepB_, this.enabledB_);

    var me = this;
    this.changeHelper_.listen(this.scope_.getFrp().createCallback(function(v) {
        var inputEl = v.target;
        me.valueB_.set(parseFloat(inputEl.value));
    }, this.valueB_));

    this.enabledHelper_.attach(
        /** @type {!recoil.frp.Behaviour<!recoil.ui.BoolWithExplanation>} */ (this.enabledB_),
        this.valueHelper_, this.configHelper_);
};

/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.NumberWidget.prototype.updateValue_ = function(helper) {
    if (helper.isGood()) {

        this.number_.setValue(this.valueB_.get());
        console.log('update value', this.number_.getElement().id, this.valueB_.get());
    }

};

/**
 * @private
 * @param {recoil.ui.ComponentWidgetHelper} helper
 */
recoil.ui.widgets.NumberWidget.prototype.updateConfig_ = function(helper) {
    var enabled = helper.isGood();


    if (this.minB_.metaGet().good()) {
        this.number_.setMin(this.minB_.get());
    }

    if (this.maxB_.metaGet().good()) {
        this.number_.setStep(this.maxB_.get());
    }

    if (this.stepB_.metaGet().good()) {
        this.number_.setStep(this.stepB_.get());
    }

};