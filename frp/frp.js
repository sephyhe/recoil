goog.provide('recoil.frp');
goog.provide('recoil.frp.BStatus');
goog.provide('recoil.frp.Behaviour');
goog.provide('recoil.frp.Frp');
goog.provide('recoil.frp.IsEqual');
goog.provide('recoil.frp.TransactionManager');

goog.require('goog.array');
goog.require('goog.math.Long');
goog.require('recoil.exception.frp.LoopDetected');
goog.require('recoil.exception.frp.NoAccessors');
goog.require('recoil.exception.frp.NotAttached');
goog.require('recoil.exception.frp.NotInTransaction');
goog.require('recoil.exception.frp.InvalidState');
goog.require('recoil.structs.UniquePriorityQueue');

/**
 * recoil.frp.TraverseDirection.
 * 
 * @param {!string} name
 * @param {function(recoil.frp.Behaviour,Array <recoil.frp.Behaviour>, Array <recoil.frp.Behaviour>) : Array<recoil.frp.Behaviour>}
 *            calc
 * 
 * @param {function(recoil.frp.Behaviour,recoil.frp.Behaviour):number} comparator
 * @constructor
 */

recoil.frp.TraverseDirection = function(name, calc, comparator) {
    this.calc_ = calc;
    this.comparator_ = comparator;
};

/**
 * 
 * @param {recoil.frp.Behaviour} behaviour
 * @param {Array <recoil.frp.Behaviour>} providers
 * @param {Array <recoil.frp.Behaviour>} dependents
 * @return {Array <recoil.frp.Behaviour>}
 */
recoil.frp.TraverseDirection.prototype.calculate = function(behaviour, providers, dependents) {
    return this.calc_(behaviour, providers, dependents);
};

/**
 * 
 * @return {function(recoil.frp.Behaviour,recoil.frp.Behaviour):number}
 */

recoil.frp.TraverseDirection.prototype.heapComparator = function() {
    var me = this;
    return function(a, b) {
        return me.comparator_(a, b);
    };
};
/**
 *   
 * @constructor
 */
recoil.frp.Frp = function() {
    this.transactionManager_ = new recoil.frp.TransactionManager();
};
/**
 * 
 * @return {recoil.frp.TransactionManager}
 */
recoil.frp.Frp.prototype.tm = function() {
    return this.transactionManager_;
}
/**
 * 
 * provides the status of the behaviour, e.g. is it ready, or an error occured
 * 
 * @param {T} initial
 * @constructor
 * @template T
 */
recoil.frp.BStatus = function(initial) {
    this._errors = [];
    this._ready = true;
    this._value = initial;
};

/**
 * combine this error and another to get a result
 * 
 * @param {recoil.frp.BStatus} other
 */
recoil.frp.BStatus.prototype.merge = function(other) {
    this._errors = goog.array.concat(this._errors, other._errors);
    this._ready = this._ready && other._ready;
};

/**
 * set the of the status
 * 
 * @param {T} val
 */
recoil.frp.BStatus.prototype.set = function(val) {
    this._value = val;
};

/**
 * @return {T}
 */
recoil.frp.BStatus.prototype.get = function() {
    return this._value;
};

/**
 * @private
 * @param {Array<goog.math.Long>} a
 * @param {Array<goog.math.Long>} b
 * @return {number}
 */

recoil.frp.Frp.compareSeq_ = function(a, b) {
    var len = a.length > b.length ? b.length : a.length;

    for (var i = 0; i < len; i++) {
        if (a[i] < b[i]) {
            return -1;
        }
        if (a[i] > b[i]) {
            return 1;
        }
    }

    if (a.length > b.length) {
        return -1;
    }
    if (a.length < b.length) {
        return 1;
    }
    return 0;
};

/**
 * compares 2 objects
 * 
 * @param {Object|number|undefined} a
 * @param {Object|number|undefined} b
 * @return {boolean}
 */
