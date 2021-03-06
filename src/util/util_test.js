goog.provide('recoil.util.UtilTest');

goog.require('recoil.util');
goog.require('recoil.util.number');
goog.require('goog.testing.jsunit');
goog.require('goog.math');
goog.setTestOnly('recoil.util.UtilTest');

function testIsEqual() {
    var overrideEquals = {
        equals: function (a, b) {
            return true;
        }

    };

    function Override() {

    }

    Override.prototype.equals = function (a, b) {
        return true;
    };
    var loopTestA = {
        v:    'a',
        some: {}
    };
    var loopTestB = {
        v:    'a',
        some: {}
    };

    loopTestA.some.me = loopTestA;
    loopTestB.some.me = loopTestB;

    assertTrue('loop eq', recoil.util.isEqual(loopTestA, loopTestB));

    loopTestB.some.me = loopTestA;
    assertFalse('loop neq', recoil.util.isEqual(loopTestA, loopTestB));

    assertTrue('override left', recoil.util.isEqual(overrideEquals, [1, 2, 3]));
    assertTrue('override left', recoil.util.isEqual(new Override(), [1, 2, 3]));
    assertTrue('override right', recoil.util.isEqual([1, 2, 3], overrideEquals));
    assertTrue('array eq', recoil.util.isEqual([1, 2, 3], [1, 2, 3]));
    assertFalse(recoil.util.isEqual([1, 2, 3], [1, 2, 4]));
    assertFalse(recoil.util.isEqual([1, 2, 3], [1, 2, 3, 4]));
    assertFalse(recoil.util.isEqual([1, 2, 3, 4], [1, 2, 3]));
    assertTrue(recoil.util.isEqual([1, 2, 3], [1, 2, 3]));
    assertTrue(recoil.util.isEqual(1, 1));

    assertTrue(recoil.util.isEqual({
        foo: 'a'
    }, {
        foo: 'a'
    }));
    assertFalse(recoil.util.isEqual({
        foo: 'a'
    }, {
        foo: 'a',
        b1:  'a'
    }));
    assertFalse(recoil.util.isEqual({
        foo: 'b'
    }, {
        foo: 'a'
    }));
    assertFalse(recoil.util.isEqual(3, 2));
    assertFalse(recoil.util.isEqual(undefined, 2));
    assertFalse(recoil.util.isEqual(2, undefined));

    assertFalse(recoil.util.isEqual(null, 2));
    assertFalse(recoil.util.isEqual(2, null));

    assertTrue(recoil.util.isEqual(goog.math.Long.fromInt(1), goog.math.Long
          .fromInt(1)));
    assertFalse(recoil.util.isEqual(goog.math.Long.fromInt(2), goog.math.Long
          .fromInt(1)));
    var a = 1;
    assertFalse(recoil.util.isEqual(function() {return a;}, function (){return 2;}));

    var func = function () {};
    assertTrue(recoil.util.isEqual(func, func));

    var funcA = function () {};
    var funcB = function () {};
    var funcC = function () {};

    funcA.equals = function (other) {
        
        return other === funcA || other === funcB;
    };
    assertTrue(recoil.util.isEqual(funcA, funcB));
    assertFalse(recoil.util.isEqual(funcA, funcC));


    
   
}
function testToString() {
    var obj = {};
    obj.toString = function () {
        return 'foo';
    };
    var l1 = {};
    var l2 = {a:l1};
    l1.a = l2;
    assertEquals('{a:b}', recoil.util.object.toString({a:'b'}));
    assertEquals('[{a:b},{b:c}]', recoil.util.object.toString([{a:'b'},{b:'c'}]));
    assertEquals('[foo]', recoil.util.object.toString([obj]));
    assertEquals('[{a:{a:<loop{1}>}}]', recoil.util.object.toString([l1]));
}
function semetricCompare(a, b, expected) {

    if (expected < 0) {
        assertTrue(recoil.util.compare(a, b) < 0);
        assertTrue(recoil.util.compare(b, a) > 0);

    }
    else {
        assertEquals(0, recoil.util.compare(a, b));
        assertEquals(0, recoil.util.compare(b, a));
    }
}
function testCompare() {
    assertEquals(recoil.util.compare('a', 'a'), 0);
    semetricCompare(recoil.util.compare('a', 'b'), -1);

    var res = recoil.util.compare('1', 1);
    assertNotEquals(res, 0);
    assertNotEquals( recoil.util.compare(1, '1'), 0);
    assertNotEquals( recoil.util.compare(1, '1') > 0, res > 0);

    assertEquals(recoil.util.compare([1, 2, 3], [1, 2, 3]), 0);
    semetricCompare([1, 2, 3], [1, 2, 3, 4], -1);

    assertEquals(recoil.util.compare(1, 1), 0);
    semetricCompare(1, 2, -1);

    assertEquals(recoil.util.compare({
        foo: 'a'
    }, {
        foo: 'a'
    }), 0);

    semetricCompare(recoil.util.compare({
        foo: 'b'
    }, {
        foo: 'a'
    }), 1);


    var loopTestA = {
        v:    'a',
        some: {}
    };
    var loopTestB = {
        v:    'a',
        some: {}
    };

    loopTestA.some.me = loopTestA;
    loopTestB.some.me = loopTestB;

    assertEquals(recoil.util.compare(loopTestA, loopTestB), 0);

    loopTestB.some.me = loopTestA;
    semetricCompare(loopTestA, loopTestB, -1);
    //comparing different types
    semetricCompare( {a: 1 , b: 1}, {a: 'x' , b: 1}, -1);

}

