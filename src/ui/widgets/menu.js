goog.provide('recoil.ui.widgets.MenuBarWidget');
goog.provide('recoil.ui.widgets.MenuButtonWidget');
goog.provide('recoil.ui.widgets.MenuItemActionWidget');


goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.ui.Menu');
goog.require('goog.ui.MenuButton');
goog.require('goog.ui.SubMenu');
goog.require('goog.ui.menuBar');
goog.require('recoil.frp.Behaviour');
goog.require('recoil.frp.Util');
goog.require('recoil.frp.struct');
goog.require('recoil.ui.ComponentWidgetHelper');
goog.require('recoil.ui.Widget');
goog.require('recoil.ui.WidgetHelper');
goog.require('recoil.ui.WidgetScope');
goog.require('recoil.ui.events');

/**
 * @constructor
 * @implements recoil.ui.Widget
 * @param {!recoil.ui.WidgetScope} scope
 */
recoil.ui.widgets.MenuBarWidget = function(scope) {
    this.scope_ = scope;

    /**
     * @private
     * @type !goog.ui.Component
     *
     */
    this.menuBar_ = goog.ui.menuBar.create();
    this.config_ = new recoil.ui.ComponentWidgetHelper(scope, this.menuBar_, this, this.updateConfig_);
    this.state_ = new recoil.ui.ComponentWidgetHelper(scope, this.menuBar_, this, this.updateState_);

};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.MenuBarWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;

/**
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.MenuBarWidget.prototype.getComponent = function() {
    return this.menuBar_;
};

/**
 * @type Object
 */
recoil.ui.widgets.MenuBarWidget.defaultConfig = {
    renderer: null,
    domHelper: null
};

/**
 *
 * @param {!recoil.frp.Behaviour<!Object>|!Object} config
 * @param {!recoil.frp.Behaviour<!Array<!recoil.ui.widgets.MenuButtonWidget>> | !Array<recoil.ui.widgets.MenuButtonWidget>} menus
 * @param {!recoil.frp.Behaviour<!boolean> | !boolean} enabled
 */
recoil.ui.widgets.MenuBarWidget.prototype.attach = function(config, menus, enabled) {
    var util = new recoil.frp.Util(this.scope_.getFrp());
    this.menus_ = util.toBehaviour(menus);
    this.config_.attach(util.getDefault(this.config_, recoil.ui.widgets.MenuButtonWidget.defaultConfig));
    this.state_.attach(this.menus_, util.getDefault(enabled, true));
};

/**
 * @private
 * @param {recoil.ui.WidgetHelper} helper
 * @param {recoil.frp.Behaviour} configB
 */
recoil.ui.widgets.MenuBarWidget.prototype.updateConfig_ = function(helper, configB) {
    var me = this;
    var good = helper.isGood();

    if (good) {
        if (me.menuBar_ !== null) {

            helper.clearContainer();
        }
        var config = configB.get();

        me.state_.forceUpdate();
    }
};

/**
 * @private
 * @param {recoil.ui.WidgetHelper} helper
 * @param {recoil.frp.Behaviour<Array<recoil.ui.Widget>>} menusB
 * @param {recoil.frp.Behaviour<Boolean>} enabledB
 */
recoil.ui.widgets.MenuBarWidget.prototype.updateState_ = function(helper, menusB, enabledB) {
    if (this.menuBar_) {
        this.menuBar_.setEnabled(/* boolean */ helper.isGood() && enabledB.get());

        helper.clearContainer();
        var me = this;
        if (helper.isGood()) {
            goog.array.forEach(menusB.get(), function(menuWidget) {
                menuWidget.getComponent().setDispatchTransitionEvents(goog.ui.Component.State.ALL, true);
                me.menuBar_.addChild(menuWidget.getComponent(), true);
            });
        }
    }
};


/**
 * @constructor
 * @implements recoil.ui.Widget
 * @param {!recoil.ui.WidgetScope} scope
 */
recoil.ui.widgets.MenuButtonWidget = function(scope) {
    /**
     * @private
     * @type !goog.ui.MenuButton
     *
     */
    this.menuBtn_ = new goog.ui.MenuButton();
    this.state_ = new recoil.ui.ComponentWidgetHelper(scope, this.menuBtn_, this, this.updateState_);
};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.MenuButtonWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;

/**
 * @type !Object
 */
recoil.ui.widgets.MenuButtonWidget.defaultConfig = {
    renderer: null,
    domHelper: null
};

/**
 * Associates a list of menu items widget with this Menu Widget
 *
 * @param {String} name the name of the menuItem
 * @param {Array<recoil.ui.widgets.MenuItemActionWidget>|recoil.frp.Behaviour<Array<recoil.ui.widgets.MenuItemWidget>>} menuItems
 */
recoil.ui.widgets.MenuButtonWidget.prototype.attach = function(name, menuItems) {
    var util = new recoil.frp.Util(this.state_.getFrp());

    this.nameB_ = util.toBehaviour(name);
    this.itemsB_ = util.toBehaviour(menuItems);
    this.state_.attach(this.itemsB_, this.nameB_);
};

