goog.provide('recoil.frp.FrpTest');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.style');
goog.require('goog.testing.jsunit');
goog.require('recoil.exception.NoAccessors');
goog.require('recoil.exception.NotAttached');
goog.require('recoil.exception.NotInTransaction');
goog.require('recoil.frp.Frp');
goog.require('recoil.util');

goog.setTestOnly('recoil.frp.FrpTest');

function testBehaviourUp() {
    var count1 = 0;
    var count2 = 0;
    function add1(a) {
        count1++;
        return a + 1;
    }
    function add2(a) {
        count2++;
        return a + 1;
    }

    
    var frp = new recoil.frp.Frp();
    var tm = frp.tm();

    var b = frp.createB(2);

    assertEquals(2, b.unsafeMetaGet().get());

    var c = frp.liftB(add1, b);

    // nothing should propagate yet we need to attach it
    assertFalse(c.unsafeMetaGet().ready());


    tm.attach(c);
    
    assertEquals(3, c.unsafeMetaGet().get());

    assertEquals(1, count1);
    var d = frp.liftB(add2, c);

    tm.attach(d);
    assertEquals('no extra fire', 1, count1);
    assertEquals('one fire', 1, count2);

    assertEquals(4, d.unsafeMetaGet().get());
}

function testEventUp() {
    var count1 = 0;
    var count2 = 0;
    var val1 = 0;
    var val2 = 0;
    function add1(a) {
	console.log("add 1", a);
	val1 = a;
        count1++;
        return a + 1;
    }
    function add2(a) {
        count2++;
        return a + 1;
    }

    
    var frp = new recoil.frp.Frp();
    var tm = frp.tm();

    var b = frp.createE();
    frp.accessTrans(function() {
	b.set(2);
    }, b);
    var c = frp.liftE(add1, b);

    // get should always be null outside of the transaction
    assertFalse(c.unsafeMetaGet().ready());
    assertEquals(0, val1);
    assertEquals(0, count1);

    tm.attach(c);

    assertEquals(null, c.unsafeMetaGet().get());
    assertEquals(0, val1);
    assertEquals(0, count1);
    
    // we might need to split this up so we wait for the update
    frp.accessTrans(function() {
	b.set(2);
    });
    assertEquals(null, c.unsafeMetaGet().get());
    assertEquals(1, count1);
    assertArrayEquals([2], val1);

    frp.accessTrans(function() {
	b.set(2);
    });
    assertEquals(null, c.unsafeMetaGet().get());
    assertEquals(1, count1);
    assertEquals([2], val1);

    //TODO don't fire an event , or fire 2 events from ourselves
    assertEquals(3, c.unsafeMetaGet().get());
    assertEquals(2, count1);


    b.set(3);
    assertEquals(4, c.unsafeMetaGet().get());
    assertEquals(1, count1);
    assertEquals(4, d.unsafeMetaGet().get());
}