function testDecimal64 () {
    var toFixed = recoil.util.number.decimal64ToFixed;
    assertEquals('0', toFixed({value: '0', fraction_digits: 2}, 0));
    assertEquals('0.0000000000', toFixed({value: '0', fraction_digits: 2}, 10));
    assertEquals('1.2300000000', toFixed({value: '123', fraction_digits: 2}, 10));
    assertEquals('-1.2300000000', toFixed({value: '-123', fraction_digits: 2}, 10));

    assertEquals('9.12', toFixed({value: '912345', fraction_digits: 5}, 2));
    assertEquals('0.12', toFixed({value: '12345', fraction_digits: 5}, 2));
    assertEquals('0.01', toFixed({value: '1234', fraction_digits: 5}, 2));
    assertEquals('0.00', toFixed({value: '12', fraction_digits: 5}, 2));

    
};
function testClone() {
    var O1 = function (a) {
        this.a_ = a;
    };

    O1.prototype.getA = function () {
        return this.a_;
    };

    O1.prototype.setA = function (a) {
        this.a_ = a;
    };
    
    var x = new O1(1);
    var arr = [1,2,3];
    
    var clone = recoil.util.object.clone(x);
    var cloneArr = recoil.util.object.clone(arr);

    assertTrue ("instance x", x instanceof O1);
    assertTrue ("instance clone", clone instanceof O1);

    assertEquals("attrib", 1, clone.getA());
    x.setA(3);
    assertEquals("attrib x changed", 3, x.getA());
    assertEquals("attrib clone changed", 1, clone.getA());

    assertArrayEquals("array equals", arr, cloneArr);

    var a = {n : 'a', x : null, y : undefined};
    var b = {n : 'b', v : a};
    a.v = b;
    //test a loop
    clone = recoil.util.object.clone(a);

    clone.f = 1;
    assertEquals("set", 1, clone.v.v.f);
    assertTrue("null check", clone.x === null);
    assertTrue("undefined exists check", clone.hasOwnProperty('y'));
    assertTrue("undefined check", clone.y === undefined);
    assertTrue("loop 1",clone.v.v === clone);
    assertTrue("loop 2",clone.v === clone.v.v.v);
    assertTrue("loop diff", clone !== a);

    // this test I expect to fail don't know how to get round it yet

    var src = (function () {
        var a = 1;
        return {
            setA : function (v) {
                a = v;
            },
            getA : function () {
                return a;
            }
        };
    })();

    clone = recoil.util.object.clone(src);

    assertObjectEquals(clone,src);
    assertEquals("good get src", 1, src.getA());
    clone.setA(2);
    assertEquals("good get clone", 2, clone.getA());
//    assertEquals("bad get src", 1, src.getA());


    // test reference to same object
    x = {};
    var y = {a: x, b:x};
    
    clone = recoil.util.object.clone(y);
    
    assertObjectEquals(y,clone);

    assertObjectEquals({},clone.a);
    assertObjectEquals({}, clone.b);
    
    assertTrue(clone.a === clone.b);
    assertTrue(clone.a !== y.a);
    

}
// function testOptions () {
//     // var testee = recoil.util.Options('a', 'b', {d: ['x', 'y', 'z']});
//

//     // var val = testee.a('abc').b(2).struct();
//     // assertObjectEquals(val, {a: 'abc', b: 2});
//
//     var val = testee.a('abc').b([1, 2, 3]).struct();
//     assertObjectEquals(val, {a: 'abc', b: [1, 2, 3]});
//
//
//     assertThrows("unknown value", function () {
//         testee.c(3);
//     });
//
//     assertThrows("dup value",function () {
//         testee.a(3).a(3);
//     });
//     assertObjectEquals(testee.struct(), {});
//
//     val = testee.d(5, 6, 7).struct();
//     assertObjectEquals(val, {d_x: 5, d_y : 6, d_z: 7});
// }