recoil.frp.isEqual = function(a, b) {

    return recoil.frp.isEqual.isEqualRec_(a, b, [], []);
};

/**
 * @private
 * @param {Object|number|undefined} a
 * @param {Object|number|undefined} b
 * @param {Array<Object>} aPath
 * @param {Array<Object>} bPath
 * @return {boolean}
 */
recoil.frp.isEqual.isEqualRec_ = function(a, b, aPath, bPath) {

    // check for loops

    var aIndex = goog.array.indexOf(aPath, a);
    var bIndex = goog.array.indexOf(bPath, b);

    if (aIndex !== -1 || bIndex !== -1) {
        return aIndex === bIndex;
    }

    if (a === b) {
        return true;
    }

    if (a === undefined || b === undefined || a === null || b === null) {
        return false;
    }

    if (a.equals !== undefined && a.equals instanceof Function) {
        return a.equals(b);
    }
    if (b.equals !== undefined && b.equals instanceof Function) {
        return b.equals(a);
    }

    if (goog.isArrayLike(a) != goog.isArrayLike(b)) {
        return false;
    }

    var newAPath = goog.array.concat(aPath, [a]);
    var newBPath = goog.array.concat(bPath, [b]);

    if (goog.isArrayLike(a)) {

        return goog.array.equals(/** @type {goog.array.ArrayLike} */
        (a), /** @type {goog.array.ArrayLike} */
        (b), function(a, b) {
            return recoil.frp.isEqual.isEqualRec_(a, b, newAPath, newBPath);
        });
    }

    if (a instanceof Object || b instanceof Object) {
        if (!(a instanceof Object) || !(b instanceof Object)) {
            return false;
        }

        for ( var k in a) {
            if (!(k in b) || !recoil.frp.isEqual.isEqualRec_(a[k], b[k], newAPath, newBPath)) {
                return false;
            }
        }
        for ( var k in b) {
            if (!(k in a)) {
                return false;
            }
        }
        return true;
    }
    return false;
};

/**
 * 
 * @enum {recoil.frp.TraverseDirection}
 * @private
 * @final
 */

recoil.frp.Frp.Direction_ = {}

/**
 *  Up is from providers to behaviour
 *  @final 
 */
recoil.frp.Frp.Direction_.UP = new recoil.frp.TraverseDirection('up',
/**
 * @param {recoil.frp.Behaviour} behaviour
 * @param {Array <recoil.frp.Behaviour>} providers
 * @param {Array <recoil.frp.Behaviour>} dependents
 * @return {Array <recoil.frp.Behaviour>}
 */
function(behaviour, providers, dependents) {
    var oldVal = behaviour.val_;

    var params = [];
    providers.forEach(function(b) {
        params.push(b.get());
    });
    var newVal = behaviour._calc.apply(behaviour, params);
    var res = [];
    if (behaviour.dirtyUp_ && recoil.frp.isEqual(behaviour.dirtyUpOldValue_, newVal)) {
        behaviour.val_ = behaviour.dirtyUpOldValue_;
    }
    else if (behaviour.dirtyUp_ || !recoil.frp.isEqual(oldVal, newVal)) {
        behaviour.val_ = newVal;
        res =  dependents;
    }
    behaviour.dirtyUpOldValue_ = null;        
    behaviour.dirtyUp_ = false;
    return res;
}, function(a, b) {
    return recoil.frp.Frp.compareSeq_(a.seq_, b.seq_);
}),

/** 
 * Down is from behaviour to providers
 * @final */
