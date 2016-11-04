goog.provide('recoil.util.object');

goog.require('goog.array');
goog.require('goog.object');
goog.require('goog.structs.AvlTree');

/**
 * @template T
 * @param {T} value
 * @return {T}
 */
recoil.util.object.safeFreeze = function(value) {

    if (value instanceof Object) {
        if (Object.isFrozen && !Object.isFrozen(value)) {
            var result = Object.create(value);
            Object.freeze(result);
            return result;
        }
    }
    return value;

};

/**
 * a generic compare function that should handle anything
 *
 * @param {*} a
 * @param {*} b
 * @return {!number}
 */
recoil.util.object.compare = function(a, b) {
    return recoil.util.object.compare_(a, b, [], []);
};

/**
 *
 * @param {*} a
 * @param {*} b
 * @param {Array<Object>} aPath
 * @param {Array<Object>} bPath
 * @return {number}
 * @private
 */
recoil.util.object.compare_ = function(a, b, aPath, bPath) {

    // check for loops

    var aIndex = goog.array.indexOf(aPath, a);
    var bIndex = goog.array.indexOf(bPath, b);

    if (aIndex !== -1 || bIndex !== -1) {
        if (aIndex === bIndex) {
            return 0;
        }
        if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
        }
        return aIndex === -1 ? 1 : -1;
    }

    if (a === b) {
        return 0;
    }

    if (a === undefined) {
        return -1;
    }

    if (b === undefined) {
        return 1;
    }
    if (a === null) {
        return -1;
    }

    if (b === null) {
        return 1;
    }
    if (a.compare !== undefined && a.compare instanceof Function) {
        return a.compare(b);
    }
    if (b.compare !== undefined && b.compare instanceof Function) {
        return -b.compare(a);
    }

    // if 1 and only 1 of a and b is an array
    if (goog.isArrayLike(a) != goog.isArrayLike(b)) {
        if (goog.isArrayLike(a)) {
            return 1;
        }
        return -1;
    }

    var newAPath = goog.array.concat(aPath, [a]);
    var newBPath = goog.array.concat(bPath, [b]);

    if (goog.isArrayLike(a)) {

        return goog.array.compare3(/** @type {!IArrayLike} */
            (a), /** @type {!IArrayLike} */
            (b), function(a, b) {
                return recoil.util.object.compare_(a, b, newAPath, newBPath);
            });
    }

    if (a instanceof Object && b instanceof Object) {
        var aKeys = [];
        var bKeys = [];
        for (var k in a) {
            if (a.hasOwnProperty(k)) {
                aKeys.push(k);
            }
        }
        for (var k in b) {
            if (b.hasOwnProperty(k)) {
                bKeys.push(k);
            }
        }
        goog.array.sort(aKeys);
        goog.array.sort(bKeys);

        var res = goog.array.compare3(aKeys, bKeys);
        if (res !== 0) {
            return res;
        }
        for (var i = 0; i < aKeys.length; i++) {
            var k = aKeys[i];
            res = recoil.util.object.compare_(a[k], b[k], newAPath, newBPath);
            if (res !== 0) {
                return res;
            }
        }
        return 0;
    }
    if (a instanceof Object) {
        return -1;
    }
    if (b instanceof Object) {
        return 1;
    }

    return goog.array.defaultCompare(a, b);
};

/**
 * compares 2 objects
 *
 * @param {Object|number|undefined} a
 * @param {Object|number|undefined} b
 * @return {!boolean}
 */
recoil.util.object.isEqual = function(a, b) {

    return recoil.util.object.isEqual.isEqualRec_(a, b, [], [], []);
};

/**
 * @param {?} other
 * @return {!boolean}
 */
goog.structs.AvlTree.prototype.equals = function(other) {
    if (other instanceof goog.structs.AvlTree) {
        var count = other.getCount();
        if (this.getCount() != count) {
            return false;
        }

        var myRows = [];
        var otherRows = [];
        this.inOrderTraverse(function(row) {
            myRows.push(row);
        });

        other.inOrderTraverse(function(row) {
            otherRows.push(row);
        });
        return recoil.util.object.isEqual(myRows, otherRows);
    }
    return false;
};


/**
 * @private
 * @param {Object|number|undefined} a
 * @param {Object|number|undefined} b
 * @param {!Array<Object>} aPath
 * @param {!Array<Object>} bPath
 * @param {!Array<!string>} debugPath
 * @return {!boolean}
 */
