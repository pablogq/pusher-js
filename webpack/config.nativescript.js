var path = require('path');
var NormalModuleReplacementPlugin = require('webpack')
  .NormalModuleReplacementPlugin;
var version = require('../package').version;
var objectAssign = require('object-assign-deep');

/*
  Upon importing the 'runtime' module, this nativescript build is made to look at
  src/runtimes/nativescript/runtime.ts by the below webpack resolution config.
  This is achieved by adding 'src/runtimes/nativescript' to the resolve.modulesDirectories array

  -- CONVENIENCE --
  We also add 'src/runtimes' to the list for convenient referencing of 'isomorphic/' implementations.
  We also add 'src/' so that the runtimes/nativescript folder can conveniently import 'core/' modules.
*/
module.exports = objectAssign(require('./config.shared'), {
  output: {
    library: 'Pusher',
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '../dist/nativescript'),
    filename: 'pusher.js'
  },
  target: 'node',
  externals: {
    'tns-core-modules/xhr': 'tns-core-modules/xhr', // our Reachability implementation needs to reference nativescript core modules.
    'tns-core-modules/connectivity': 'tns-core-modules/connectivity', // our Reachability implementation needs to reference nativescript core modules.
    'nativescript-websockets': 'nativescript-websockets' // our Reachability implementation needs a websockets implementation.
  },
  resolve: {
    modulesDirectories: ['src/', 'src/runtimes/nativescript', 'src/runtimes']
  }
});