recoil.frp.Frp.Direction_.DOWN = new recoil.frp.TraverseDirection('down', function(behaviour, providers, dependants) {
    function getDirty(dependants) {
        var res = {};
        for (var i = 0; i < dependants.length; i++) {
            if (dependants[i].dirtyDown_) {
                res[String(dependants[i].seq_)] = dependants[i];
            }
        }
        return res;
    }

    var changedDirty = [];
    if (behaviour.dirtyDown_) {
        var oldDirty = getDirty(behaviour.providers_);
        var args = [behaviour.val_];
        for (var i = 0; i < behaviour.providers_.length; i++) {
          args.push(behaviour.providers_[i]);        
        }
                
        behaviour._inv.apply(behaviour, args);
        var newDirty = getDirty(behaviour.providers_);

        var id;
        for (id in newDirty) {
            if (oldDirty[id] !== undefined) {

                changedDirty.push(newDirty[id]);
            }

        }
        behaviour.dirtyDown_ = false;
    }

    return changedDirty;
}, function(a, b) {
    return recoil.frp.Frp.compareSeq_(b.seq_, a.seq_);

});

/**
 * 
 * @constructor
 * @template T
 * 
 * @param {recoil.frp.BStatus <T>} value
 * @param {function(...) : T| undefined} calc
 * @param {function(T)| undefined} inverse
 * @param {Array <goog.math.Long>} sequence
 * @param {Array <recoil.frp.Behaviour>?} providers
 */
recoil.frp.Behaviour = function(value, calc, inverse, sequence, providers) {
    var me = this;
    var myValue = value;
    this.val_ = value;
    this._calc = calc || function() {
        return myValue;
    };
    this._inv = inverse || function(newVal) {
        myValue = newVal;
    };
    this.dirtyUp_ = false;
    this.dirtyUpOldValue_ = null;
    this.dirtyDown_ = false;
    this.refs_ = {};
    this.seq_ = sequence;
    this.accessors_ = 0;
    this.providers_ = providers || [];
};

/**
 * increases the reference count
 * 
 * @param {recoil.frp.TransactionManager} manager
 * @return {boolean} true if count was zero
 * 
 */
recoil.frp.Behaviour.prototype.addRef = function(manager) {

    var curRefs = this.refs_[manager.id_];
    if (curRefs === undefined) {
        this.refs_[manager.id_] = {
            manager: manager,
            count: 1
        };
        return true;
    } else {
        this.refs_[manager.id_].count++;
        return false;
    }
};

/**
 * decreases the reference count
 * 
 * @param {recoil.frp.TransactionManager} manager
 * @return {boolean} true if count goes to zero
 */
recoil.frp.Behaviour.prototype.removeRef = function(manager) {
    var curRefs = this.refs_[manager.id_];
    if (curRefs === undefined || curRefs.count <= 0) {
        goog.asserts.assert(false, 'Behaviour removing reference when not referenced');
        return false;
    } else if (curRefs.count === 1) {
        delete this.refs_[manager.id_];
        return true;
    } else {
        this.refs_[manager.id_].count = curRefs.count - 1;
        return false;
    }
};

/**
 * @return {boolean}
 * 
 */ 
recoil.frp.Behaviour.prototype.hasRefs = function() {
  for(var prop in this.refs_) {
      if (this.refs_.hasOwnProperty(prop)) {
        return true;
      }
  }
  return false;
};

/**
 * gets the reference count for the transaction manager
 * 
 * @param {recoil.frp.TransactionManager} manager
 * @return {number}
 */
recoil.frp.Behaviour.prototype.getRefs = function(manager) {

    var curRefs = this.refs_[manager.id_];
    if (curRefs === undefined) {
        return 0;
    }
    return curRefs.count;
};

/**
 * gets the reference count for the transaction manager
 * 
 * @private
 * @param {function(recoil.frp.TransactionManager)} callback
 */
recoil.frp.Behaviour.prototype.forEachManager_ = function(callback) {

    for ( var idx in this.refs_) {
        callback(this.refs_[idx].manager);
    }
};

/**
 * @return {recoil.frp.BStatus<T>}
 */
recoil.frp.Behaviour.prototype.unsafeMetaGet = function() {
    return this.val_;
};

/**
 * @return {T}
 */
