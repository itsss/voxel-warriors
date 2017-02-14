#!/bin/bash

DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

source "$DIR/../GenRect/GenRect.bash"

$GPP -n -o "$DIR/assets/libPhysics.js" "$DIR/assets/libPhysics.debug.js"

# to install browserify: npm install browserify -g
# to install uglifyjs: npm install uglify-js -g

browserify "$DIR/assets/editor.debug.js" | uglifyjs -o "$DIR/assets/editor.js"
browserify "$DIR/assets/index.debug.js" | uglifyjs -o "$DIR/assets/index.js"