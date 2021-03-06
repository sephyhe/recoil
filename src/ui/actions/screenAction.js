goog.provide('recoil.ui.actions.ScreenAction');

/**
 *
 * @param {string} name
 * @param {recoil.frp.Behaviour} selectorB
 * @param {function(recoil.ui.WidgetScope)} factory
 * @constructor
 * @implements {recoil.ui.actions.Action}
 */
recoil.ui.actions.ScreenAction = function(name, selectorB, factory) {
      this.name_ = name;
      this.selectorB_ = selectorB;
      this.factory_ = factory;
};



/**
 *
 * @param {recoil.ui.WidgetScope} scope
 * @return {!recoil.frp.Behaviour.<*>}
 */
recoil.ui.actions.ScreenAction.prototype.createCallback = function(scope) {
      var me = this;
      return scope.getFrp().createCallback(function() {
            me.selectorB_.set(me.factory_(scope));
      }, this.selectorB_);
};