recoil.frp.Behaviour.prototype.get = function() {
    var meta = this.metaGet();
    if (!(meta instanceof recoil.frp.BStatus)) {
      return null;
    } 
    return meta.get();
};

/**
 * @return {recoil.frp.BStatus<T>}
 */
recoil.frp.Behaviour.prototype.metaGet = function() {
    var hasTm = this.hasRefs();
    var hasProviders = this.providers_.length > 0;

    if (!hasTm && hasProviders) {
      // if it has providers then it is not ok to set it with no
      // transaction manager attached
      throw new recoil.exception.frp.NotAttached();
    }     
    
    if (hasProviders && this.accessors_ === 0) {
        // if providers are feeding into me then it is NOT ok just to set the value
        throw new recoil.exception.frp.NoAccessors();
    }
    
    return this.val_;
};

/**
 * @param {recoil.frp.BStatus<T>} value
 */

recoil.frp.Behaviour.prototype.metaSet = function(value) {
    var hasTm = this.hasRefs();
    var hasProviders = this.providers_.length > 0;
    
    if (!hasTm && hasProviders) {
      // if it has providers then it is not ok to set it with no
      // transaction manager attached
      throw new recoil.exception.frp.NotAttached();
    }     
    
    if (hasProviders && this.accessors_ === 0) {
        // if providers are feeding into me then it is NOT ok just to set the value
        throw new recoil.exception.frp.NoAccessors();
    }
    
    if (hasTm) {
        var hasTransaction = false;
        this.forEachManager_(function(manager) {
          hasTransaction = hasTransaction || manager.level_ > 0;
        });    
        
        if (!hasTransaction) {
          throw new recoil.exception.frp.NotInTransaction();
        
        }
    
    }
    var me = this;

    if (!recoil.frp.isEqual(value, me.val_)) {
        me.dirtyUp_ = true;
        me.dirtyUpOldValue_ = me.val_;
        me.dirtyDown_ = true;
        me.val_ = value;


        me.forEachManager_(function(manager) {
            manager.addPending_(recoil.frp.Frp.Direction_.UP, me);
            manager.addPending_(recoil.frp.Frp.Direction_.DOWN, me);
        });
    }

};

/**
 * @param {T} value
 */

recoil.frp.Behaviour.prototype.set = function(value) {
    this.metaSet(new recoil.frp.BStatus(value));
};

/**
 * @template T
 * @param {T} initial
 * @return {recoil.frp.Behaviour<T>}
 */
recoil.frp.Frp.prototype.createB = function(initial) {
    var metaInitial = new recoil.frp.BStatus(initial);
    return new recoil.frp.Behaviour(metaInitial, undefined, undefined, [this.transactionManager_.nextIndex()], []);
};

/**
 * @template T
 * @param {T} initial
 * @return {recoil.frp.Behaviour<T>}
 */
recoil.frp.Frp.prototype.createConstB = function(initial) {
    var metaInitial = new recoil.frp.BStatus(initial);
    return new recoil.frp.Behaviour(metaInitial, function () {return metaInitial;}, function (dummy) {}, [this.transactionManager_.nextIndex()], []);
};

/**
 * @param {function()} callback
 * @param {...recoil.frp.Behaviour} var_behaviours
 */  
recoil.frp.Frp.access = function (callback, var_behaviours) {
   try {
    for (var i = 1; i < arguments.length; i++) {
        arguments[i].accessors_++;
    }
      callback();
   }
   finally {
    for (var i = 1; i < arguments.length; i++) {
        arguments[i].accessors_--;
    }
   }
};

/**
 * @param {function()} callback
 * @param {Array<recoil.frp.Behaviour>} behaviours
 */  

recoil.frp.Frp.accessList = function (callback, behaviours) {
   try {
    for (var i = 0; i < behaviours.length; i++) {
        behaviours[i].accessors_++;
    }
      callback();
   }
   finally {
    for (var i = 1; i < behaviours.length; i++) {
        behaviours[i].accessors_--;
    }
   }
};

