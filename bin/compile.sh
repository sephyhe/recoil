#!/bin/bash
MAJOR=`python --version |& sed 's/Python //g' | sed 's/\.[0-9][0-9]*//g'`
#java -jar compiler.jar --js shop.js --js icecream.js --js cone.js
if [ "$MAJOR" -gt 2 ] ; then
      if [ -z "$PYTHON2" ] ; then
      echo "Incorrect Python version, set PYTHON2 path to python executable"
      exit
      else
            PYTHON=$PYTHON2
      fi
else
    if [ -z "$PYTHON2" ] ; then
	PYTHON=python
    else
        PYTHON=$PYTHON2
	    fi
fi

DIR=`dirname $0`
cd ${DIR}/..


${PYTHON} lib/closure-library/closure/bin/build/closurebuilder.py --root lib/closure-library/ --root src/ --compiler_flags="--compilation_level=ADVANCED_OPTIMIZATIONS" --compiler_flags="--warning_level=VERBOSE" \
    --compiler_flags="--jscomp_error=checkTypes" \
    -c bin/compiler.jar  --output_mode="compiled"  `grep -hr --include="*.js" --exclude="*_test.js" goog.provide  src  | sed 's/goog.provide('\'// | sed s/\'');.*$'// | sort|uniq | sed s/^/--namespace\ /` > /dev/null

#${PYTHON} closure-library/closure/bin/build/closurebuilder.py --root closure-library/ --root lib/ --compiler_flags="--compilation_level=ADVANCED_OPTIMIZATIONS" --compiler_flags="--warning_level=VERBOSE --jscomp_error=checkTypes" -c compiler.jar  --output_mode="compiled"  `grep -hr --include="*.js" --exclude="*_test.js" goog.provide  lib  | sed 's/goog.provide('\'// | sed s/\'');'// | sort|uniq | sed s/^/--namespace\ /` > /dev/null

echo "Exit " $? 