function testBehaviourDown() {
    var count1 = 0;
    var count2 = 0;
    function add1(a) {
        count1++;
        return a + 1;
    }

    function sub1(val, a) {
        a.set(val - 1);
    }
        
    function add2(a) {
        count2++;
        return a + 1;
    }

    
    var frp = new recoil.frp.Frp();
    var tm = frp.tm();

    var b = frp.createB(2);

    var c = frp.liftBI(add1, sub1, b);
    tm.attach(c);
    tm.doTrans(function() {
        recoil.frp.Frp.access(function() {
          c.set(7);
        }, c);
    });
    
    assertEquals(6, b.unsafeMetaGet().get());

    tm.detach(c);

}
function testSwitchBDown() {

    var frp = new recoil.frp.Frp();
    var tm = frp.tm();
    var src1 = frp.createB(1);
    var src2 = frp.createB(2);    

    function make1Or2(val) {
        if (val) {
            return src1;
        } else {
            return src2;
        }
    }

    var c = frp.createB(true);
    c.name = 'C';

    var d = frp.liftB(make1Or2, c);
    d.name = 'd';
    
    var switchTest = frp.switchB(d);
    switchTest.name = 'switchTest';
    
    tm.attach(switchTest);

    assertEquals(1, switchTest.unsafeMetaGet().get());

    recoil.frp.Frp.access(function() {
      tm.doTrans(function() {
          switchTest.set(11);
      });
    }, switchTest);

    assertEquals(11, src1.unsafeMetaGet().get());
    
    tm.doTrans(function() {
        c.set(false);
    });
    
    assertEquals(2, switchTest.unsafeMetaGet().get());
    
    tm.detach(switchTest);

}
function testConst() {
    var frp = new recoil.frp.Frp();
    var tm = frp.tm();
    var count = 0;

    var one = frp.createConstB(1);
    var two = frp.liftB(function(a) {return a + 1;}, one);
    var three = frp.liftB(function(a) {count++;return a + 1;},two);
    assertEquals('zero fire', 0, count);
    
    
    tm.attach(three);
    assertEquals('one fire', 1, count);    
    
      tm.doTrans(function() {
        recoil.frp.Frp.access(function() {
          two.set(3);
        }, two);
    });
    recoil.frp.Frp.access( function() {
        assertEquals('value right', 3, three.get());
    }, three);
    assertEquals('one fire again', 1, count);    
    tm.detach(three);
    
}
function testNoSetOutsideTransaction() {


    var frp = new recoil.frp.Frp();
    var tm = frp.tm();

    var one = frp.createB(1);

    one.set(2);
 
    var two = frp.liftB(function(a) {return a + 1;}, one);
 
    try { 
      two.set(3);
         fail('expected exception');
    } catch (e) {
        assertTrue(e instanceof recoil.exception.NotAttached);
    }

    tm.attach(two);
    try { 
      two.set(3);
         fail('expected exception');
    } catch (e) {
        assertTrue(e instanceof recoil.exception.NoAccessors);
    }

    recoil.frp.Frp.access(function() {
        try { 
          two.set(3);
             fail('expected exception');
        } catch (e) {
            assertTrue(e instanceof recoil.exception.NotInTransaction);
        }
    }, two);

    recoil.frp.Frp.access(function() {
      tm.doTrans(function() {
          two.set(3);
        });
    }, two);
}

function testLiftBOnlyGood() {

    var frp = new recoil.frp.Frp();
    
    function testNotCall() {
        fail("should not be called");
    }
    var a = frp.createMetaB(recoil.frp.BStatus.notReady());
    var d = frp.liftB(testNotCall, a);
    frp.attach(d);
    frp.detach(d);
      
    
}
function testSwitchBUp() {

    var frp = new recoil.frp.Frp();
    var tm = frp.tm();

    function make1Or2(val) {
        if (val) {
            return frp.createB(1);
        } else {
            var two = frp.createB(1);
            return frp.liftB(function (a) {return a + 1;}, two);
        }
    }

    var c = frp.createB(true);
    c.name = 'C';

    var d = frp.liftB(make1Or2, c);
    d.name = 'd';
    
    var switchTest = frp.switchB(d);
    switchTest.name = 'switchTest';
    
    tm.attach(switchTest);

    assertEquals(1, switchTest.unsafeMetaGet().get());

    tm.doTrans(function() {
        c.set(false);
    });
    
    assertEquals(2, switchTest.unsafeMetaGet().get());
    
    tm.detach(switchTest);
}

function testAttachDetach() {

    var frp = new recoil.frp.Frp();
    var tm = frp.tm();

    var one = frp.createB(1);
    var two = frp.liftB(function (a) {return a + 1;},one);

    one.set(2);

    tm.attach(two);
    try {
      one.set(3);
      fail('expected exception');
    }
    catch (e) {
        assertTrue(e instanceof recoil.exception.NotInTransaction);
   }
    tm.detach(two);
    one.set(1);
}