/**
 * 
 * @template T
 * @param {recoil.frp.Behaviour<recoil.frp.Behaviour<T>>} Bb
 * @return {T}
 */
recoil.frp.Frp.prototype.switchB = function(Bb) {
    var me = this;
    return this.metaLiftBI(function() {
        var switchB = this;
        /** @type recoil.frp.BStatus<recoil.frp.Behaviour> */
        var metaBb = Bb.metaGet();
        var res = new recoil.frp.BStatus(null);
        res.merge(metaBb);
        var b = null;

        me.transactionManager_.nestIds(Bb, function() {
            if (metaBb._value === null) {
                me.transactionManager_.updateProviders_(switchB, Bb);
            } else {
                me.transactionManager_.updateProviders_(switchB, Bb, metaBb.get());
                res.merge(metaBb);
            }
            b = metaBb._value;
        });

        if (b !== null || b !== undefined) {
            recoil.frp.Frp.access(function() {
                res.set(b.get());
            }, b);
            return res;
        }
        return res;
    }, 
      function (val) {
        var metaBb = Bb.metaGet();
        
        if (metaBb._value instanceof recoil.frp.Behaviour) {
            metaBb._value.metaSet(val);
        }
        
        
                
      },
    Bb);
};

/**
 * calls function, arguments and return value should contain meta information
 * 
 * @template T
 * @param {function(...) : T} func
 * @param {...} var_args
 * @return {recoil.frp.Behaviour<T>}
 */
recoil.frp.Frp.prototype.metaLiftB = function(func, var_args) {
    var args = [];
    args.push(func);
    args.push(undefined);
    
    for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    return this.metaLiftBI.apply(this, args);
};

/**
 * calls function, arguments and return value should contain meta information
 * 
 * @template T
 * @param {function(...) : T} func
 * @param {function(T,...)}  invFunc
 * @param {...} var_args
 * @return {recoil.frp.Behaviour<T>}
 */
recoil.frp.Frp.prototype.metaLiftBI = function(func, invFunc, var_args) {
    var providers = [];
    for (var i = 2; i < arguments.length; i++) {
        providers.push(arguments[i]);
    }
    return new recoil.frp.Behaviour(null, func, invFunc, [this.transactionManager_.nextIndex()], providers);
};

/**
 * @template RT
 * @param {function(...) : RT} func
 * @param {...number|Object} var_args
 * @return {recoil.frp.Behaviour<RT>}
 */

recoil.frp.Frp.prototype.liftB = function(func, var_args) {
    var args = [func, undefined];
    for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    return this.liftBI.apply(this, args)
};

/**
 * @template RT
 * @param {function(...) : RT} func
 * @param {function(RT,...)} invFunc
 * @param {...number|Object} var_args
 * @return {recoil.frp.Behaviour<RT>}
 */

recoil.frp.Frp.prototype.liftBI = function(func, invFunc, var_args) {
    var outerArgs = arguments;
    var wrappedFunc = function() {
        var args = [];
        var metaResult = new recoil.frp.BStatus(null);

        for (var i = 2; i < outerArgs.length; i++) {
            var metaArg = outerArgs[i];
            metaResult.merge(metaArg);
            args.push(metaArg.get());
        }
        var result = func.apply(this, args);
        metaResult.set(result);
        return metaResult;
    };                     
    
    var wrappedFuncInv = undefined;
    if (invFunc !== undefined) {
      wrappedFuncInv = function(val) {
          var args = [val.get()];

          for (var i = 2; i < outerArgs.length; i++) {
              args.push(outerArgs[i]);
          }
          invFunc.apply(this, args);
      };                     
    }
    var newArgs = [wrappedFunc, wrappedFuncInv];
    for (var i = 2; i < outerArgs.length; i++) {
        newArgs.push(outerArgs[i]);
    }
    
    return this.metaLiftBI.apply(this, newArgs);

};

