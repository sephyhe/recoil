goog.provide('recoil.ui.widgets.TableMetaData');
goog.provide('recoil.ui.widgets.table.DefaultColumn');
goog.provide('recoil.ui.widgets.table.SeperatorColumn');

goog.require('recoil.structs.table.ColumnKey');
goog.require('recoil.structs.table.Table');
goog.require('recoil.ui.RenderedDecorator');
goog.require('recoil.ui.widgets.table.Column');
goog.require('recoil.ui.widgets.table.StringColumn');
goog.require('recoil.util.func');
goog.require('recoil.util.object');

/**
 * data that describes the table, it contains the columns and how to contruct the render widget
 * for that column
 * @constructor
 */
recoil.ui.widgets.TableMetaData = function() {
    this.columns_ = [];
    this.colSeperators_ = [];
};

/**
 * @template CT
 * @param {!recoil.ui.widgets.table.Column<CT>} col
 */
recoil.ui.widgets.TableMetaData.prototype.addColumn = function(col) {
    if (!col) {
        throw new Error('undefined column');
    }
    this.columns_.push(col);
};
/**
 * @param {!recoil.structs.table.ColumnKey} key
 * @param {string|Node} name if you pass a node this will allow better formating of header
 * @param {!Object=} opt_meta
 */

recoil.ui.widgets.TableMetaData.prototype.addSeperatorCol = function(key, name, opt_meta) {
    if (!key) {
        throw new Error('undefined column key');
    }

    this.addColumn(new recoil.ui.widgets.table.SeperatorColumn(key, name, opt_meta || {}));
    this.colSeperators_.push(key);
};

/**
 * @param {!function(recoil.structs.table.ColumnKey,recoil.ui.widgets.table.Column)} func
 */
recoil.ui.widgets.TableMetaData.prototype.forEachColumn = function(func) {
    this.columns_.forEach(function(col) {
        func(col.getKey(), col);
    });
};


/**
 *
 * @template CT
 * @param {!recoil.structs.table.ColumnKey<CT>} key
 * @param {string|Node} name if you pass a node this will allow better formating of header
 * @param {!Object=} opt_meta
 */
recoil.ui.widgets.TableMetaData.prototype.add = function(key, name, opt_meta) {
    if (!key) {
        throw new Error('undefined column key');
    }

    this.addColumn(new recoil.ui.widgets.table.DefaultColumn(key, name, opt_meta || {}));
};

/**
 * creates a new table with the meta data applied to it
 * if table is a mutable table it will also apply the meta data it
 * @param {!recoil.structs.table.Table|!recoil.structs.table.MutableTable} table
 * @return {!recoil.structs.table.Table}
 */
recoil.ui.widgets.TableMetaData.prototype.applyMeta = function(table) {
    var mtable = table instanceof recoil.structs.table.MutableTable ? table : table.unfreeze();
    var pos = 0;
    this.columns_.forEach(function(col) {
        var inMeta = {};
        goog.object.extend(inMeta, table.getMeta(), mtable.getColumnMeta(col.getKey()));
        var meta = col.getMeta(inMeta);
        if (meta.position === undefined) {
            meta.position = pos;
        }
        mtable.setColumnMeta(col.getKey(), meta);
        pos++;
    });
    var me = this;
    if (this.colSeperators_.length > 0) {
        var res = mtable.freeze().createEmpty([], this.colSeperators_);

       me.colSeperators_.forEach(function(col) {
           res.addColumnMeta(col, {cellDecorator: recoil.ui.widgets.TableMetaData.createSpanDecorator(mtable.size() + 1,
                                                                                                      {class: 'recoil-table-group'})});
       });

        mtable.forEach(function(row) {
           var mrow = row.unfreeze();
           me.colSeperators_.forEach(function(col) {
               mrow.set(col, null);
               mrow.addCellMeta(col, {cellDecorator: null});

           });
           res.addRow(mrow);
        });
        return res.freeze();
    }
    return mtable.freeze();
};
/**
 * @type {!Object}
 * @final
 */
recoil.ui.widgets.TableMetaData.SPAN_FUNC = recoil.util.object.uniq();


/**
 * the default decorator for making cells
 * @final
 * @param {!number} size
 * @param {Object=} opt_extra
 * @return {function():recoil.ui.RenderedDecorator}
 */

recoil.ui.widgets.TableMetaData.createSpanDecorator = function(size, opt_extra) {
    var opts = {};
    goog.object.extend(opts, opt_extra || {}, {colspan: size});
    var res = function() {
        return new recoil.ui.RenderedDecorator(
            res,
            goog.dom.createDom('td', opts));

        };
    recoil.util.func.makeEqualFunc(res, recoil.ui.widgets.TableMetaData.SPAN_FUNC, opts);
    return res;

};

/**
 * return all the haviours containted in this meta data structure
 * @return {!Array<!recoil.frp.Behaviour>}
 */
recoil.ui.widgets.TableMetaData.prototype.getBehaviours = function() {
    return recoil.frp.struct.getBehaviours(this);
};
/**
 * creates a behaviour that contains TableMetaData
 * @param {!recoil.frp.Frp} frp
 * @return {!recoil.frp.Behaviour<!Object>}
 */
recoil.ui.widgets.TableMetaData.prototype.createB = function(frp) {
    return recoil.frp.struct.flatten(frp, this);
};

/**
 * @constructor
 * @template T
 * @param {recoil.structs.table.ColumnKey} key
 * @param {string|Node} name
 * @param {!Object=} opt_meta
 * @implements {recoil.ui.widgets.table.Column}
 */
recoil.ui.widgets.table.DefaultColumn = function(key, name, opt_meta) {
    this.name_ = name;
    this.key_ = key;
    this.meta_ = opt_meta || {};
};

/**
 * @param {Object} curMeta
 * @return {Object}
 */
recoil.ui.widgets.table.DefaultColumn.prototype.getMeta = function(curMeta) {
    /**
     * @type {Object<string, *>}
     */
    var meta = {name: this.name_};
    goog.object.extend(meta, this.meta_, curMeta);

    var factoryMap = meta['typeFactories'];
    var factory = (factoryMap === undefined || meta.type === undefined)
            ? undefined : factoryMap[meta.type];
    var column = factory === undefined
            ? undefined : factory(this.key_, meta.name);

    if (column === undefined) {
        column = new recoil.ui.widgets.table.StringColumn(this.key_, meta.name);
    }
    return column.getMeta(meta);
};

/**
 * @return {recoil.structs.table.ColumnKey}
 */
recoil.ui.widgets.table.DefaultColumn.prototype.getKey = function() {
    return this.key_;
};

/**
 * @constructor
 * @template T
 * @param {recoil.structs.table.ColumnKey} key
 * @param {string|Node} name
 * @param {!Object=} opt_meta
 * @implements {recoil.ui.widgets.table.Column}
 */
recoil.ui.widgets.table.SeperatorColumn = function(key, name, opt_meta) {
    this.name_ = name;
    this.key_ = key;
    this.meta_ = opt_meta || {};
};

/**
 * @param {Object} curMeta
 * @return {Object}
 */
recoil.ui.widgets.table.SeperatorColumn.prototype.getMeta = function(curMeta) {
    /**
     * @type {Object<string, *>}
     */
    var meta = {name: this.name_};
    goog.object.extend(meta, this.meta_, curMeta);

    var column = new recoil.ui.widgets.table.StringColumn(this.key_, meta.name);

    return column.getMeta(meta);
};

/**
 * @return {recoil.structs.table.ColumnKey}
 */
recoil.ui.widgets.table.SeperatorColumn.prototype.getKey = function() {
    return this.key_;
};
