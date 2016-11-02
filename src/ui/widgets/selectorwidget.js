goog.provide('recoil.ui.widgets.SelectorWidget');
goog.require('goog.ui.Container');
goog.require('goog.ui.Control');
goog.require('goog.ui.Select');
goog.require('recoil.util');
goog.require('recoil.frp.Behaviour');
goog.require('recoil.frp.Debug');

/**
 *
 * @param {!recoil.ui.WidgetScope} scope
 * @implements {recoil.ui.Widget}
 * @constructor
 */
recoil.ui.widgets.SelectorWidget = function (scope) {
    this.scope_ = scope;
    var frp = this.scope_.getFrp();
    this.component_ = new goog.ui.Component();

    this.selector_ = new goog.ui.Select(undefined,undefined,undefined, undefined, undefined, function (item) {
        var struct = item.getValue();
        return new struct.renderer(struct.value, struct.valid, struct.enabled);

    });

    this.helper_ = new recoil.ui.ComponentWidgetHelper(scope, this.selector_, this, this.updateState_);
    // this.changeHelper_ = new recoil.ui.EventHelper(scope, this.selector_, goog.ui.Component.EventType.ACTION);
    this.changeHelper_ = new recoil.ui.EventHelper(scope, this.selector_, goog.ui.Component.EventType.CHANGE);

};
/**
 * list of functions available when creating a selectorWidget
 */
// recoil.ui.widgets.SelectorWidget.options =  recoil.util.Options('value' , {'!list': [1, 2, 3]}, {'renderer' : recoil.util.widgets.RENDERER},
//     { renderers :['button', 'menu']}, 'enabledItems');
recoil.ui.widgets.SelectorWidget.options =  recoil.frp.Util.Options(
    {
        'name' :'',
        'renderer': recoil.ui.widgets.SelectorWidget.RENDERER,
        'enabledItems' : [],
        'enabled' : recoil.ui.BoolWithExplanation.TRUE
    },
    'value' , 'list');

/**
 *
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.SelectorWidget.prototype.getComponent = function () {
    return this.selector_;
};

/**
 *
 * @param {recoil.frp.Behaviour<!string>|!string} nameB
 * @param {recoil.frp.Behaviour<!T>|!T} valueB
 * @param {recoil.frp.Behaviour<!Array<T>>|Array<T>} listB
 * @param {recoil.frp.Behaviour<!recoil.ui.BoolWithExplanation>|!recoil.ui.BoolWithExplanation} opt_enabledB
 * @param {recoil.frp.Behaviour<!function(T) : string>| !function(T) : string} opt_rendererB
 * @param {recoil.frp.Behaviour<!Array<recoil.ui.BoolWithExplanation>>} opt_enabledItemsB
 */
recoil.ui.widgets.SelectorWidget.prototype.attach = function (nameB, valueB, listB, opt_enabledB, opt_rendererB, opt_enabledItemsB) {
    this.attachStruct({name: nameB, value: valueB, list: listB, enabled: opt_enabledB, renderer: opt_rendererB, enabledItems : opt_enabledItemsB});
};

/**
 * @param {!Object| !recoil.frp.Behaviour<Object>} options
 */
recoil.ui.widgets.SelectorWidget.prototype.attachStruct = function(options){
    var frp = this.helper_.getFrp();
    var util = new recoil.frp.Util(frp);
    var bound =  recoil.ui.widgets.SelectorWidget.options.bind(frp, options);
    // var optionsB = structs.flatten(frp, options);

    // var bound = recoil.ui.widgets.SelectorWidget.options.bind(optionsB);
    // this.nameB_ =  bound.name();

    this.nameB_ = bound.name();
    this.valueB_ = bound.value();
    this.listB_ = bound.list();
    /**
     * @type {recoil.frp.Behaviour<!Array<recoil.ui.BoolWithExplanation>>}
     * @private
     */
    this.enabledItemsB_ = bound.enabledItems();

    /**
     * @type {recoil.frp.Behaviour.<!recoil.ui.BoolWithExplanation>}
     * @private
     */
    this.enabledB_ = bound.enabled();
    this.rendererB_ = bound.renderer();

    this.helper_.attach(this.nameB_, this.valueB_, this.listB_, this.enabledB_, this.rendererB_,
         this.enabledItemsB_);

    var me = this;
    this.changeHelper_.listen(this.scope_.getFrp().createCallback(function (v) {

        var idx = v.target.getSelectedIndex();
        var list = me.listB_.get();
        if (idx < list.length) {
            me.valueB_.set(list[idx]);
        }

    }, this.valueB_, this.listB_));

};

/**
 *
 * @param {function(T) : string} renderer
 * @param {Object} val
 * @param {boolean} valid
 * @param {recoil.ui.BoolWithExplanation} enabled
 * @returns {goog.ui.MenuItem}
 * @private
 */
recoil.ui.widgets.SelectorWidget.createMenuItem_ = function (renderer, val, valid, enabled) {
    return new goog.ui.MenuItem(renderer(val, valid, enabled), {value : val, valid : valid, enabled : enabled, renderer : renderer});
};

/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.SelectorWidget.prototype.updateState_ = function (helper) {

    if (helper.isGood()) {
        // console.log('in selectWidget updateState');
        var list = this.listB_.get();
        var sel = this.selector_;
        var enabledItems = this.enabledItemsB_.get();
        sel.setEnabled(this.enabledB_.get().val());

        var renderer = this.rendererB_.get();


        for(var i = sel.getItemCount() - 1; i >= 0; i--){
            sel.removeItemAt(i);
        }

        var found = -1;
        for(i  = 0; i < list.length; i++){
            var val = list[i];
            var enabled = enabledItems.length > i ? enabledItems[i] : recoil.ui.BoolWithExplanation.TRUE;
            sel.addItem(recoil.ui.widgets.SelectorWidget.createMenuItem_(renderer, val, true, enabled));
            if (recoil.util.isEqual(this.valueB_.get(), val)) {
                found = i;
            }
        }
        if (found === -1) {
            sel.addItem(recoil.ui.widgets.SelectorWidget.createMenuItem_(renderer, this.valueB_.get(), false, recoil.ui.BoolWithExplanation.FALSE));
            found = list.length;
        }

        sel.setSelectedIndex(found);
    }

};

/**
 * 
 * @param obj
 * @param valid
 * @param {!recoil.ui.BoolWithExplanation} enabled
 * @returns {!goog.ui.MenuItem}
 * @constructor
 */
recoil.ui.widgets.SelectorWidget.RENDERER = function(obj, valid, enabled) {

    return goog.dom.createDom("div", valid ? undefined : "recoil-error", obj);
};