/**
 * @constructor
 */
recoil.frp.TransactionManager = function() {
    this.providers_ = [];
    this.level_ = 0;
    this.pending_ = [new recoil.structs.UniquePriorityQueue(recoil.frp.Frp.Direction_.UP.heapComparator()),
            new recoil.structs.UniquePriorityQueue(recoil.frp.Frp.Direction_.UP.heapComparator())];
    this._dependancyMap = [];
    this._curIndex = goog.math.Long.ZERO;
    this._curIndexPrefix = [[]];
    this.curIndexLock_ = 0;
    this.id_ = recoil.frp.TransactionManager.nextId_.toString();
    recoil.frp.TransactionManager.nextId_ = recoil.frp.TransactionManager.nextId_.add(goog.math.Long.ONE);
};

/**
 * @type goog.math.Long
 * @private
 */
recoil.frp.TransactionManager.nextId_ = goog.math.Long.ZERO;

/**
 * this makes all ids generated sub ids of the current one I think this is wrong really we need it to be children of the
 * behaviour that depends on it TODO
 * 
 * @template T
 * @param {recoil.frp.Behaviour<recoil.frp.Behaviour<T>>} behaviour the parent behaviour all generated sequences will
 *            be less than this
 * @param {function()} callback
 */
recoil.frp.TransactionManager.prototype.nestIds = function(behaviour, callback) {
    try {
        this._curIndexPrefix.push(behaviour.seq_);
        callback();
    } finally {
        this._curIndexPrefix.pop();
    }
};

/**
 * stops new ids from being created, this will stop new behaviours from being created in inappropriate
 * places such as inverse functions 
 * 
 * @param {function()} callback
 */
recoil.frp.TransactionManager.prototype.lockIds_ = function(callback) {
    try {
        this.curIndexLock_++;
        callback();
    } finally {
        this.curIndexLock_--;
    }
};

/**
 * to a transaction nothing should fire until we exit out the top level
 * 
 * @param {function()} callback
 */

recoil.frp.TransactionManager.prototype.doTrans = function(callback) {
    this.level_++;

    try {
        callback();
    } finally {
        try {
        if (this.level_ === 1) {
            this.propagateAll_();
        }
        } finally {
        this.level_--;
        }
    }
};

/**
 * make an array of all providers of behaviour
 * 
 * @template T
 * @param {recoil.frp.Behaviour<recoil.frp.Behaviour<T>>} behaviour
 * @return {Map<Array<number>, recoil.frp.Behaviour} }
 */
recoil.frp.TransactionManager.prototype.visit = function(behaviour) {
    var toDo = [{
        b: behaviour,
        path: {}
    }];
    var visited = [];

    while (toDo.length > 0) {
        var cur = toDo.pop();

        if (visited[String(cur.b.seq_)] !== undefined) {
            continue;
        }
        visited[String(cur.b.seq_)] = cur.b;

        for (var prov = 0; prov < cur.b.providers_.length; prov++) {
            var provObj = cur.b.providers_[prov];
            if (cur.path[String(provObj.seq_)] !== undefined) {
                throw new recoil.exception.frp.LoopDetected();
            }

            var newPath = goog.array.clone(cur.path);
            newPath[String(provObj.seq_)] = provObj;

            toDo.push({
                b: provObj,
                path: newPath
            });
        }

    }
    return visited;

};

/**
 * generates the next index for behaviours
 * 
 * @return {Array<goog.math.Long>}
 */
recoil.frp.TransactionManager.prototype.nextIndex = function() {
    if (this.curIndexLock_ > 0) {
      throw new recoil.exception.frp.InvalidState();
    }
    var res = goog.array.clone(this._curIndexPrefix[this._curIndexPrefix.length - 1]);
    res.push(this._curIndex);
    this._curIndex = this._curIndex.add(goog.math.Long.ONE);
    return res;
};