recoil.util.object.isEqual.isEqualRec_ = function(a, b, aPath, bPath, debugPath) {

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
        return recoil.util.object.isEqualDebug_(false, debugPath);
    }

    if (a.equals !== undefined && a.equals instanceof Function) {
        return a.equals(b);
    }
    if (b.equals !== undefined && b.equals instanceof Function) {
        return recoil.util.object.isEqualDebug_(b.equals(a), debugPath);
    }

    if (goog.isArrayLike(a) != goog.isArrayLike(b)) {

        return recoil.util.object.isEqualDebug_(false, debugPath);
    }

    var newAPath = goog.array.concat(aPath, [a]);
    var newBPath = goog.array.concat(bPath, [b]);


    if (goog.isArrayLike(a)) {
        var idx = 0;

        return goog.array.equals(/** @type {IArrayLike} */
            (a), /** @type {IArrayLike} */
            (b), function(a, b) {
                var newDebugPath = goog.array.concat(debugPath, '[' + idx + ']');

                return recoil.util.object.isEqual.isEqualRec_(
                    a, b, newAPath, newBPath, newDebugPath);
            });
    }

    if (a instanceof Object || b instanceof Object) {
        if (!(a instanceof Object) || !(b instanceof Object)) {
            return recoil.util.object.isEqualDebug_(false, debugPath);
        }

        for (var k in a) {
            var newDebugPath = goog.array.concat(debugPath, k);
            if (!(k in b) || !recoil.util.object.isEqual.isEqualRec_(a[k], b[k], newAPath, newBPath, newDebugPath)) {
                return false;
            }
        }
        for (var k in b) {
            if (!(k in a)) {
                newDebugPath = goog.array.concat(debugPath, k);
                return recoil.util.object.isEqualDebug_(false, newDebugPath);
            }
        }
        return true;
    }
    recoil.util.object.isEqualDebug_(false, debugPath);
    return false;
};

/**
 * turn this on to debug equal failing
 * @private
 * @param {!boolean} val
 * @param {!Array<string>} path
 * @return {!boolean}
 */
recoil.util.object.isEqualDebug_ = function(val, path) {
//    if (!val) {
//        console.log('Not Equal', path);
//    }
    return val;
};

/**
 * @param {!Object} source
 * @param {...!Object} var_args
 */
recoil.util.object.addProps = function(source, var_args) {
    var src = arguments[0];

    for (var i = 1; i < arguments.length; i++) {
        for (var prop in arguments[i]) {
            if (arguments[i].hasOwnProperty(prop)) {
                src[prop] = arguments[i][prop];
            }
        }
    }
};
/**
 * @param {Object} obj
 * @return {Object}
 */

recoil.util.object.removeUndefined = function(obj) {
    for (var k in obj) {
        if (obj[k] === undefined) {
            delete obj[k];
        }
    }
    return obj;
};

/**
 * @param {Object} obj
 * @param {...string} var_parts
 * @return {*}
 */

recoil.util.object.getByParts = function(obj, var_parts) {
    var cur = obj;
    for (var i = 1; i < arguments.length; i++) {
        if (!(cur instanceof Object)) {
            return undefined;
        }
        cur = cur[arguments[i]];
    }
    return cur;
};

/**
 * best effort at deep clone, it handles loops, it handles instanceof
 * I don't think it handles cloning parent scope
 *
 * if there is a clone method on it it will call that instead
 * @template T
 * @param {T} obj the object to clone
 * @return T
 */
recoil.util.object.clone = function (obj) {
    return recoil.util.object.clone.cloneRec_(obj, [], []);
};

recoil.util.object.clone.cloneRec_ = function (obj, path, clonedPath) {

    var type = goog.typeOf(obj);
    if (type == 'object' || type == 'array') {
        var idx = goog.array.indexOf(path, obj);
        
        if (idx !== -1) {
            return clonedPath[idx];
        }
        
        if (goog.isFunction(obj.clone)) {
            return obj.clone();
        }
        
        var clone = type == 'array' ? [] : Object.create(Object.getPrototypeOf(obj));
        var newPath = goog.array.clone(path);
        var newClonedPath = goog.array.clone(clonedPath);
        newPath.push(obj);
        newClonedPath.push(clone);

        
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                clone[key] = recoil.util.object.clone.cloneRec_(obj[key], newPath, newClonedPath);
            }
        }

        return clone;
    }
    
    return obj;
};