/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.MenuButtonWidget.prototype.updateState_ = function(helper) {
    var menu = new goog.ui.Menu();

    if (this.menuBtn_.hasChildren()) {
        this.menuBtn_.removeChildren();
    }

    if (helper.isGood()) {
        this.menuBtn_.setContent(this.nameB_.get());

        goog.array.forEach(this.itemsB_.get(), function(item) {

            item.getComponent().setDispatchTransitionEvents(goog.ui.Component.State.ALL, true);
            menu.addChild(item.getComponent(), true);
        });
        this.menuBtn_.setMenu(menu);
    }

};

/**
 *
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.MenuButtonWidget.prototype.getComponent = function() {
    return this.menuBtn_;
};

/**
 *
 * @constructor
 * @param {!recoil.ui.WidgetScope} scope
 * @implements {recoil.ui.widgets.MenuItemWidget}
 */
recoil.ui.widgets.MenuItemActionWidget = function(scope) {
    /**
     * @private
     * @type !goog.ui.MenuItem
     *
     */

    this.menuItem_ = new goog.ui.MenuItem('');
    this.scope_ = scope;
//    this.config_ = new recoil.ui.ComponentWidgetHelper(scope, this.menuItem_, this, this.updateConfig_);
    this.state_ = new recoil.ui.ComponentWidgetHelper(scope, this.menuItem_, this, this.updateState_);
    /**
     *
     * @type {recoil.util.Handle<recoil.frp.Behaviour<*>>}
     * @private
     */
    this.actionB_ = new recoil.util.Handle();
    var me = this;
    recoil.ui.events.listenH(this.menuItem_, goog.ui.Component.EventType.ACTION,
                me.actionB_);
};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.MenuItemActionWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;

/**
 *
 * @return {goog.ui.Component|*}
 */
recoil.ui.widgets.MenuItemActionWidget.prototype.getComponent = function() {
    return this.menuItem_;
};

/**
 *
 * @param {recoil.frp.Behaviour<String>} name
 * @param {recoil.frp.Behaviour<!boolean>|!boolean} enabledB
 * @param {!recoil.frp.Behaviour<?>} actionB
 */
recoil.ui.widgets.MenuItemActionWidget.prototype.attach = function(name, enabledB, actionB) {
    this.actionB_.set(actionB);
    var util = new recoil.frp.Util(this.state_.getFrp());

    this.nameB_ = util.toBehaviour(name);
    this.state_.attach(this.nameB_, util.toBehaviour(enabledB), actionB);
};

/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @param {recoil.frp.Behaviour<String>} nameB
 * @param {recoil.frp.Behaviour<Boolean>} enabledB
 * @param {!recoil.frp.Behaviour<?>} actionB
 * @private
 */
recoil.ui.widgets.MenuItemActionWidget.prototype.updateState_ = function(helper, nameB, enabledB, actionB) {
    if (helper.isGood()) {
        this.menuItem_.setContent(this.nameB_.get());
    }
    else {
        this.menuItem_.setContent('?');
    }

    this.menuItem_.setDispatchTransitionEvents(goog.ui.Component.State.ALL, true);
};


/**
 *
 * @param {!recoil.ui.WidgetScope} scope
 * @constructor
 * @implements {recoil.ui.widgets.MenuItemWidget}
 */
recoil.ui.widgets.SubMenuWidget = function(scope) {
    this.scope_ = scope;
    this.subMenu_ = new goog.ui.SubMenu('');
    this.state_ = new recoil.ui.ComponentWidgetHelper(scope, this.subMenu_, this, this.updateState_);

    /**
     *
     * @type {recoil.util.Handle<recoil.frp.Behaviour<*>>}
     * @private
     */
    this.actionB_ = new recoil.util.Handle();
    var me = this;
    recoil.ui.events.listenH(this.subMenu_, goog.ui.Component.EventType.ACTION,
          me.actionB_);

};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.SubMenuWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;

/**
 *
 * @return {goog.ui.Component|*}
 */
recoil.ui.widgets.SubMenuWidget.prototype.getComponent = function() {
    return this.subMenu_;
};

/**
 *
 * @param {recoil.frp.Behaviour<string>|string} name
 * @param {recoil.frp.Behaviour<!boolean>|boolean} enabledB
 */
recoil.ui.widgets.SubMenuWidget.prototype.attach = function(name, enabledB) {
    var util = new recoil.frp.Util(this.state_.getFrp());

    this.nameB_ = util.toBehaviour(name);
    this.state_.attach(this.nameB_, util.toBehaviour(enabledB));
};

/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.SubMenuWidget.prototype.updateState_ = function(helper) {
    if (helper.isGood()) {
        this.subMenu_.setContent(this.nameB_.get());
    }
    else {
        this.subMenu_.setContent('?');
    }

    //this.subMenu_.setDispatchTransitionEvents(goog.ui.Component.State.ALL, true);
};

/**
 *
 * @constructor
 * @implements recoil.ui.Widget
 */
recoil.ui.widgets.MenuSeparatorWidget = function() {
      this.menuSeparator_ = new goog.ui.MenuSeparator();
};


/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.MenuSeparatorWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;

/**
 *
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.MenuSeparatorWidget.prototype.getComponent = function() {
      return this.menuSeparator_;
};

/**
 *
 * @interface
 */
recoil.ui.widgets.MenuItemWidget = function() {
};