/**
 * @param {!recoil.frp.TraverseDirection} direction
 * @return {recoil.structs.UniquePriorityQueue}
 */
recoil.frp.TransactionManager.prototype.getPending_ = function(direction) {
    return this.pending_[recoil.frp.Frp.Direction_.UP === direction ? 0 : 1];
};

/**
 * @param {!recoil.frp.TraverseDirection} direction
 * @param {recoil.frp.Behaviour} behaviour
 * @param {boolean=} opt_propogate
 * 
 */
recoil.frp.TransactionManager.prototype.addPending_ = function(direction, behaviour, opt_propogate) {
    this.getPending_(direction).push(behaviour);
    if (this.level_ === 0 && opt_propogate) {
        this.propagateAll_();
    }
};

/**
 * propagate the changes through the FRP tree, until no more changes
 * 
 * @private
 */
recoil.frp.TransactionManager.prototype.propagateAll_ = function() {
    var pendingDown = this.getPending_(recoil.frp.Frp.Direction_.DOWN);
    var pendingUp = this.getPending_(recoil.frp.Frp.Direction_.UP);

    while (!pendingUp.isEmpty() || !pendingDown.isEmpty()) {
        if (!pendingDown.isEmpty()) {
            this.propagate_(recoil.frp.Frp.Direction_.DOWN);
            continue;
        }

        if (!pendingUp.isEmpty()) {
            this.propagate_(recoil.frp.Frp.Direction_.UP);
            continue;
        }
    }
};

/**
 * propagate the changes through the FRP tree, the direction is if it is going up or down
 * 
 * @param {!recoil.frp.TraverseDirection} dir
 * @private
 */
recoil.frp.TransactionManager.prototype.propagate_ = function(dir) {
    var pendingHeap = this.getPending_(dir);
    // var visited = new Set();

    var cur = pendingHeap.pop();
    var me = this;
    while (cur !== undefined) {
        // calculate changed something
        var deps;
        var accessFunc = function() {
            if (dir === recoil.frp.Frp.Direction_.UP) {
              me.nestIds( cur, function() {
                  deps = dir.calculate(cur, cur.providers_, me._dependancyMap[String(cur.seq_)]);
             });
           }
           else {
              me.lockIds_ (function() {
                  deps = dir.calculate(cur, cur.providers_, me._dependancyMap[String(cur.seq_)]);
             });
           
           }
       };

       var args = [accessFunc, cur];
       for (var i = 0; i < cur.providers_.length; i++) {
          args.push(cur.providers_[i]);
       }
       recoil.frp.Frp.access.apply(this, args);
        var d;
        for (d in deps) {
            pendingHeap.push(deps[d]);
        }

        cur = pendingHeap.pop();
    }
};

/**
 * helper function to add the inverse mapping provider to list of dependants
 * 
 * @template T
 * @private
 * @param {recoil.frp.Behaviour<T>} b
 */
recoil.frp.TransactionManager.prototype.addProvidersToDependancyMap_ = function(b) {
    var me = this;
    b.providers_.forEach(function(prov) {
        var deps = me._dependancyMap[String(prov.seq_)];
        if (deps === undefined) {
            deps = [b];
            me._dependancyMap[String(prov.seq_)] = deps;
        } else {
            deps.push(b);
        }
    });

};

/**
 * @param {Object} other
 * @this {Object}
 * @template T
 * @return {boolean} true if objects are equal
 */
recoil.frp.Frp._ptrEqual = function(other) {
    return this === other;
};

/**
 * helper function to remove the inverse mapping provider to list of dependants
 * 
 * @template T
 * @private
 * @param {recoil.frp.Behaviour<T>} b
 */
recoil.frp.TransactionManager.prototype.removeProvidersFromDependancyMap_ = function(b) {
    var me = this;
    b.providers_.forEach(function(prov) {
        var deps = me._dependancyMap[String(prov.seq_)];
        if (deps !== undefined) {
            // TODO what about the same provider twice?
            goog.array.removeIf(deps, recoil.frp.Frp._ptrEqual, prov);
            if (deps.length === 0) {
                delete me._dependancyMap[String(prov.seq_)];
            }
        }
    });

};

/**
 * mark the behaviour that it is being used it will now recieve update notifications
 * 
 * @template T
 * @param {recoil.frp.Behaviour<T>} behaviour
 */
recoil.frp.TransactionManager.prototype.attach = function(behaviour) {
    var visited = this.visit(behaviour);
    var newStuff = this.getPending_(recoil.frp.Frp.Direction_.UP);
    var me = this;
    this.doTrans(function() {
        for ( var idx in visited) {
            // this may not account for 2 thing in the tree pointing to the
            // same thing
            var b = visited[idx];
            if (b.getRefs(me) === 0) {
                newStuff.push(visited[idx]);
                me.addProvidersToDependancyMap_(b);
            }
            visited[idx].addRef(me);
        }
    });
    
    
};

/**
 * update the dependaniece of the behaviour
 * 
 * @private
 * @param {recoil.frp.Behaviour} dependant
 * @param {...recoil.frp.Behaviour} var_providers
 */
recoil.frp.TransactionManager.prototype.updateProviders_ = function(dependant, var_providers) {
    var oldVisited = this.visit(dependant);
    var oldProviders = goog.array.clone(dependant.providers_);
    dependant.providers_ = goog.array.clone(arguments);
    // TODO remove the first argument it is the dependant
    var newVisited = this.visit(dependant);
    /** @type recoil.frp.Behaviour */
    var b;
    
    var me = this;
    for ( var idx in oldVisited) {
        b = oldVisited[idx];
        var newIdx = goog.array.findIndex(newVisited, recoil.frp.Frp._ptrEqual, b);
        if (newIdx === -1) {
            if (b.removeRef(this)) {
                me.removeProvidersFromDependancyMap_(b);
                me.removePending_(b);
            }
        }
    }

    
    var pending = this.getPending_(recoil.frp.Frp.Direction_.UP);
    for ( var idx in newVisited) {
        b = newVisited[idx];
        var oldIdx = goog.array.findIndex(oldVisited, recoil.frp.Frp._ptrEqual, b);
        if (oldIdx === -1) {
            if (b.addRef(this)) {
                me.addProvidersToDependancyMap_(b);
                pending.push(b);
            }
        }
    }

    // if the providers have changed then we need to recalculate the dependant
    // even just the order

    if (oldProviders.length !== dependant.providers_.length) {
        pending.push(dependant);

    } else {
        for (var i = 0; i < oldProviders.length; i++) {

            if (oldProviders[i] !== dependant.providers_[i]) {
                pending.push(dependant);
                break;
            }
        }
    }

    
};
/**
 * @template T
 * @param {recoil.frp.Behaviour<T>} behaviour
 */ 
recoil.frp.TransactionManager.prototype.removePending_ = function(behaviour) {
    var up = this.getPending_(recoil.frp.Frp.Direction_.UP);
    var down = this.getPending_(recoil.frp.Frp.Direction_.DOWN);

    up.remove(behaviour);
    down.remove(behaviour);
};
/**
 * mark the behaviour that it is no longer being used it will no longer recieve update notifications
 * 
 * @template T
 * @param {recoil.frp.Behaviour<T>} behaviour
 */

recoil.frp.TransactionManager.prototype.detach = function(behaviour) {

    var visited = this.visit(behaviour);
    var me = this;
    this.doTrans(function() {
        for ( var idx in visited) {
            // this may not account for 2 thing in the tree pointing to the
            // same thing
            var b = visited[idx];
            if (visited[idx].removeRef(me)) {
                me.removeProvidersFromDependancyMap_(b);
                me.removePending_(b);
            }
        }
    });

};
