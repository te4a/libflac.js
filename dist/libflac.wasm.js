// include: shell.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module != 'undefined' ? Module : {};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = typeof window == 'object';
var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != 'undefined';
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = typeof process == 'object' && typeof process.versions == 'object' && typeof process.versions.node == 'string' && process.type != 'renderer';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {

}

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
// include: /home/tema/libflac.js/libflac_pre.js
// libflac.js - port of libflac to JavaScript using emscripten


(function (root, factory) {

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['module', 'require'], factory.bind(null, root));
	} else if (typeof module === 'object' && module.exports) {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.

		// use process.env (if available) for reading Flac environment settings:
		var env = typeof process !== 'undefined' && process && process.env? process.env : root;
		factory(env, module, module.require);
	} else {
		// Browser globals
		root.Flac = factory(root);
	}

}(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this, function (global, expLib, require) {
'use strict';

var Module = Module || {};
var _flac_ready = false;
//in case resources are loaded asynchronously (e.g. *.mem file for minified version): setup "ready" handling
Module["onRuntimeInitialized"] = function(){
	_flac_ready = true;
	if(!_exported){
		//if _exported is not yet set (may happen, in case initialization was strictly synchronously),
		// do "pause" until sync initialization has run through
		setTimeout(function(){do_fire_event('ready', [{type: 'ready', target: _exported}], true);}, 0);
	} else {
		do_fire_event('ready', [{type: 'ready', target: _exported}], true);
	}
};

if(global && global.FLAC_SCRIPT_LOCATION){

	Module["locateFile"] = function(fileName){
		var path = global.FLAC_SCRIPT_LOCATION || '';
		if(path[fileName]){
			return path[fileName];
		}
		path += path && !/\/$/.test(path)? '/' : '';
		return path + fileName;
	};

	//NOTE will be overwritten if emscripten has env specific implementation for this
	var readBinary = function(filePath){

		//for Node: use default implementation (copied from generated code):
		if(ENVIRONMENT_IS_NODE){
			var ret = read_(filePath, true);
			if (!ret.buffer) {
				ret = new Uint8Array(ret);
			}
			assert(ret.buffer);
			return ret;
		}

		//otherwise: try "fallback" to AJAX
		return new Promise(function(resolve, reject){
			var xhr = new XMLHttpRequest();
			xhr.responseType = "arraybuffer";
			xhr.addEventListener("load", function(evt){
				resolve(xhr.response);
			});
			xhr.addEventListener("error", function(err){
				reject(err);
			});
			xhr.open("GET", filePath);
			xhr.send();
		});
	};
}

//fallback for fetch && support file://-protocol: try read as binary if fetch fails
if(global && typeof global.fetch === 'function'){
	var _fetch = global.fetch;
	global.fetch = function(url){
		return _fetch.apply(null, arguments).catch(function(err){
			try{
				var result = readBinary(url);
				if(result && result.catch){
					result.catch(function(_err){throw err});
				}
				return result;
			} catch(_err){
				throw err;
			}
		});
	};
}
// end include: /home/tema/libflac.js/libflac_pre.js


// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
  throw toThrow;
};

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var readAsync, readBinary;

if (ENVIRONMENT_IS_NODE) {

  // These modules will usually be used on Node.js. Load them eagerly to avoid
  // the complexity of lazy-loading.
  var fs = require('fs');
  var nodePath = require('path');

  scriptDirectory = __dirname + '/';

// include: node_shell_read.js
readBinary = (filename) => {
  // We need to re-wrap `file://` strings to URLs.
  filename = isFileURI(filename) ? new URL(filename) : filename;
  var ret = fs.readFileSync(filename);
  return ret;
};

readAsync = async (filename, binary = true) => {
  // See the comment in the `readBinary` function.
  filename = isFileURI(filename) ? new URL(filename) : filename;
  var ret = fs.readFileSync(filename, binary ? undefined : 'utf8');
  return ret;
};
// end include: node_shell_read.js
  if (!Module['thisProgram'] && process.argv.length > 1) {
    thisProgram = process.argv[1].replace(/\\/g, '/');
  }

  arguments_ = process.argv.slice(2);

  if (typeof module != 'undefined') {
    module['exports'] = Module;
  }

  quit_ = (status, toThrow) => {
    process.exitCode = status;
    throw toThrow;
  };

} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
    scriptDirectory = self.location.href;
  } else if (typeof document != 'undefined' && document.currentScript) { // web
    scriptDirectory = document.currentScript.src;
  }
  // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
  // otherwise, slice off the final part of the url to find the script directory.
  // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
  // and scriptDirectory will correctly be replaced with an empty string.
  // If scriptDirectory contains a query (starting with ?) or a fragment (starting with #),
  // they are removed because they could contain a slash.
  if (scriptDirectory.startsWith('blob:')) {
    scriptDirectory = '';
  } else {
    scriptDirectory = scriptDirectory.slice(0, scriptDirectory.replace(/[?#].*/, '').lastIndexOf('/')+1);
  }

  {
// include: web_or_worker_shell_read.js
if (ENVIRONMENT_IS_WORKER) {
    readBinary = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
    };
  }

  readAsync = async (url) => {
    // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
    // See https://github.com/github/fetch/pull/92#issuecomment-140665932
    // Cordova or Electron apps are typically loaded from a file:// url.
    // So use XHR on webview if URL is a file URL.
    if (isFileURI(url)) {
      return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            resolve(xhr.response);
            return;
          }
          reject(xhr.status);
        };
        xhr.onerror = reject;
        xhr.send(null);
      });
    }
    var response = await fetch(url, { credentials: 'same-origin' });
    if (response.ok) {
      return response.arrayBuffer();
    }
    throw new Error(response.status + ' : ' + response.url);
  };
// end include: web_or_worker_shell_read.js
  }
} else
{
}

var out = Module['print'] || console.log.bind(console);
var err = Module['printErr'] || console.error.bind(console);

// Merge back in the overrides
Object.assign(Module, moduleOverrides);
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used.
moduleOverrides = null;

// Emit code to handle expected values on the Module object. This applies Module.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.

if (Module['arguments']) arguments_ = Module['arguments'];

if (Module['thisProgram']) thisProgram = Module['thisProgram'];

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
// end include: shell.js

// include: preamble.js
// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary = Module['wasmBinary'];

// Wasm globals

var wasmMemory;

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    // This build was created without ASSERTIONS defined.  `assert()` should not
    // ever be called in this configuration but in case there are callers in
    // the wild leave this simple abort() implementation here for now.
    abort(text);
  }
}

// Memory management

var HEAP,
/** @type {!Int8Array} */
  HEAP8,
/** @type {!Uint8Array} */
  HEAPU8,
/** @type {!Int16Array} */
  HEAP16,
/** @type {!Uint16Array} */
  HEAPU16,
/** @type {!Int32Array} */
  HEAP32,
/** @type {!Uint32Array} */
  HEAPU32,
/** @type {!Float32Array} */
  HEAPF32,
/* BigInt64Array type is not correctly defined in closure
/** not-@type {!BigInt64Array} */
  HEAP64,
/* BigUint64Array type is not correctly defined in closure
/** not-t@type {!BigUint64Array} */
  HEAPU64,
/** @type {!Float64Array} */
  HEAPF64;

var runtimeInitialized = false;

// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

/**
 * Indicates whether filename is a base64 data URI.
 * @noinline
 */
var isDataURI = (filename) => filename.startsWith(dataURIPrefix);

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */
var isFileURI = (filename) => filename.startsWith('file://');

// include: runtime_shared.js
// include: runtime_stack_check.js
// end include: runtime_stack_check.js
// include: runtime_exceptions.js
// end include: runtime_exceptions.js
// include: runtime_debug.js
// end include: runtime_debug.js
// include: memoryprofiler.js
// end include: memoryprofiler.js


function updateMemoryViews() {
  var b = wasmMemory.buffer;
  Module['HEAP8'] = HEAP8 = new Int8Array(b);
  Module['HEAP16'] = HEAP16 = new Int16Array(b);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(b);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(b);
  Module['HEAP32'] = HEAP32 = new Int32Array(b);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(b);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(b);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(b);
  Module['HEAP64'] = HEAP64 = new BigInt64Array(b);
  Module['HEAPU64'] = HEAPU64 = new BigUint64Array(b);
}

// end include: runtime_shared.js
var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the main() is called

function preRun() {
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  runtimeInitialized = true;

  
if (!Module['noFSInit'] && !FS.initialized)
  FS.init();
FS.ignorePermissions = false;

TTY.init();
  callRuntimeCallbacks(__ATINIT__);
}

function postRun() {

  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnExit(cb) {
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function getUniqueRunDependency(id) {
  return id;
}

function addRunDependency(id) {
  runDependencies++;

  Module['monitorRunDependencies']?.(runDependencies);

}

function removeRunDependency(id) {
  runDependencies--;

  Module['monitorRunDependencies']?.(runDependencies);

  if (runDependencies == 0) {
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

/** @param {string|number=} what */
function abort(what) {
  Module['onAbort']?.(what);

  what = 'Aborted(' + what + ')';
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);

  ABORT = true;

  what += '. Build with -sASSERTIONS for more info.';

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.

  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */
  var e = new WebAssembly.RuntimeError(what);

  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

var wasmBinaryFile;
function findWasmBinary() {
    var f = 'libflac.wasm.wasm';
    if (!isDataURI(f)) {
      return locateFile(f);
    }
    return f;
}

function getBinarySync(file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary);
  }
  if (readBinary) {
    return readBinary(file);
  }
  throw 'both async and sync fetching of the wasm failed';
}

async function getWasmBinary(binaryFile) {
  // If we don't have the binary yet, load it asynchronously using readAsync.
  if (!wasmBinary) {
    // Fetch the binary using readAsync
    try {
      var response = await readAsync(binaryFile);
      return new Uint8Array(response);
    } catch {
      // Fall back to getBinarySync below;
    }
  }

  // Otherwise, getBinarySync should be able to get it synchronously
  return getBinarySync(binaryFile);
}

async function instantiateArrayBuffer(binaryFile, imports) {
  try {
    var binary = await getWasmBinary(binaryFile);
    var instance = await WebAssembly.instantiate(binary, imports);
    return instance;
  } catch (reason) {
    err(`failed to asynchronously prepare wasm: ${reason}`);

    abort(reason);
  }
}

async function instantiateAsync(binary, binaryFile, imports) {
  if (!binary &&
      typeof WebAssembly.instantiateStreaming == 'function' &&
      !isDataURI(binaryFile)
      // Don't use streaming for file:// delivered objects in a webview, fetch them synchronously.
      && !isFileURI(binaryFile)
      // Avoid instantiateStreaming() on Node.js environment for now, as while
      // Node.js v18.1.0 implements it, it does not have a full fetch()
      // implementation yet.
      //
      // Reference:
      //   https://github.com/emscripten-core/emscripten/pull/16917
      && !ENVIRONMENT_IS_NODE
     ) {
    try {
      var response = fetch(binaryFile, { credentials: 'same-origin' });
      var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
      return instantiationResult;
    } catch (reason) {
      // We expect the most common failure cause to be a bad MIME type for the binary,
      // in which case falling back to ArrayBuffer instantiation should work.
      err(`wasm streaming compile failed: ${reason}`);
      err('falling back to ArrayBuffer instantiation');
      // fall back of instantiateArrayBuffer below
    };
  }
  return instantiateArrayBuffer(binaryFile, imports);
}

function getWasmImports() {
  // prepare imports
  return {
    'env': wasmImports,
    'wasi_snapshot_preview1': wasmImports,
  }
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
async function createWasm() {
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/
  function receiveInstance(instance, module) {
    wasmExports = instance.exports;

    

    wasmMemory = wasmExports['memory'];
    
    updateMemoryViews();

    wasmTable = wasmExports['__indirect_function_table'];
    Module['wasmTable'] = wasmTable;

    addOnInit(wasmExports['__wasm_call_ctors']);

    removeRunDependency('wasm-instantiate');
    return wasmExports;
  }
  // wait for the pthread pool (if any)
  addRunDependency('wasm-instantiate');

  // Prefer streaming instantiation if available.
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
    // When the regression is fixed, can restore the above PTHREADS-enabled path.
    return receiveInstance(result['instance']);
  }

  var info = getWasmImports();

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  if (Module['instantiateWasm']) {
    try {
      return Module['instantiateWasm'](info, receiveInstance);
    } catch(e) {
      err(`Module.instantiateWasm callback failed with error: ${e}`);
        return false;
    }
  }

  wasmBinaryFile ??= findWasmBinary();

    var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
    var exports = receiveInstantiationResult(result);
    return exports;
}

// === Body ===
// end include: preamble.js


  class ExitStatus {
      name = 'ExitStatus';
      constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }

  var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(Module);
      }
    };

  
    /**
     * @param {number} ptr
     * @param {string} type
     */
  function getValue(ptr, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': return HEAP8[ptr];
      case 'i8': return HEAP8[ptr];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP64[((ptr)>>3)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      case '*': return HEAPU32[((ptr)>>2)];
      default: abort(`invalid type for getValue: ${type}`);
    }
  }

  var noExitRuntime = Module['noExitRuntime'] || true;

  
    /**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */
  function setValue(ptr, value, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': HEAP8[ptr] = value; break;
      case 'i8': HEAP8[ptr] = value; break;
      case 'i16': HEAP16[((ptr)>>1)] = value; break;
      case 'i32': HEAP32[((ptr)>>2)] = value; break;
      case 'i64': HEAP64[((ptr)>>3)] = BigInt(value); break;
      case 'float': HEAPF32[((ptr)>>2)] = value; break;
      case 'double': HEAPF64[((ptr)>>3)] = value; break;
      case '*': HEAPU32[((ptr)>>2)] = value; break;
      default: abort(`invalid type for setValue: ${type}`);
    }
  }

  var stackRestore = (val) => __emscripten_stack_restore(val);

  var stackSave = () => _emscripten_stack_get_current();

  var getHeapMax = () =>
      // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
      // full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
      // for any code that deals with heap sizes, which would require special
      // casing all heap size related code to treat 0 specially.
      2147483648;
  
  var alignMemory = (size, alignment) => {
      return Math.ceil(size / alignment) * alignment;
    };
  
  var growMemory = (size) => {
      var b = wasmMemory.buffer;
      var pages = ((size - b.byteLength + 65535) / 65536) | 0;
      try {
        // round size grow request up to wasm page size (fixed 64KB per spec)
        wasmMemory.grow(pages); // .grow() takes a delta compared to the previous size
        updateMemoryViews();
        return 1 /*success*/;
      } catch(e) {
      }
      // implicit 0 return to save code size (caller will cast "undefined" into 0
      // anyhow)
    };
  var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
      requestedSize >>>= 0;
      // With multithreaded builds, races can happen (another thread might increase the size
      // in between), so return a failure, and let the caller retry.
  
      // Memory resize rules:
      // 1.  Always increase heap size to at least the requested size, rounded up
      //     to next page multiple.
      // 2a. If MEMORY_GROWTH_LINEAR_STEP == -1, excessively resize the heap
      //     geometrically: increase the heap size according to
      //     MEMORY_GROWTH_GEOMETRIC_STEP factor (default +20%), At most
      //     overreserve by MEMORY_GROWTH_GEOMETRIC_CAP bytes (default 96MB).
      // 2b. If MEMORY_GROWTH_LINEAR_STEP != -1, excessively resize the heap
      //     linearly: increase the heap size by at least
      //     MEMORY_GROWTH_LINEAR_STEP bytes.
      // 3.  Max size for the heap is capped at 2048MB-WASM_PAGE_SIZE, or by
      //     MAXIMUM_MEMORY, or by ASAN limit, depending on which is smallest
      // 4.  If we were unable to allocate as much memory, it may be due to
      //     over-eager decision to excessively reserve due to (3) above.
      //     Hence if an allocation fails, cut down on the amount of excess
      //     growth, in an attempt to succeed to perform a smaller allocation.
  
      // A limit is set for how much we can grow. We should not exceed that
      // (the wasm binary specifies it, so if we tried, we'd fail anyhow).
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        return false;
      }
  
      // Loop through potential heap size increases. If we attempt a too eager
      // reservation that fails, cut down on the attempted size and reserve a
      // smaller bump instead. (max 3 times, chosen somewhat arbitrarily)
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown); // ensure geometric growth
        // but limit overreserving (default to capping at +96MB overgrowth at most)
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296 );
  
        var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
  
        var replacement = growMemory(newSize);
        if (replacement) {
  
          return true;
        }
      }
      return false;
    };

  var PATH = {
  isAbs:(path) => path.charAt(0) === '/',
  splitPath:(filename) => {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },
  normalizeArray:(parts, allowAboveRoot) => {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },
  normalize:(path) => {
        var isAbsolute = PATH.isAbs(path),
            trailingSlash = path.slice(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter((p) => !!p), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },
  dirname:(path) => {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.slice(0, -1);
        }
        return root + dir;
      },
  basename:(path) => path && path.match(/([^\/]+|\/)\/*$/)[1],
  join:(...paths) => PATH.normalize(paths.join('/')),
  join2:(l, r) => PATH.normalize(l + '/' + r),
  };
  
  var initRandomFill = () => {
      // This block is not needed on v19+ since crypto.getRandomValues is builtin
      if (ENVIRONMENT_IS_NODE) {
        var nodeCrypto = require('crypto');
        return (view) => nodeCrypto.randomFillSync(view);
      }
  
      return (view) => crypto.getRandomValues(view);
    };
  var randomFill = (view) => {
      // Lazily init on the first invocation.
      (randomFill = initRandomFill())(view);
    };
  
  
  
  var PATH_FS = {
  resolve:(...args) => {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? args[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path != 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = PATH.isAbs(path);
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter((p) => !!p), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },
  relative:(from, to) => {
        from = PATH_FS.resolve(from).slice(1);
        to = PATH_FS.resolve(to).slice(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      },
  };
  
  
  var UTF8Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder() : undefined;
  
    /**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number=} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */
  var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead = NaN) => {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      // TextDecoder needs to know the byte length in advance, it doesn't stop on
      // null terminator by itself.  Also, use the length info to avoid running tiny
      // strings through TextDecoder, since .subarray() allocates garbage.
      // (As a tiny code save trick, compare endPtr against endIdx using a negation,
      // so that undefined/NaN means Infinity)
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = '';
      // If building with TextDecoder, we have already computed the string length
      // above, so test loop end condition against that
      while (idx < endPtr) {
        // For UTF8 byte structure, see:
        // http://en.wikipedia.org/wiki/UTF-8#Description
        // https://www.ietf.org/rfc/rfc2279.txt
        // https://tools.ietf.org/html/rfc3629
        var u0 = heapOrArray[idx++];
        if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 0xF0) == 0xE0) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
        }
  
        if (u0 < 0x10000) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        }
      }
      return str;
    };
  
  var FS_stdin_getChar_buffer = [];
  
  var lengthBytesUTF8 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var c = str.charCodeAt(i); // possibly a lead surrogate
        if (c <= 0x7F) {
          len++;
        } else if (c <= 0x7FF) {
          len += 2;
        } else if (c >= 0xD800 && c <= 0xDFFF) {
          len += 4; ++i;
        } else {
          len += 3;
        }
      }
      return len;
    };
  
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
      // undefined and false each don't write out any bytes.
      if (!(maxBytesToWrite > 0))
        return 0;
  
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
        // and https://www.ietf.org/rfc/rfc2279.txt
        // and https://tools.ietf.org/html/rfc3629
        var u = str.charCodeAt(i); // possibly a lead surrogate
        if (u >= 0xD800 && u <= 0xDFFF) {
          var u1 = str.charCodeAt(++i);
          u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
        }
        if (u <= 0x7F) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 0x7FF) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 0xC0 | (u >> 6);
          heap[outIdx++] = 0x80 | (u & 63);
        } else if (u <= 0xFFFF) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 0xE0 | (u >> 12);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        } else {
          if (outIdx + 3 >= endIdx) break;
          heap[outIdx++] = 0xF0 | (u >> 18);
          heap[outIdx++] = 0x80 | ((u >> 12) & 63);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        }
      }
      // Null-terminate the pointer to the buffer.
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
  /** @type {function(string, boolean=, number=)} */
  var intArrayFromString = (stringy, dontAddNull, length) => {
      var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      if (dontAddNull) u8array.length = numBytesWritten;
      return u8array;
    };
  var FS_stdin_getChar = () => {
      if (!FS_stdin_getChar_buffer.length) {
        var result = null;
        if (ENVIRONMENT_IS_NODE) {
          // we will read data by chunks of BUFSIZE
          var BUFSIZE = 256;
          var buf = Buffer.alloc(BUFSIZE);
          var bytesRead = 0;
  
          // For some reason we must suppress a closure warning here, even though
          // fd definitely exists on process.stdin, and is even the proper way to
          // get the fd of stdin,
          // https://github.com/nodejs/help/issues/2136#issuecomment-523649904
          // This started to happen after moving this logic out of library_tty.js,
          // so it is related to the surrounding code in some unclear manner.
          /** @suppress {missingProperties} */
          var fd = process.stdin.fd;
  
          try {
            bytesRead = fs.readSync(fd, buf, 0, BUFSIZE);
          } catch(e) {
            // Cross-platform differences: on Windows, reading EOF throws an
            // exception, but on other OSes, reading EOF returns 0. Uniformize
            // behavior by treating the EOF exception to return 0.
            if (e.toString().includes('EOF')) bytesRead = 0;
            else throw e;
          }
  
          if (bytesRead > 0) {
            result = buf.slice(0, bytesRead).toString('utf-8');
          }
        } else
        if (typeof window != 'undefined' &&
          typeof window.prompt == 'function') {
          // Browser.
          result = window.prompt('Input: ');  // returns null on cancel
          if (result !== null) {
            result += '\n';
          }
        } else
        {}
        if (!result) {
          return null;
        }
        FS_stdin_getChar_buffer = intArrayFromString(result, true);
      }
      return FS_stdin_getChar_buffer.shift();
    };
  var TTY = {
  ttys:[],
  init() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process.stdin.setEncoding('utf8');
        // }
      },
  shutdown() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process.stdin.pause();
        // }
      },
  register(dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },
  stream_ops:{
  open(stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(43);
          }
          stream.tty = tty;
          stream.seekable = false;
        },
  close(stream) {
          // flush any pending line data
          stream.tty.ops.fsync(stream.tty);
        },
  fsync(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
  read(stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(60);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(6);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.atime = Date.now();
          }
          return bytesRead;
        },
  write(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(60);
          }
          try {
            for (var i = 0; i < length; i++) {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            }
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) {
            stream.node.mtime = stream.node.ctime = Date.now();
          }
          return i;
        },
  },
  default_tty_ops:{
  get_char(tty) {
          return FS_stdin_getChar();
        },
  put_char(tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },
  fsync(tty) {
          if (tty.output?.length > 0) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
  ioctl_tcgets(tty) {
          // typical setting
          return {
            c_iflag: 25856,
            c_oflag: 5,
            c_cflag: 191,
            c_lflag: 35387,
            c_cc: [
              0x03, 0x1c, 0x7f, 0x15, 0x04, 0x00, 0x01, 0x00, 0x11, 0x13, 0x1a, 0x00,
              0x12, 0x0f, 0x17, 0x16, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
              0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            ]
          };
        },
  ioctl_tcsets(tty, optional_actions, data) {
          // currently just ignore
          return 0;
        },
  ioctl_tiocgwinsz(tty) {
          return [24, 80];
        },
  },
  default_tty1_ops:{
  put_char(tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },
  fsync(tty) {
          if (tty.output?.length > 0) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
  },
  };
  
  
  var zeroMemory = (address, size) => {
      HEAPU8.fill(0, address, address + size);
    };
  
  var mmapAlloc = (size) => {
      abort();
    };
  var MEMFS = {
  ops_table:null,
  mount(mount) {
        return MEMFS.createNode(null, '/', 16895, 0);
      },
  createNode(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(63);
        }
        MEMFS.ops_table ||= {
          dir: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              lookup: MEMFS.node_ops.lookup,
              mknod: MEMFS.node_ops.mknod,
              rename: MEMFS.node_ops.rename,
              unlink: MEMFS.node_ops.unlink,
              rmdir: MEMFS.node_ops.rmdir,
              readdir: MEMFS.node_ops.readdir,
              symlink: MEMFS.node_ops.symlink
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek
            }
          },
          file: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek,
              read: MEMFS.stream_ops.read,
              write: MEMFS.stream_ops.write,
              allocate: MEMFS.stream_ops.allocate,
              mmap: MEMFS.stream_ops.mmap,
              msync: MEMFS.stream_ops.msync
            }
          },
          link: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              readlink: MEMFS.node_ops.readlink
            },
            stream: {}
          },
          chrdev: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: FS.chrdev_stream_ops
          }
        };
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.length which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.atime = node.mtime = node.ctime = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
          parent.atime = parent.mtime = parent.ctime = node.atime;
        }
        return node;
      },
  getFileDataAsTypedArray(node) {
        if (!node.contents) return new Uint8Array(0);
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },
  expandFileStorage(node, newCapacity) {
        var prevCapacity = node.contents ? node.contents.length : 0;
        if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
        // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
        // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
        // avoid overshooting the allocation cap by a very large margin.
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) >>> 0);
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity); // Allocate new storage.
        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
      },
  resizeFileStorage(node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
        } else {
          var oldContents = node.contents;
          node.contents = new Uint8Array(newSize); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
        }
      },
  node_ops:{
  getattr(node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.atime);
          attr.mtime = new Date(node.mtime);
          attr.ctime = new Date(node.ctime);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },
  setattr(node, attr) {
          for (const key of ["mode", "atime", "mtime", "ctime"]) {
            if (attr[key] != null) {
              node[key] = attr[key];
            }
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },
  lookup(parent, name) {
          throw MEMFS.doesNotExistError;
        },
  mknod(parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },
  rename(old_node, new_dir, new_name) {
          var new_node;
          try {
            new_node = FS.lookupNode(new_dir, new_name);
          } catch (e) {}
          if (new_node) {
            if (FS.isDir(old_node.mode)) {
              // if we're overwriting a directory at new_name, make sure it's empty.
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(55);
              }
            }
            FS.hashRemoveNode(new_node);
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          new_dir.contents[new_name] = old_node;
          old_node.name = new_name;
          new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
        },
  unlink(parent, name) {
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
  rmdir(parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(55);
          }
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
  readdir(node) {
          return ['.', '..', ...Object.keys(node.contents)];
        },
  symlink(parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 0o777 | 40960, 0);
          node.link = oldpath;
          return node;
        },
  readlink(node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(28);
          }
          return node.link;
        },
  },
  stream_ops:{
  read(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },
  write(stream, buffer, offset, length, position, canOwn) {
          // If the buffer is located in main memory (HEAP), and if
          // memory can grow, we can't hold on to references of the
          // memory buffer, as they may get invalidated. That means we
          // need to do copy its contents.
          if (buffer.buffer === HEAP8.buffer) {
            canOwn = false;
          }
  
          if (!length) return 0;
          var node = stream.node;
          node.mtime = node.ctime = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) {
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = buffer.slice(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
  
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) {
            // Use typed array write which is available.
            node.contents.set(buffer.subarray(offset, offset + length), position);
          } else {
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position + length);
          return length;
        },
  llseek(stream, offset, whence) {
          var position = offset;
          if (whence === 1) {
            position += stream.position;
          } else if (whence === 2) {
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(28);
          }
          return position;
        },
  allocate(stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },
  mmap(stream, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if (!(flags & 2) && contents && contents.buffer === HEAP8.buffer) {
            // We can't emulate MAP_SHARED when the file is not backed by the
            // buffer we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            allocated = true;
            ptr = mmapAlloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(48);
            }
            if (contents) {
              // Try to avoid unnecessary slices.
              if (position > 0 || position + length < contents.length) {
                if (contents.subarray) {
                  contents = contents.subarray(position, position + length);
                } else {
                  contents = Array.prototype.slice.call(contents, position, position + length);
                }
              }
              HEAP8.set(contents, ptr);
            }
          }
          return { ptr, allocated };
        },
  msync(stream, buffer, offset, length, mmapFlags) {
          MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        },
  },
  };
  
  var asyncLoad = async (url) => {
      var arrayBuffer = await readAsync(url);
      return new Uint8Array(arrayBuffer);
    };
  
  
  var FS_createDataFile = (parent, name, fileData, canRead, canWrite, canOwn) => {
      FS.createDataFile(parent, name, fileData, canRead, canWrite, canOwn);
    };
  
  var preloadPlugins = Module['preloadPlugins'] || [];
  var FS_handledByPreloadPlugin = (byteArray, fullname, finish, onerror) => {
      // Ensure plugins are ready.
      if (typeof Browser != 'undefined') Browser.init();
  
      var handled = false;
      preloadPlugins.forEach((plugin) => {
        if (handled) return;
        if (plugin['canHandle'](fullname)) {
          plugin['handle'](byteArray, fullname, finish, onerror);
          handled = true;
        }
      });
      return handled;
    };
  var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      // TODO we should allow people to just pass in a complete filename instead
      // of parent and name being that we just join them anyways
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency(`cp ${fullname}`); // might have several active requests for the same fullname
      function processData(byteArray) {
        function finish(byteArray) {
          preFinish?.();
          if (!dontCreateFile) {
            FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
          }
          onload?.();
          removeRunDependency(dep);
        }
        if (FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
          onerror?.();
          removeRunDependency(dep);
        })) {
          return;
        }
        finish(byteArray);
      }
      addRunDependency(dep);
      if (typeof url == 'string') {
        asyncLoad(url).then(processData, onerror);
      } else {
        processData(url);
      }
    };
  
  var FS_modeStringToFlags = (str) => {
      var flagModes = {
        'r': 0,
        'r+': 2,
        'w': 512 | 64 | 1,
        'w+': 512 | 64 | 2,
        'a': 1024 | 64 | 1,
        'a+': 1024 | 64 | 2,
      };
      var flags = flagModes[str];
      if (typeof flags == 'undefined') {
        throw new Error(`Unknown file open mode: ${str}`);
      }
      return flags;
    };
  
  var FS_getMode = (canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode;
    };
  
  
  
  var FS = {
  root:null,
  mounts:[],
  devices:{
  },
  streams:[],
  nextInode:1,
  nameTable:null,
  currentPath:"/",
  initialized:false,
  ignorePermissions:true,
  ErrnoError:class {
        name = 'ErrnoError';
        // We set the `name` property to be able to identify `FS.ErrnoError`
        // - the `name` is a standard ECMA-262 property of error objects. Kind of good to have it anyway.
        // - when using PROXYFS, an error can come from an underlying FS
        // as different FS objects have their own FS.ErrnoError each,
        // the test `err instanceof FS.ErrnoError` won't detect an error coming from another filesystem, causing bugs.
        // we'll use the reliable test `err.name == "ErrnoError"` instead
        constructor(errno) {
          this.errno = errno;
        }
      },
  filesystems:null,
  syncFSRequests:0,
  readFiles:{
  },
  FSStream:class {
        shared = {};
        get object() {
          return this.node;
        }
        set object(val) {
          this.node = val;
        }
        get isRead() {
          return (this.flags & 2097155) !== 1;
        }
        get isWrite() {
          return (this.flags & 2097155) !== 0;
        }
        get isAppend() {
          return (this.flags & 1024);
        }
        get flags() {
          return this.shared.flags;
        }
        set flags(val) {
          this.shared.flags = val;
        }
        get position() {
          return this.shared.position;
        }
        set position(val) {
          this.shared.position = val;
        }
      },
  FSNode:class {
        node_ops = {};
        stream_ops = {};
        readMode = 292 | 73;
        writeMode = 146;
        mounted = null;
        constructor(parent, name, mode, rdev) {
          if (!parent) {
            parent = this;  // root node sets parent to itself
          }
          this.parent = parent;
          this.mount = parent.mount;
          this.id = FS.nextInode++;
          this.name = name;
          this.mode = mode;
          this.rdev = rdev;
          this.atime = this.mtime = this.ctime = Date.now();
        }
        get read() {
          return (this.mode & this.readMode) === this.readMode;
        }
        set read(val) {
          val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
        }
        get write() {
          return (this.mode & this.writeMode) === this.writeMode;
        }
        set write(val) {
          val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
        }
        get isFolder() {
          return FS.isDir(this.mode);
        }
        get isDevice() {
          return FS.isChrdev(this.mode);
        }
      },
  lookupPath(path, opts = {}) {
        if (!path) {
          throw new FS.ErrnoError(44);
        }
        opts.follow_mount ??= true
  
        if (!PATH.isAbs(path)) {
          path = FS.cwd() + '/' + path;
        }
  
        // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
        linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
          // split the absolute path
          var parts = path.split('/').filter((p) => !!p);
  
          // start at the root
          var current = FS.root;
          var current_path = '/';
  
          for (var i = 0; i < parts.length; i++) {
            var islast = (i === parts.length-1);
            if (islast && opts.parent) {
              // stop resolving
              break;
            }
  
            if (parts[i] === '.') {
              continue;
            }
  
            if (parts[i] === '..') {
              current_path = PATH.dirname(current_path);
              current = current.parent;
              continue;
            }
  
            current_path = PATH.join2(current_path, parts[i]);
            try {
              current = FS.lookupNode(current, parts[i]);
            } catch (e) {
              // if noent_okay is true, suppress a ENOENT in the last component
              // and return an object with an undefined node. This is needed for
              // resolving symlinks in the path when creating a file.
              if ((e?.errno === 44) && islast && opts.noent_okay) {
                return { path: current_path };
              }
              throw e;
            }
  
            // jump to the mount's root node if this is a mountpoint
            if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) {
              current = current.mounted.root;
            }
  
            // by default, lookupPath will not follow a symlink if it is the final path component.
            // setting opts.follow = true will override this behavior.
            if (FS.isLink(current.mode) && (!islast || opts.follow)) {
              if (!current.node_ops.readlink) {
                throw new FS.ErrnoError(52);
              }
              var link = current.node_ops.readlink(current);
              if (!PATH.isAbs(link)) {
                link = PATH.dirname(current_path) + '/' + link;
              }
              path = link + '/' + parts.slice(i + 1).join('/');
              continue linkloop;
            }
          }
          return { path: current_path, node: current };
        }
        throw new FS.ErrnoError(32);
      },
  getPath(node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? `${mount}/${path}` : mount + path;
          }
          path = path ? `${node.name}/${path}` : node.name;
          node = node.parent;
        }
      },
  hashName(parentid, name) {
        var hash = 0;
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },
  hashAddNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },
  hashRemoveNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },
  lookupNode(parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },
  createNode(parent, name, mode, rdev) {
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },
  destroyNode(node) {
        FS.hashRemoveNode(node);
      },
  isRoot(node) {
        return node === node.parent;
      },
  isMountpoint(node) {
        return !!node.mounted;
      },
  isFile(mode) {
        return (mode & 61440) === 32768;
      },
  isDir(mode) {
        return (mode & 61440) === 16384;
      },
  isLink(mode) {
        return (mode & 61440) === 40960;
      },
  isChrdev(mode) {
        return (mode & 61440) === 8192;
      },
  isBlkdev(mode) {
        return (mode & 61440) === 24576;
      },
  isFIFO(mode) {
        return (mode & 61440) === 4096;
      },
  isSocket(mode) {
        return (mode & 49152) === 49152;
      },
  flagsToPermissionString(flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },
  nodePermissions(node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.includes('r') && !(node.mode & 292)) {
          return 2;
        } else if (perms.includes('w') && !(node.mode & 146)) {
          return 2;
        } else if (perms.includes('x') && !(node.mode & 73)) {
          return 2;
        }
        return 0;
      },
  mayLookup(dir) {
        if (!FS.isDir(dir.mode)) return 54;
        var errCode = FS.nodePermissions(dir, 'x');
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0;
      },
  mayCreate(dir, name) {
        if (!FS.isDir(dir.mode)) {
          return 54;
        }
        try {
          var node = FS.lookupNode(dir, name);
          return 20;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },
  mayDelete(dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var errCode = FS.nodePermissions(dir, 'wx');
        if (errCode) {
          return errCode;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return 54;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return 10;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return 31;
          }
        }
        return 0;
      },
  mayOpen(node, flags) {
        if (!node) {
          return 44;
        }
        if (FS.isLink(node.mode)) {
          return 32;
        } else if (FS.isDir(node.mode)) {
          if (FS.flagsToPermissionString(flags) !== 'r' // opening for write
              || (flags & (512 | 64))) { // TODO: check for O_SEARCH? (== search for dir only)
            return 31;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },
  checkOpExists(op, err) {
        if (!op) {
          throw new FS.ErrnoError(err);
        }
        return op;
      },
  MAX_OPEN_FDS:4096,
  nextfd() {
        for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(33);
      },
  getStreamChecked(fd) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        return stream;
      },
  getStream:(fd) => FS.streams[fd],
  createStream(stream, fd = -1) {
  
        // clone it, so we can return an instance of FSStream
        stream = Object.assign(new FS.FSStream(), stream);
        if (fd == -1) {
          fd = FS.nextfd();
        }
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },
  closeStream(fd) {
        FS.streams[fd] = null;
      },
  dupStream(origStream, fd = -1) {
        var stream = FS.createStream(origStream, fd);
        stream.stream_ops?.dup?.(stream);
        return stream;
      },
  doSetAttr(stream, node, attr) {
        var setattr = stream?.stream_ops.setattr;
        var arg = setattr ? stream : node;
        setattr ??= node.node_ops.setattr;
        FS.checkOpExists(setattr, 63)
        setattr(arg, attr);
      },
  chrdev_stream_ops:{
  open(stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          stream.stream_ops.open?.(stream);
        },
  llseek() {
          throw new FS.ErrnoError(70);
        },
  },
  major:(dev) => ((dev) >> 8),
  minor:(dev) => ((dev) & 0xff),
  makedev:(ma, mi) => ((ma) << 8 | (mi)),
  registerDevice(dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },
  getDevice:(dev) => FS.devices[dev],
  getMounts(mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push(...m.mounts);
        }
  
        return mounts;
      },
  syncfs(populate, callback) {
        if (typeof populate == 'function') {
          callback = populate;
          populate = false;
        }
  
        FS.syncFSRequests++;
  
        if (FS.syncFSRequests > 1) {
          err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function doCallback(errCode) {
          FS.syncFSRequests--;
          return callback(errCode);
        }
  
        function done(errCode) {
          if (errCode) {
            if (!done.errored) {
              done.errored = true;
              return doCallback(errCode);
            }
            return;
          }
          if (++completed >= mounts.length) {
            doCallback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach((mount) => {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },
  mount(type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(10);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54);
          }
        }
  
        var mount = {
          type,
          opts,
          mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },
  unmount(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(28);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach((hash) => {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.includes(current.mount)) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        node.mount.mounts.splice(idx, 1);
      },
  lookup(parent, name) {
        return parent.node_ops.lookup(parent, name);
      },
  mknod(path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name) {
          throw new FS.ErrnoError(28);
        }
        if (name === '.' || name === '..') {
          throw new FS.ErrnoError(20);
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },
  statfs(path) {
        return FS.statfsNode(FS.lookupPath(path, {follow: true}).node);
      },
  statfsStream(stream) {
        // We keep a separate statfsStream function because noderawfs overrides
        // it. In noderawfs, stream.node is sometimes null. Instead, we need to
        // look at stream.path.
        return FS.statfsNode(stream.node);
      },
  statfsNode(node) {
        // NOTE: None of the defaults here are true. We're just returning safe and
        //       sane values. Currently nodefs and rawfs replace these defaults,
        //       other file systems leave them alone.
        var rtn = {
          bsize: 4096,
          frsize: 4096,
          blocks: 1e6,
          bfree: 5e5,
          bavail: 5e5,
          files: FS.nextInode,
          ffree: FS.nextInode - 1,
          fsid: 42,
          flags: 2,
          namelen: 255,
        };
  
        if (node.node_ops.statfs) {
          Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
        }
        return rtn;
      },
  create(path, mode = 0o666) {
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },
  mkdir(path, mode = 0o777) {
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },
  mkdirTree(path, mode) {
        var dirs = path.split('/');
        var d = '';
        for (var i = 0; i < dirs.length; ++i) {
          if (!dirs[i]) continue;
          d += '/' + dirs[i];
          try {
            FS.mkdir(d, mode);
          } catch(e) {
            if (e.errno != 20) throw e;
          }
        }
      },
  mkdev(path, mode, dev) {
        if (typeof dev == 'undefined') {
          dev = mode;
          mode = 0o666;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },
  symlink(oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) {
          throw new FS.ErrnoError(44);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },
  rename(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
  
        // let the errors from non existent directories percolate up
        lookup = FS.lookupPath(old_path, { parent: true });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, { parent: true });
        new_dir = lookup.node;
  
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(75);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(28);
        }
        // new path should not be an ancestor of the old path
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(55);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        errCode = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(10);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          errCode = FS.nodePermissions(old_dir, 'w');
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
          // update old node (we do this here to avoid each backend
          // needing to)
          old_node.parent = new_dir;
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },
  rmdir(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },
  readdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        var readdir = FS.checkOpExists(node.node_ops.readdir, 54);
        return readdir(node);
      },
  unlink(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
          // According to POSIX, we should map EISDIR to EPERM, but
          // we instead do what Linux does (and we must, as we use
          // the musl linux libc).
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },
  readlink(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(44);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(28);
        }
        return link.node_ops.readlink(link);
      },
  stat(path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        var getattr = FS.checkOpExists(node.node_ops.getattr, 63);
        return getattr(node);
      },
  fstat(fd) {
        var stream = FS.getStreamChecked(fd);
        var node = stream.node;
        var getattr = stream.stream_ops.getattr;
        var arg = getattr ? stream : node;
        getattr ??= node.node_ops.getattr;
        FS.checkOpExists(getattr, 63)
        return getattr(arg);
      },
  lstat(path) {
        return FS.stat(path, true);
      },
  doChmod(stream, node, mode, dontFollow) {
        FS.doSetAttr(stream, node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          ctime: Date.now(),
          dontFollow
        });
      },
  chmod(path, mode, dontFollow) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doChmod(null, node, mode, dontFollow);
      },
  lchmod(path, mode) {
        FS.chmod(path, mode, true);
      },
  fchmod(fd, mode) {
        var stream = FS.getStreamChecked(fd);
        FS.doChmod(stream, stream.node, mode, false);
      },
  doChown(stream, node, dontFollow) {
        FS.doSetAttr(stream, node, {
          timestamp: Date.now(),
          dontFollow
          // we ignore the uid / gid for now
        });
      },
  chown(path, uid, gid, dontFollow) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doChown(null, node, dontFollow);
      },
  lchown(path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },
  fchown(fd, uid, gid) {
        var stream = FS.getStreamChecked(fd);
        FS.doChown(stream, stream.node, false);
      },
  doTruncate(stream, node, len) {
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.nodePermissions(node, 'w');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.doSetAttr(stream, node, {
          size: len,
          timestamp: Date.now()
        });
      },
  truncate(path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(28);
        }
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doTruncate(null, node, len);
      },
  ftruncate(fd, len) {
        var stream = FS.getStreamChecked(fd);
        if (len < 0 || (stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(28);
        }
        FS.doTruncate(stream, stream.node, len);
      },
  utime(path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        var setattr = FS.checkOpExists(node.node_ops.setattr, 63);
        setattr(node, {
          atime: atime,
          mtime: mtime
        });
      },
  open(path, flags, mode = 0o666) {
        if (path === "") {
          throw new FS.ErrnoError(44);
        }
        flags = typeof flags == 'string' ? FS_modeStringToFlags(flags) : flags;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        var isDirPath;
        if (typeof path == 'object') {
          node = path;
        } else {
          isDirPath = path.endsWith("/");
          // noent_okay makes it so that if the final component of the path
          // doesn't exist, lookupPath returns `node: undefined`. `path` will be
          // updated to point to the target of all symlinks.
          var lookup = FS.lookupPath(path, {
            follow: !(flags & 131072),
            noent_okay: true
          });
          node = lookup.node;
          path = lookup.path;
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(20);
            }
          } else if (isDirPath) {
            throw new FS.ErrnoError(31);
          } else {
            // node doesn't exist, try to create it
            // Ignore the permission bits here to ensure we can `open` this new
            // file below. We use chmod below the apply the permissions once the
            // file is open.
            node = FS.mknod(path, mode | 0o777, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var errCode = FS.mayOpen(node, flags);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // do truncation if necessary
        if ((flags & 512) && !created) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512 | 131072);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        });
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (created) {
          FS.chmod(node, mode & 0o777);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
          }
        }
        return stream;
      },
  close(stream) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (stream.getdents) stream.getdents = null; // free readdir state
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
        stream.fd = null;
      },
  isClosed(stream) {
        return stream.fd === null;
      },
  llseek(stream, offset, whence) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(70);
        }
        if (whence != 0 && whence != 1 && whence != 2) {
          throw new FS.ErrnoError(28);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },
  read(stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(28);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },
  write(stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(28);
        }
        if (stream.seekable && stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },
  allocate(stream, offset, length) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(28);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(138);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },
  mmap(stream, length, position, prot, flags) {
        // User requests writing to file (prot & PROT_WRITE != 0).
        // Checking if we have permissions to write to the file unless
        // MAP_PRIVATE flag is set. According to POSIX spec it is possible
        // to write to file opened in read-only mode with MAP_PRIVATE flag,
        // as all modifications will be visible only in the memory of
        // the current process.
        if ((prot & 2) !== 0
            && (flags & 2) === 0
            && (stream.flags & 2097155) !== 2) {
          throw new FS.ErrnoError(2);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(2);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(43);
        }
        if (!length) {
          throw new FS.ErrnoError(28);
        }
        return stream.stream_ops.mmap(stream, length, position, prot, flags);
      },
  msync(stream, buffer, offset, length, mmapFlags) {
        if (!stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },
  ioctl(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(59);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },
  readFile(path, opts = {}) {
        opts.flags = opts.flags || 0;
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error(`Invalid encoding type "${opts.encoding}"`);
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = UTF8ArrayToString(buf);
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },
  writeFile(path, data, opts = {}) {
        opts.flags = opts.flags || 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        if (typeof data == 'string') {
          var buf = new Uint8Array(lengthBytesUTF8(data)+1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
        } else if (ArrayBuffer.isView(data)) {
          FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
        } else {
          throw new Error('Unsupported data type');
        }
        FS.close(stream);
      },
  cwd:() => FS.currentPath,
  chdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (lookup.node === null) {
          throw new FS.ErrnoError(44);
        }
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(54);
        }
        var errCode = FS.nodePermissions(lookup.node, 'x');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.currentPath = lookup.path;
      },
  createDefaultDirectories() {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },
  createDefaultDevices() {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: () => 0,
          write: (stream, buffer, offset, length, pos) => length,
          llseek: () => 0,
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using err() rather than out()
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        // use a buffer to avoid overhead of individual crypto calls per byte
        var randomBuffer = new Uint8Array(1024), randomLeft = 0;
        var randomByte = () => {
          if (randomLeft === 0) {
            randomFill(randomBuffer);
            randomLeft = randomBuffer.byteLength;
          }
          return randomBuffer[--randomLeft];
        };
        FS.createDevice('/dev', 'random', randomByte);
        FS.createDevice('/dev', 'urandom', randomByte);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },
  createSpecialDirectories() {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the
        // name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        var proc_self = FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount() {
            var node = FS.createNode(proc_self, 'fd', 16895, 73);
            node.stream_ops = {
              llseek: MEMFS.stream_ops.llseek,
            };
            node.node_ops = {
              lookup(parent, name) {
                var fd = +name;
                var stream = FS.getStreamChecked(fd);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: () => stream.path },
                  id: fd + 1,
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              },
              readdir() {
                return Array.from(FS.streams.entries())
                  .filter(([k, v]) => v)
                  .map(([k, v]) => k.toString());
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },
  createStandardStreams(input, output, error) {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (input) {
          FS.createDevice('/dev', 'stdin', input);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (output) {
          FS.createDevice('/dev', 'stdout', null, output);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (error) {
          FS.createDevice('/dev', 'stderr', null, error);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 0);
        var stdout = FS.open('/dev/stdout', 1);
        var stderr = FS.open('/dev/stderr', 1);
      },
  staticInit() {
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
  
        FS.filesystems = {
          'MEMFS': MEMFS,
        };
      },
  init(input, output, error) {
        FS.initialized = true;
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        input ??= Module['stdin'];
        output ??= Module['stdout'];
        error ??= Module['stderr'];
  
        FS.createStandardStreams(input, output, error);
      },
  quit() {
        FS.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        // close all of our streams
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },
  findObject(path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (!ret.exists) {
          return null;
        }
        return ret.object;
      },
  analyzePath(path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },
  createPath(parent, path, canRead, canWrite) {
        parent = typeof parent == 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },
  createFile(parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(canRead, canWrite);
        return FS.create(path, mode);
      },
  createDataFile(parent, name, data, canRead, canWrite, canOwn) {
        var path = name;
        if (parent) {
          parent = typeof parent == 'string' ? parent : FS.getPath(parent);
          path = name ? PATH.join2(parent, name) : parent;
        }
        var mode = FS_getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data == 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 577);
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
      },
  createDevice(parent, name, input, output) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(!!input, !!output);
        FS.createDevice.major ??= 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open(stream) {
            stream.seekable = false;
          },
          close(stream) {
            // flush any pending line data
            if (output?.buffer?.length) {
              output(10);
            }
          },
          read(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(6);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.atime = Date.now();
            }
            return bytesRead;
          },
          write(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
            }
            if (length) {
              stream.node.mtime = stream.node.ctime = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },
  forceLoadFile(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (typeof XMLHttpRequest != 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else { // Command-line.
          try {
            obj.contents = readBinary(obj.url);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
      },
  createLazyFile(parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array).
        // Actual getting is abstracted away for eventual reuse.
        class LazyUint8Array {
          lengthKnown = false;
          chunks = []; // Loaded chunks. Index is the chunk number
          get(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = (idx / this.chunkSize)|0;
            return this.getter(chunkNum)[chunkOffset];
          }
          setDataGetter(getter) {
            this.getter = getter;
          }
          cacheLength() {
            // Find length
            var xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
  
            var chunkSize = 1024*1024; // Chunk size in bytes
  
            if (!hasByteServing) chunkSize = datalength;
  
            // Function to get a range from the remote URL.
            var doXHR = (from, to) => {
              if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
              if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
              // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
              var xhr = new XMLHttpRequest();
              xhr.open('GET', url, false);
              if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
              // Some hints to the browser that we want binary data.
              xhr.responseType = 'arraybuffer';
              if (xhr.overrideMimeType) {
                xhr.overrideMimeType('text/plain; charset=x-user-defined');
              }
  
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
              if (xhr.response !== undefined) {
                return new Uint8Array(/** @type{Array<number>} */(xhr.response || []));
              }
              return intArrayFromString(xhr.responseText || '', true);
            };
            var lazyArray = this;
            lazyArray.setDataGetter((chunkNum) => {
              var start = chunkNum * chunkSize;
              var end = (chunkNum+1) * chunkSize - 1; // including this byte
              end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
              if (typeof lazyArray.chunks[chunkNum] == 'undefined') {
                lazyArray.chunks[chunkNum] = doXHR(start, end);
              }
              if (typeof lazyArray.chunks[chunkNum] == 'undefined') throw new Error('doXHR failed!');
              return lazyArray.chunks[chunkNum];
            });
  
            if (usesGzip || !datalength) {
              // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
              chunkSize = datalength = 1; // this will force getter(0)/doXHR do download the whole file
              datalength = this.getter(0).length;
              chunkSize = datalength;
              out("LazyFiles on gzip forces download of the whole file when length is accessed");
            }
  
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true;
          }
          get length() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._length;
          }
          get chunkSize() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._chunkSize;
          }
        }
  
        if (typeof XMLHttpRequest != 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperties(node, {
          usedBytes: {
            get: function() { return this.contents.length; }
          }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach((key) => {
          var fn = node.stream_ops[key];
          stream_ops[key] = (...args) => {
            FS.forceLoadFile(node);
            return fn(...args);
          };
        });
        function writeChunks(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        }
        // use a custom read function
        stream_ops.read = (stream, buffer, offset, length, position) => {
          FS.forceLoadFile(node);
          return writeChunks(stream, buffer, offset, length, position)
        };
        // use a custom mmap function
        stream_ops.mmap = (stream, length, position, prot, flags) => {
          FS.forceLoadFile(node);
          var ptr = mmapAlloc(length);
          if (!ptr) {
            throw new FS.ErrnoError(48);
          }
          writeChunks(stream, HEAP8, ptr, length, position);
          return { ptr, allocated: true };
        };
        node.stream_ops = stream_ops;
        return node;
      },
  };
  
  
    /**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index (i.e. maxBytesToRead will not
     *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
     *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
     *   JS JIT optimizations off, so it is worth to consider consistently using one
     * @return {string}
     */
  var UTF8ToString = (ptr, maxBytesToRead) => {
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
    };
  var SYSCALLS = {
  DEFAULT_POLLMASK:5,
  calculateAt(dirfd, path, allowEmpty) {
        if (PATH.isAbs(path)) {
          return path;
        }
        // relative path
        var dir;
        if (dirfd === -100) {
          dir = FS.cwd();
        } else {
          var dirstream = SYSCALLS.getStreamFromFD(dirfd);
          dir = dirstream.path;
        }
        if (path.length == 0) {
          if (!allowEmpty) {
            throw new FS.ErrnoError(44);;
          }
          return dir;
        }
        return dir + '/' + path;
      },
  writeStat(buf, stat) {
        HEAP32[((buf)>>2)] = stat.dev;
        HEAP32[(((buf)+(4))>>2)] = stat.mode;
        HEAPU32[(((buf)+(8))>>2)] = stat.nlink;
        HEAP32[(((buf)+(12))>>2)] = stat.uid;
        HEAP32[(((buf)+(16))>>2)] = stat.gid;
        HEAP32[(((buf)+(20))>>2)] = stat.rdev;
        HEAP64[(((buf)+(24))>>3)] = BigInt(stat.size);
        HEAP32[(((buf)+(32))>>2)] = 4096;
        HEAP32[(((buf)+(36))>>2)] = stat.blocks;
        var atime = stat.atime.getTime();
        var mtime = stat.mtime.getTime();
        var ctime = stat.ctime.getTime();
        HEAP64[(((buf)+(40))>>3)] = BigInt(Math.floor(atime / 1000));
        HEAPU32[(((buf)+(48))>>2)] = (atime % 1000) * 1000 * 1000;
        HEAP64[(((buf)+(56))>>3)] = BigInt(Math.floor(mtime / 1000));
        HEAPU32[(((buf)+(64))>>2)] = (mtime % 1000) * 1000 * 1000;
        HEAP64[(((buf)+(72))>>3)] = BigInt(Math.floor(ctime / 1000));
        HEAPU32[(((buf)+(80))>>2)] = (ctime % 1000) * 1000 * 1000;
        HEAP64[(((buf)+(88))>>3)] = BigInt(stat.ino);
        return 0;
      },
  writeStatFs(buf, stats) {
        HEAP32[(((buf)+(4))>>2)] = stats.bsize;
        HEAP32[(((buf)+(40))>>2)] = stats.bsize;
        HEAP32[(((buf)+(8))>>2)] = stats.blocks;
        HEAP32[(((buf)+(12))>>2)] = stats.bfree;
        HEAP32[(((buf)+(16))>>2)] = stats.bavail;
        HEAP32[(((buf)+(20))>>2)] = stats.files;
        HEAP32[(((buf)+(24))>>2)] = stats.ffree;
        HEAP32[(((buf)+(28))>>2)] = stats.fsid;
        HEAP32[(((buf)+(44))>>2)] = stats.flags;  // ST_NOSUID
        HEAP32[(((buf)+(36))>>2)] = stats.namelen;
      },
  doMsync(addr, stream, len, flags, offset) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (flags & 2) {
          // MAP_PRIVATE calls need not to be synced back to underlying fs
          return 0;
        }
        var buffer = HEAPU8.slice(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags);
      },
  getStreamFromFD(fd) {
        var stream = FS.getStreamChecked(fd);
        return stream;
      },
  varargs:undefined,
  getStr(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
      },
  };
  function _fd_close(fd) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }

  /** @param {number=} offset */
  var doReadv = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break; // nothing more to read
        if (typeof offset != 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
  
  function _fd_read(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doReadv(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }

  
  var INT53_MAX = 9007199254740992;
  
  var INT53_MIN = -9007199254740992;
  var bigintToI53Checked = (num) => (num < INT53_MIN || num > INT53_MAX) ? NaN : Number(num);
  function _fd_seek(fd, offset, whence, newOffset) {
    offset = bigintToI53Checked(offset);
  
    
  try {
  
      if (isNaN(offset)) return 61;
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.llseek(stream, offset, whence);
      HEAP64[((newOffset)>>3)] = BigInt(stream.position);
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  ;
  }

  /** @param {number=} offset */
  var doWritev = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) {
          // No more space to write.
          break;
        }
        if (typeof offset != 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
  
  function _fd_write(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doWritev(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }

  var getCFunc = (ident) => {
      var func = Module['_' + ident]; // closure exported function
      return func;
    };
  
  var writeArrayToMemory = (array, buffer) => {
      HEAP8.set(array, buffer);
    };
  
  
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    };
  
  var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
  var stringToUTF8OnStack = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    };
  
  
  
  
  
    /**
     * @param {string|null=} returnType
     * @param {Array=} argTypes
     * @param {Arguments|Array=} args
     * @param {Object=} opts
     */
  var ccall = (ident, returnType, argTypes, args, opts) => {
      // For fast lookup of conversion functions
      var toC = {
        'string': (str) => {
          var ret = 0;
          if (str !== null && str !== undefined && str !== 0) { // null string
            ret = stringToUTF8OnStack(str);
          }
          return ret;
        },
        'array': (arr) => {
          var ret = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret);
          return ret;
        }
      };
  
      function convertReturnValue(ret) {
        if (returnType === 'string') {
          return UTF8ToString(ret);
        }
        if (returnType === 'boolean') return Boolean(ret);
        return ret;
      }
  
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func(...cArgs);
      function onDone(ret) {
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret);
      }
  
      ret = onDone(ret);
      return ret;
    };

  
  
    /**
     * @param {string=} returnType
     * @param {Array=} argTypes
     * @param {Object=} opts
     */
  var cwrap = (ident, returnType, argTypes, opts) => {
      // When the function takes numbers and returns a number, we can just return
      // the original function
      var numericArgs = !argTypes || argTypes.every((type) => type === 'number' || type === 'boolean');
      var numericRet = returnType !== 'string';
      if (numericRet && numericArgs && !opts) {
        return getCFunc(ident);
      }
      return (...args) => ccall(ident, returnType, argTypes, args, opts);
    };



  var uleb128Encode = (n, target) => {
      if (n < 128) {
        target.push(n);
      } else {
        target.push((n % 128) | 128, n >> 7);
      }
    };
  
  var sigToWasmTypes = (sig) => {
      var typeNames = {
        'i': 'i32',
        'j': 'i64',
        'f': 'f32',
        'd': 'f64',
        'e': 'externref',
        'p': 'i32',
      };
      var type = {
        parameters: [],
        results: sig[0] == 'v' ? [] : [typeNames[sig[0]]]
      };
      for (var i = 1; i < sig.length; ++i) {
        type.parameters.push(typeNames[sig[i]]);
      }
      return type;
    };
  
  var generateFuncType = (sig, target) => {
      var sigRet = sig.slice(0, 1);
      var sigParam = sig.slice(1);
      var typeCodes = {
        'i': 0x7f, // i32
        'p': 0x7f, // i32
        'j': 0x7e, // i64
        'f': 0x7d, // f32
        'd': 0x7c, // f64
        'e': 0x6f, // externref
      };
  
      // Parameters, length + signatures
      target.push(0x60 /* form: func */);
      uleb128Encode(sigParam.length, target);
      for (var i = 0; i < sigParam.length; ++i) {
        target.push(typeCodes[sigParam[i]]);
      }
  
      // Return values, length + signatures
      // With no multi-return in MVP, either 0 (void) or 1 (anything else)
      if (sigRet == 'v') {
        target.push(0x00);
      } else {
        target.push(0x01, typeCodes[sigRet]);
      }
    };
  var convertJsFunctionToWasm = (func, sig) => {
  
      // If the type reflection proposal is available, use the new
      // "WebAssembly.Function" constructor.
      // Otherwise, construct a minimal wasm module importing the JS function and
      // re-exporting it.
      if (typeof WebAssembly.Function == "function") {
        return new WebAssembly.Function(sigToWasmTypes(sig), func);
      }
  
      // The module is static, with the exception of the type section, which is
      // generated based on the signature passed in.
      var typeSectionBody = [
        0x01, // count: 1
      ];
      generateFuncType(sig, typeSectionBody);
  
      // Rest of the module is static
      var bytes = [
        0x00, 0x61, 0x73, 0x6d, // magic ("\0asm")
        0x01, 0x00, 0x00, 0x00, // version: 1
        0x01, // Type section code
      ];
      // Write the overall length of the type section followed by the body
      uleb128Encode(typeSectionBody.length, bytes);
      bytes.push(...typeSectionBody);
  
      // The rest of the module is static
      bytes.push(
        0x02, 0x07, // import section
          // (import "e" "f" (func 0 (type 0)))
          0x01, 0x01, 0x65, 0x01, 0x66, 0x00, 0x00,
        0x07, 0x05, // export section
          // (export "f" (func 0 (type 0)))
          0x01, 0x01, 0x66, 0x00, 0x00,
      );
  
      // We can compile this wasm module synchronously because it is very small.
      // This accepts an import (at "e.f"), that it reroutes to an export (at "f")
      var module = new WebAssembly.Module(new Uint8Array(bytes));
      var instance = new WebAssembly.Instance(module, { 'e': { 'f': func } });
      var wrappedFunc = instance.exports['f'];
      return wrappedFunc;
    };
  
  var wasmTableMirror = [];
  
  /** @type {WebAssembly.Table} */
  var wasmTable;
  var getWasmTableEntry = (funcPtr) => {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
        /** @suppress {checkTypes} */
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
      }
      return func;
    };
  
  var updateTableMap = (offset, count) => {
      if (functionsInTableMap) {
        for (var i = offset; i < offset + count; i++) {
          var item = getWasmTableEntry(i);
          // Ignore null values.
          if (item) {
            functionsInTableMap.set(item, i);
          }
        }
      }
    };
  
  var functionsInTableMap;
  
  var getFunctionAddress = (func) => {
      // First, create the map if this is the first use.
      if (!functionsInTableMap) {
        functionsInTableMap = new WeakMap();
        updateTableMap(0, wasmTable.length);
      }
      return functionsInTableMap.get(func) || 0;
    };
  
  
  var freeTableIndexes = [];
  
  var getEmptyTableSlot = () => {
      // Reuse a free index if there is one, otherwise grow.
      if (freeTableIndexes.length) {
        return freeTableIndexes.pop();
      }
      // Grow the table
      try {
        /** @suppress {checkTypes} */
        wasmTable.grow(1);
      } catch (err) {
        if (!(err instanceof RangeError)) {
          throw err;
        }
        throw 'Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.';
      }
      return wasmTable.length - 1;
    };
  
  
  
  var setWasmTableEntry = (idx, func) => {
      /** @suppress {checkTypes} */
      wasmTable.set(idx, func);
      // With ABORT_ON_WASM_EXCEPTIONS wasmTable.get is overridden to return wrapped
      // functions so we need to call it here to retrieve the potential wrapper correctly
      // instead of just storing 'func' directly into wasmTableMirror
      /** @suppress {checkTypes} */
      wasmTableMirror[idx] = wasmTable.get(idx);
    };
  
  /** @param {string=} sig */
  var addFunction = (func, sig) => {
      // Check if the function is already in the table, to ensure each function
      // gets a unique index.
      var rtn = getFunctionAddress(func);
      if (rtn) {
        return rtn;
      }
  
      // It's not in the table, add it now.
  
      var ret = getEmptyTableSlot();
  
      // Set the new value.
      try {
        // Attempting to call this with JS function will cause of table.set() to fail
        setWasmTableEntry(ret, func);
      } catch (err) {
        if (!(err instanceof TypeError)) {
          throw err;
        }
        var wrapped = convertJsFunctionToWasm(func, sig);
        setWasmTableEntry(ret, wrapped);
      }
  
      functionsInTableMap.set(func, ret);
  
      return ret;
    };

  
  
  
  
  var removeFunction = (index) => {
      functionsInTableMap.delete(getWasmTableEntry(index));
      setWasmTableEntry(index, null);
      freeTableIndexes.push(index);
    };


  FS.createPreloadedFile = FS_createPreloadedFile;
  FS.staticInit();
  // Set module methods based on EXPORTED_RUNTIME_METHODS
  ;

      // This error may happen quite a bit. To avoid overhead we reuse it (and
      // suffer a lack of stack info).
      MEMFS.doesNotExistError = new FS.ErrnoError(44);
      /** @suppress {checkTypes} */
      MEMFS.doesNotExistError.stack = '<generic error, no stack>';
      ;
var wasmImports = {
  /** @export */
  emscripten_resize_heap: _emscripten_resize_heap,
  /** @export */
  fd_close: _fd_close,
  /** @export */
  fd_read: _fd_read,
  /** @export */
  fd_seek: _fd_seek,
  /** @export */
  fd_write: _fd_write
};
var wasmExports;
createWasm();
var ___wasm_call_ctors = () => (___wasm_call_ctors = wasmExports['__wasm_call_ctors'])();
var _FLAC__stream_decoder_new = Module['_FLAC__stream_decoder_new'] = () => (_FLAC__stream_decoder_new = Module['_FLAC__stream_decoder_new'] = wasmExports['FLAC__stream_decoder_new'])();
var _FLAC__stream_decoder_delete = Module['_FLAC__stream_decoder_delete'] = (a0) => (_FLAC__stream_decoder_delete = Module['_FLAC__stream_decoder_delete'] = wasmExports['FLAC__stream_decoder_delete'])(a0);
var _FLAC__stream_decoder_finish = Module['_FLAC__stream_decoder_finish'] = (a0) => (_FLAC__stream_decoder_finish = Module['_FLAC__stream_decoder_finish'] = wasmExports['FLAC__stream_decoder_finish'])(a0);
var _FLAC__stream_decoder_init_stream = Module['_FLAC__stream_decoder_init_stream'] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (_FLAC__stream_decoder_init_stream = Module['_FLAC__stream_decoder_init_stream'] = wasmExports['FLAC__stream_decoder_init_stream'])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
var _FLAC__stream_decoder_reset = Module['_FLAC__stream_decoder_reset'] = (a0) => (_FLAC__stream_decoder_reset = Module['_FLAC__stream_decoder_reset'] = wasmExports['FLAC__stream_decoder_reset'])(a0);
var _FLAC__stream_decoder_init_ogg_stream = Module['_FLAC__stream_decoder_init_ogg_stream'] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (_FLAC__stream_decoder_init_ogg_stream = Module['_FLAC__stream_decoder_init_ogg_stream'] = wasmExports['FLAC__stream_decoder_init_ogg_stream'])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
var _FLAC__stream_decoder_set_ogg_serial_number = Module['_FLAC__stream_decoder_set_ogg_serial_number'] = (a0, a1) => (_FLAC__stream_decoder_set_ogg_serial_number = Module['_FLAC__stream_decoder_set_ogg_serial_number'] = wasmExports['FLAC__stream_decoder_set_ogg_serial_number'])(a0, a1);
var _FLAC__stream_decoder_set_md5_checking = Module['_FLAC__stream_decoder_set_md5_checking'] = (a0, a1) => (_FLAC__stream_decoder_set_md5_checking = Module['_FLAC__stream_decoder_set_md5_checking'] = wasmExports['FLAC__stream_decoder_set_md5_checking'])(a0, a1);
var _FLAC__stream_decoder_set_metadata_respond = Module['_FLAC__stream_decoder_set_metadata_respond'] = (a0, a1) => (_FLAC__stream_decoder_set_metadata_respond = Module['_FLAC__stream_decoder_set_metadata_respond'] = wasmExports['FLAC__stream_decoder_set_metadata_respond'])(a0, a1);
var _FLAC__stream_decoder_set_metadata_respond_application = Module['_FLAC__stream_decoder_set_metadata_respond_application'] = (a0, a1) => (_FLAC__stream_decoder_set_metadata_respond_application = Module['_FLAC__stream_decoder_set_metadata_respond_application'] = wasmExports['FLAC__stream_decoder_set_metadata_respond_application'])(a0, a1);
var _FLAC__stream_decoder_set_metadata_respond_all = Module['_FLAC__stream_decoder_set_metadata_respond_all'] = (a0) => (_FLAC__stream_decoder_set_metadata_respond_all = Module['_FLAC__stream_decoder_set_metadata_respond_all'] = wasmExports['FLAC__stream_decoder_set_metadata_respond_all'])(a0);
var _FLAC__stream_decoder_set_metadata_ignore = Module['_FLAC__stream_decoder_set_metadata_ignore'] = (a0, a1) => (_FLAC__stream_decoder_set_metadata_ignore = Module['_FLAC__stream_decoder_set_metadata_ignore'] = wasmExports['FLAC__stream_decoder_set_metadata_ignore'])(a0, a1);
var _FLAC__stream_decoder_set_metadata_ignore_application = Module['_FLAC__stream_decoder_set_metadata_ignore_application'] = (a0, a1) => (_FLAC__stream_decoder_set_metadata_ignore_application = Module['_FLAC__stream_decoder_set_metadata_ignore_application'] = wasmExports['FLAC__stream_decoder_set_metadata_ignore_application'])(a0, a1);
var _FLAC__stream_decoder_set_metadata_ignore_all = Module['_FLAC__stream_decoder_set_metadata_ignore_all'] = (a0) => (_FLAC__stream_decoder_set_metadata_ignore_all = Module['_FLAC__stream_decoder_set_metadata_ignore_all'] = wasmExports['FLAC__stream_decoder_set_metadata_ignore_all'])(a0);
var _FLAC__stream_decoder_get_state = Module['_FLAC__stream_decoder_get_state'] = (a0) => (_FLAC__stream_decoder_get_state = Module['_FLAC__stream_decoder_get_state'] = wasmExports['FLAC__stream_decoder_get_state'])(a0);
var _FLAC__stream_decoder_get_md5_checking = Module['_FLAC__stream_decoder_get_md5_checking'] = (a0) => (_FLAC__stream_decoder_get_md5_checking = Module['_FLAC__stream_decoder_get_md5_checking'] = wasmExports['FLAC__stream_decoder_get_md5_checking'])(a0);
var _FLAC__stream_decoder_process_single = Module['_FLAC__stream_decoder_process_single'] = (a0) => (_FLAC__stream_decoder_process_single = Module['_FLAC__stream_decoder_process_single'] = wasmExports['FLAC__stream_decoder_process_single'])(a0);
var _FLAC__stream_decoder_process_until_end_of_metadata = Module['_FLAC__stream_decoder_process_until_end_of_metadata'] = (a0) => (_FLAC__stream_decoder_process_until_end_of_metadata = Module['_FLAC__stream_decoder_process_until_end_of_metadata'] = wasmExports['FLAC__stream_decoder_process_until_end_of_metadata'])(a0);
var _FLAC__stream_decoder_process_until_end_of_stream = Module['_FLAC__stream_decoder_process_until_end_of_stream'] = (a0) => (_FLAC__stream_decoder_process_until_end_of_stream = Module['_FLAC__stream_decoder_process_until_end_of_stream'] = wasmExports['FLAC__stream_decoder_process_until_end_of_stream'])(a0);
var _FLAC__stream_encoder_new = Module['_FLAC__stream_encoder_new'] = () => (_FLAC__stream_encoder_new = Module['_FLAC__stream_encoder_new'] = wasmExports['FLAC__stream_encoder_new'])();
var _FLAC__stream_encoder_delete = Module['_FLAC__stream_encoder_delete'] = (a0) => (_FLAC__stream_encoder_delete = Module['_FLAC__stream_encoder_delete'] = wasmExports['FLAC__stream_encoder_delete'])(a0);
var _FLAC__stream_encoder_finish = Module['_FLAC__stream_encoder_finish'] = (a0) => (_FLAC__stream_encoder_finish = Module['_FLAC__stream_encoder_finish'] = wasmExports['FLAC__stream_encoder_finish'])(a0);
var _FLAC__stream_encoder_init_stream = Module['_FLAC__stream_encoder_init_stream'] = (a0, a1, a2, a3, a4, a5) => (_FLAC__stream_encoder_init_stream = Module['_FLAC__stream_encoder_init_stream'] = wasmExports['FLAC__stream_encoder_init_stream'])(a0, a1, a2, a3, a4, a5);
var _FLAC__stream_encoder_init_ogg_stream = Module['_FLAC__stream_encoder_init_ogg_stream'] = (a0, a1, a2, a3, a4, a5, a6) => (_FLAC__stream_encoder_init_ogg_stream = Module['_FLAC__stream_encoder_init_ogg_stream'] = wasmExports['FLAC__stream_encoder_init_ogg_stream'])(a0, a1, a2, a3, a4, a5, a6);
var _FLAC__stream_encoder_set_ogg_serial_number = Module['_FLAC__stream_encoder_set_ogg_serial_number'] = (a0, a1) => (_FLAC__stream_encoder_set_ogg_serial_number = Module['_FLAC__stream_encoder_set_ogg_serial_number'] = wasmExports['FLAC__stream_encoder_set_ogg_serial_number'])(a0, a1);
var _FLAC__stream_encoder_set_verify = Module['_FLAC__stream_encoder_set_verify'] = (a0, a1) => (_FLAC__stream_encoder_set_verify = Module['_FLAC__stream_encoder_set_verify'] = wasmExports['FLAC__stream_encoder_set_verify'])(a0, a1);
var _FLAC__stream_encoder_set_channels = Module['_FLAC__stream_encoder_set_channels'] = (a0, a1) => (_FLAC__stream_encoder_set_channels = Module['_FLAC__stream_encoder_set_channels'] = wasmExports['FLAC__stream_encoder_set_channels'])(a0, a1);
var _FLAC__stream_encoder_set_bits_per_sample = Module['_FLAC__stream_encoder_set_bits_per_sample'] = (a0, a1) => (_FLAC__stream_encoder_set_bits_per_sample = Module['_FLAC__stream_encoder_set_bits_per_sample'] = wasmExports['FLAC__stream_encoder_set_bits_per_sample'])(a0, a1);
var _FLAC__stream_encoder_set_sample_rate = Module['_FLAC__stream_encoder_set_sample_rate'] = (a0, a1) => (_FLAC__stream_encoder_set_sample_rate = Module['_FLAC__stream_encoder_set_sample_rate'] = wasmExports['FLAC__stream_encoder_set_sample_rate'])(a0, a1);
var _FLAC__stream_encoder_set_compression_level = Module['_FLAC__stream_encoder_set_compression_level'] = (a0, a1) => (_FLAC__stream_encoder_set_compression_level = Module['_FLAC__stream_encoder_set_compression_level'] = wasmExports['FLAC__stream_encoder_set_compression_level'])(a0, a1);
var _FLAC__stream_encoder_set_blocksize = Module['_FLAC__stream_encoder_set_blocksize'] = (a0, a1) => (_FLAC__stream_encoder_set_blocksize = Module['_FLAC__stream_encoder_set_blocksize'] = wasmExports['FLAC__stream_encoder_set_blocksize'])(a0, a1);
var _FLAC__stream_encoder_set_total_samples_estimate = Module['_FLAC__stream_encoder_set_total_samples_estimate'] = (a0, a1) => (_FLAC__stream_encoder_set_total_samples_estimate = Module['_FLAC__stream_encoder_set_total_samples_estimate'] = wasmExports['FLAC__stream_encoder_set_total_samples_estimate'])(a0, a1);
var _FLAC__stream_encoder_set_metadata = Module['_FLAC__stream_encoder_set_metadata'] = (a0, a1, a2) => (_FLAC__stream_encoder_set_metadata = Module['_FLAC__stream_encoder_set_metadata'] = wasmExports['FLAC__stream_encoder_set_metadata'])(a0, a1, a2);
var _FLAC__stream_encoder_get_state = Module['_FLAC__stream_encoder_get_state'] = (a0) => (_FLAC__stream_encoder_get_state = Module['_FLAC__stream_encoder_get_state'] = wasmExports['FLAC__stream_encoder_get_state'])(a0);
var _FLAC__stream_encoder_get_verify_decoder_state = Module['_FLAC__stream_encoder_get_verify_decoder_state'] = (a0) => (_FLAC__stream_encoder_get_verify_decoder_state = Module['_FLAC__stream_encoder_get_verify_decoder_state'] = wasmExports['FLAC__stream_encoder_get_verify_decoder_state'])(a0);
var _FLAC__stream_encoder_get_verify = Module['_FLAC__stream_encoder_get_verify'] = (a0) => (_FLAC__stream_encoder_get_verify = Module['_FLAC__stream_encoder_get_verify'] = wasmExports['FLAC__stream_encoder_get_verify'])(a0);
var _FLAC__stream_encoder_process = Module['_FLAC__stream_encoder_process'] = (a0, a1, a2) => (_FLAC__stream_encoder_process = Module['_FLAC__stream_encoder_process'] = wasmExports['FLAC__stream_encoder_process'])(a0, a1, a2);
var _FLAC__stream_encoder_process_interleaved = Module['_FLAC__stream_encoder_process_interleaved'] = (a0, a1, a2) => (_FLAC__stream_encoder_process_interleaved = Module['_FLAC__stream_encoder_process_interleaved'] = wasmExports['FLAC__stream_encoder_process_interleaved'])(a0, a1, a2);
var __emscripten_stack_restore = (a0) => (__emscripten_stack_restore = wasmExports['_emscripten_stack_restore'])(a0);
var __emscripten_stack_alloc = (a0) => (__emscripten_stack_alloc = wasmExports['_emscripten_stack_alloc'])(a0);
var _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports['emscripten_stack_get_current'])();


// include: postamble.js
// === Auto-generated postamble setup entry stuff ===

Module['wasmTable'] = wasmTable;
Module['ccall'] = ccall;
Module['cwrap'] = cwrap;
Module['addFunction'] = addFunction;
Module['removeFunction'] = removeFunction;
Module['setValue'] = setValue;
Module['getValue'] = getValue;


function run() {

  if (runDependencies > 0) {
    dependenciesFulfilled = run;
    return;
  }

  preRun();

  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    dependenciesFulfilled = run;
    return;
  }

  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return;

    initRuntime();

    Module['onRuntimeInitialized']?.();

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(() => {
      setTimeout(() => Module['setStatus'](''), 1);
      doRun();
    }, 1);
  } else
  {
    doRun();
  }
}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

run();

// end include: postamble.js

// include: /home/tema/libflac.js/libflac_post.js
//libflac function wrappers

/**
 * HELPER read/extract stream info meta-data from frame header / meta-data
 * @param {POINTER} p_streaminfo
 * @returns StreamInfo
 */
function _readStreamInfo(p_streaminfo){//-> FLAC__StreamMetadata.type (FLAC__MetadataType) === FLAC__METADATA_TYPE_STREAMINFO (0)

	/*
	typedef struct {
		unsigned min_blocksize, max_blocksize;
		unsigned min_framesize, max_framesize;
		unsigned sample_rate;
		unsigned channels;
		unsigned bits_per_sample;
		FLAC__uint64 total_samples;
		FLAC__byte md5sum[16];
	} FLAC__StreamMetadata_StreamInfo;
	 */

	var min_blocksize = Module.getValue(p_streaminfo,'i32');//4 bytes
	var max_blocksize = Module.getValue(p_streaminfo+4,'i32');//4 bytes

	var min_framesize = Module.getValue(p_streaminfo+8,'i32');//4 bytes
	var max_framesize = Module.getValue(p_streaminfo+12,'i32');//4 bytes

	var sample_rate = Module.getValue(p_streaminfo+16,'i32');//4 bytes
	var channels = Module.getValue(p_streaminfo+20,'i32');//4 bytes

	var bits_per_sample = Module.getValue(p_streaminfo+24,'i32');//4 bytes

	//FIXME should be at p_streaminfo+28, but seems to be at p_streaminfo+32
	var total_samples = Module.getValue(p_streaminfo+32,'i64');//8 bytes

	var md5sum = _readMd5(p_streaminfo+40);//16 bytes

	return {
		min_blocksize: min_blocksize,
		max_blocksize: max_blocksize,
		min_framesize: min_framesize,
		max_framesize: max_framesize,
		sampleRate: sample_rate,
		channels: channels,
		bitsPerSample: bits_per_sample,
		total_samples: total_samples,
		md5sum: md5sum
	};
}

/**
 * read MD5 checksum
 * @param {POINTER} p_md5
 * @returns {String} as HEX string representation
 */
function _readMd5(p_md5){

	var sb = [], v, str;
	for(var i=0, len = 16; i < len; ++i){
		v = Module.getValue(p_md5+i,'i8');//1 byte
		if(v < 0) v = 256 + v;//<- "convert" to uint8, if necessary
		str = v.toString(16);
		if(str.length < 2) str = '0' + str;//<- add padding, if necessary
		sb.push(str);
	}
	return sb.join('');
}

/**
 * HELPER: read frame data
 *
 * @param {POINTER} p_frame
 * @param {Flac.CodingOptions} [enc_opt]
 * @returns FrameHeader
 */
function _readFrameHdr(p_frame, enc_opt){

	/*
	typedef struct {
		unsigned blocksize;
		unsigned sample_rate;
		unsigned channels;
		FLAC__ChannelAssignment channel_assignment;
		unsigned bits_per_sample;
		FLAC__FrameNumberType number_type;
		union {
			FLAC__uint32 frame_number;
			FLAC__uint64 sample_number;
		} number;
		FLAC__uint8 crc;
	} FLAC__FrameHeader;
	 */

	var blocksize = Module.getValue(p_frame,'i32');//4 bytes
	var sample_rate = Module.getValue(p_frame+4,'i32');//4 bytes
	var channels = Module.getValue(p_frame+8,'i32');//4 bytes

	// 0: FLAC__CHANNEL_ASSIGNMENT_INDEPENDENT	independent channels
	// 1: FLAC__CHANNEL_ASSIGNMENT_LEFT_SIDE 	left+side stereo
	// 2: FLAC__CHANNEL_ASSIGNMENT_RIGHT_SIDE 	right+side stereo
	// 3: FLAC__CHANNEL_ASSIGNMENT_MID_SIDE 	mid+side stereo
	var channel_assignment = Module.getValue(p_frame+12,'i32');//4 bytes

	var bits_per_sample = Module.getValue(p_frame+16,'i32');

	// 0: FLAC__FRAME_NUMBER_TYPE_FRAME_NUMBER 	number contains the frame number
	// 1: FLAC__FRAME_NUMBER_TYPE_SAMPLE_NUMBER	number contains the sample number of first sample in frame
	var number_type = Module.getValue(p_frame+20,'i32');

	// union {} number: The frame number or sample number of first sample in frame; use the number_type value to determine which to use.
	var frame_number = Module.getValue(p_frame+24,'i32');
	var sample_number = Module.getValue(p_frame+24,'i64');

	var number = number_type === 0? frame_number : sample_number;
	var numberType = number_type === 0? 'frames' : 'samples';

	var crc = Module.getValue(p_frame+36,'i8');

	var subframes;
	if(enc_opt && enc_opt.analyseSubframes){
		var subOffset = {offset: 40};
		subframes = [];
		for(var i=0; i < channels; ++i){
			subframes.push(_readSubFrameHdr(p_frame, subOffset, blocksize, enc_opt));
		}
		//TODO read footer
		// console.log('  footer crc ', Module.getValue(p_frame + subOffset.offset,'i16'));
	}

	return {
		blocksize: blocksize,
		sampleRate: sample_rate,
		channels: channels,
		channelAssignment: channel_assignment,
		bitsPerSample: bits_per_sample,
		number: number,
		numberType: numberType,
		crc: crc,
		subframes: subframes
	};
}


function _readSubFrameHdr(p_subframe, subOffset, block_size, enc_opt){
	/*
	FLAC__SubframeType 	type
	union {
	   FLAC__Subframe_Constant   constant
	   FLAC__Subframe_Fixed   fixed
	   FLAC__Subframe_LPC   lpc
	   FLAC__Subframe_Verbatim   verbatim
	} 	data
	unsigned 	wasted_bits
	*/

	var type = Module.getValue(p_subframe + subOffset.offset, 'i32');
	subOffset.offset += 4;

	var data;
	switch(type){
		case 0:	//FLAC__SUBFRAME_TYPE_CONSTANT
			data = {value: Module.getValue(p_subframe + subOffset.offset, 'i32')};
			subOffset.offset += 284;//4;
			break;
		case 1:	//FLAC__SUBFRAME_TYPE_VERBATIM
			data = Module.getValue(p_subframe + subOffset.offset, 'i32');
			subOffset.offset += 284;//4;
			break;
		case 2:	//FLAC__SUBFRAME_TYPE_FIXED
			data = _readSubFrameHdrFixedData(p_subframe, subOffset, block_size, false, enc_opt);
			break;
		case 3:	//FLAC__SUBFRAME_TYPE_LPC
			data = _readSubFrameHdrFixedData(p_subframe, subOffset, block_size, true, enc_opt);
			break;
	}

	var offset =  subOffset.offset;
	var wasted_bits = Module.getValue(p_subframe + offset, 'i32');
	subOffset.offset += 4;

	return {
		type: type,//['CONSTANT', 'VERBATIM', 'FIXED', 'LPC'][type],
		data: data,
		wastedBits: wasted_bits
	}
}

function _readSubFrameHdrFixedData(p_subframe_data, subOffset, block_size, is_lpc, enc_opt){

	var offset = subOffset.offset;

	var data = {order: -1, contents: {parameters: [], rawBits: []}};
	//FLAC__Subframe_Fixed:
	// FLAC__EntropyCodingMethod 	entropy_coding_method
	// unsigned 	order
	// FLAC__int32 	warmup [FLAC__MAX_FIXED_ORDER]
	// const FLAC__int32 * 	residual

	//FLAC__EntropyCodingMethod:
	// FLAC__EntropyCodingMethodType 	type
	// union {
	//    FLAC__EntropyCodingMethod_PartitionedRice   partitioned_rice
	// } 	data

	//FLAC__ENTROPY_CODING_METHOD_PARTITIONED_RICE	0		Residual is coded by partitioning into contexts, each with it's own 4-bit Rice parameter.
	//FLAC__ENTROPY_CODING_METHOD_PARTITIONED_RICE2 1	Residual is coded by partitioning into contexts, each with it's own 5-bit Rice parameter.
	var entropyType = Module.getValue(p_subframe_data, 'i32');
	offset += 4;

	//FLAC__EntropyCodingMethod_PartitionedRice:
	//	unsigned 	order
	var entropyOrder = Module.getValue(p_subframe_data + offset, 'i32');
	data.order = entropyOrder;
	offset += 4;

	//FLAC__EntropyCodingMethod_PartitionedRice:
	//	FLAC__EntropyCodingMethod_PartitionedRiceContents * 	contents
	var partitions = 1 << entropyOrder, params = data.contents.parameters, raws = data.contents.rawBits;
	//FLAC__EntropyCodingMethod_PartitionedRiceContents
	// unsigned * 	parameters
	// unsigned * 	raw_bits
	// unsigned 	capacity_by_order
	var ppart = Module.getValue(p_subframe_data + offset, 'i32');
	var pparams = Module.getValue(ppart, 'i32');
	var praw = Module.getValue(ppart + 4, 'i32');
	data.contents.capacityByOrder = Module.getValue(ppart + 8, 'i32');
	for(var i=0; i < partitions; ++i){
		params.push(Module.getValue(pparams + (i*4), 'i32'));
		raws.push(Module.getValue(praw + (i*4), 'i32'));
	}
	offset += 4;

	//FLAC__Subframe_Fixed:
	//	unsigned 	order
	var order = Module.getValue(p_subframe_data + offset, 'i32');
	offset += 4;

	var warmup = [], res;

	if(is_lpc){
		//FLAC__Subframe_LPC

		// unsigned 	qlp_coeff_precision
		var qlp_coeff_precision = Module.getValue(p_subframe_data + offset, 'i32');
		offset += 4;
		// int 	quantization_level
		var quantization_level = Module.getValue(p_subframe_data + offset, 'i32');
		offset += 4;

		//FLAC__Subframe_LPC :
		// FLAC__int32 	qlp_coeff [FLAC__MAX_LPC_ORDER]
		var qlp_coeff = [];
		for(var i=0; i < order; ++i){
			qlp_coeff.push(Module.getValue(p_subframe_data + offset, 'i32'));
			offset += 4;
		}
		data.qlp_coeff = qlp_coeff;
		data.qlp_coeff_precision = qlp_coeff_precision;
		data.quantization_level = quantization_level;

		//FLAC__Subframe_LPC:
		// FLAC__int32 	warmup [FLAC__MAX_LPC_ORDER]
		offset = subOffset.offset + 152;
		offset = _readSubFrameHdrWarmup(p_subframe_data, offset, warmup, order);

		//FLAC__Subframe_LPC:
		// const FLAC__int32 * 	residual
		if(enc_opt && enc_opt.analyseResiduals){
			offset = subOffset.offset + 280;
			res = _readSubFrameHdrResidual(p_subframe_data + offset, block_size, order);
		}

	} else {

		//FLAC__Subframe_Fixed:
		// FLAC__int32 	warmup [FLAC__MAX_FIXED_ORDER]
		offset = _readSubFrameHdrWarmup(p_subframe_data, offset, warmup, order);

		//FLAC__Subframe_Fixed:
		// const FLAC__int32 * 	residual
		offset = subOffset.offset + 32;
		if(enc_opt && enc_opt.analyseResiduals){
			res = _readSubFrameHdrResidual(p_subframe_data + offset, block_size, order);
		}
	}

	subOffset.offset += 284;
	return {
		partition: {
			type: entropyType,
			data: data
		},
		order: order,
		warmup: warmup,
		residual: res
	}
}


function _readSubFrameHdrWarmup(p_subframe_data, offset, warmup, order){

	// FLAC__int32 	warmup [FLAC__MAX_FIXED_ORDER | FLAC__MAX_LPC_ORDER]
	for(var i=0; i < order; ++i){
		warmup.push(Module.getValue(p_subframe_data + offset, 'i32'));
		offset += 4;
	}
	return offset;
}


function _readSubFrameHdrResidual(p_subframe_data_res, block_size, order){
	// const FLAC__int32 * 	residual
	var pres = Module.getValue(p_subframe_data_res, 'i32');
	var res = [];//Module.getValue(pres, 'i32');
	//TODO read residual all values(?)
	// -> "The residual signal, length == (blocksize minus order) samples.
	for(var i=0, size = block_size - order; i < size; ++i){
		res.push(Module.getValue(pres + (i*4), 'i32'));
	}
	return res;
}

function _readConstChar(ptr, length, sb){
	sb.splice(0);
	var ch;
	for(var i=0; i < length; ++i){
		ch = Module.getValue(ptr + i,'i8');
		if(ch === 0){
			break;
		}
		sb.push(String.fromCodePoint(ch));
	}
	return sb.join('');
}

function _readNullTerminatedChar(ptr, sb){
	sb.splice(0);
	var ch = 1, i = 0;
	while(ch > 0){
		ch = Module.getValue(ptr + i++, 'i8');
		if(ch === 0){
			break;
		}
		sb.push(String.fromCodePoint(ch));
	}
	return sb.join('');
}


/**
 * HELPER read/extract padding metadata meta-data from meta-data block
 * @param {POINTER} p_padding_metadata
 * @returns PaddingMetadata
 */
function _readPaddingMetadata(p_padding_metadata){//-> FLAC__StreamMetadata.type (FLAC__MetadataType) === FLAC__METADATA_TYPE_PADDING (1)

	//FLAC__StreamMetadata_Padding:
	//		int 	dummy
	return {
		dummy: Module.getValue(p_padding_metadata,'i32')
	}
}

/**
 * HELPER read/extract application metadata meta-data from meta-data block
 * @param {POINTER} p_application_metadata
 * @returns ApplicationMetadata
 */
function _readApplicationMetadata(p_application_metadata){//-> FLAC__StreamMetadata.type (FLAC__MetadataType) === FLAC__METADATA_TYPE_APPLICATION (2)

	//FLAC__StreamMetadata_Application:
	// FLAC__byte 	id [4]
	// FLAC__byte * 	data
	return {
		id : Module.getValue(p_application_metadata,'i32'),
		data: Module.getValue(p_application_metadata + 4,'i32')//TODO should read (binary) data?
	}
}


/**
 * HELPER read/extract seek table metadata meta-data from meta-data block
 * @param {POINTER} p_seek_table_metadata
 * @returns SeekTableMetadata
 */
function _readSeekTableMetadata(p_seek_table_metadata){//-> FLAC__StreamMetadata.type (FLAC__MetadataType) === FLAC__METADATA_TYPE_SEEKTABLE (3)

	//FLAC__StreamMetadata_SeekTable:
	// 	unsigned 	num_points
	// 	FLAC__StreamMetadata_SeekPoint * 	points

	var num_points = Module.getValue(p_seek_table_metadata,'i32');

	var ptrPoints = Module.getValue(p_seek_table_metadata + 4,'i32');
	var points = [];
	for(var i=0; i < num_points; ++i){

		//FLAC__StreamMetadata_SeekPoint:
		// 	FLAC__uint64 	sample_number
		// 	FLAC__uint64 	stream_offset
		// 	unsigned 	frame_samples

		points.push({
			sample_number: Module.getValue(ptrPoints + (i * 24),'i64'),
			stream_offset: Module.getValue(ptrPoints + (i * 24) + 8,'i64'),
			frame_samples: Module.getValue(ptrPoints + (i * 24) + 16,'i32')
		});
	}

	return {
		num_points: num_points,
		points: points
	}
}

/**
 * HELPER read/extract vorbis comment meta-data from meta-data block
 * @param {POINTER} p_vorbiscomment
 * @returns VorbisComment
 */
function _readVorbisComment(p_vorbiscomment){//-> FLAC__StreamMetadata.type (FLAC__MetadataType) === FLAC__METADATA_TYPE_VORBIS_COMMENT (4)

	// FLAC__StreamMetadata_VorbisComment
	// FLAC__StreamMetadata_VorbisComment_Entry vendor_string:
	// 		FLAC__uint32 	length
	// 		FLAC__byte * 	entry
	var length = Module.getValue(p_vorbiscomment,'i32');
	var entry = Module.getValue(p_vorbiscomment + 4,'i32');

	var sb = [];
	var strEntry = _readConstChar(entry, length, sb);

	// FLAC__uint32 	num_comments
	var num_comments = Module.getValue(p_vorbiscomment + 8,'i32');

	// FLAC__StreamMetadata_VorbisComment_Entry * 	comments
	var comments = [], clen, centry;
	var pc = Module.getValue(p_vorbiscomment + 12, 'i32')
	for(var i=0; i < num_comments; ++i){

		// FLAC__StreamMetadata_VorbisComment_Entry
		// 		FLAC__uint32 	length
		// 		FLAC__byte * 	entry

		clen = Module.getValue(pc + (i*8), 'i32');
		if(clen === 0){
			continue;
		}

		centry = Module.getValue(pc + (i*8) + 4, 'i32');
		comments.push(_readConstChar(centry, clen, sb));
	}

	return {
		vendor_string: strEntry,
		num_comments: num_comments,
		comments: comments
	}
}

/**
 * HELPER read/extract cue sheet meta-data from meta-data block
 * @param {POINTER} p_cue_sheet
 * @returns CueSheetMetadata
 */
function _readCueSheetMetadata(p_cue_sheet){//-> FLAC__StreamMetadata.type (FLAC__MetadataType) === FLAC__METADATA_TYPE_CUESHEET (5)

	// char 	media_catalog_number [129]
	// FLAC__uint64 	lead_in
	// FLAC__bool 	is_cd
	// unsigned 	num_tracks
	// FLAC__StreamMetadata_CueSheet_Track * 	tracks

	var sb = [];
	var media_catalog_number = _readConstChar(p_cue_sheet, 129, sb);

	var lead_in = Module.getValue(p_cue_sheet + 136,'i64');

	var is_cd = Module.getValue(p_cue_sheet + 144,'i8');
	var num_tracks = Module.getValue(p_cue_sheet + 148,'i32');

	var ptrTrack = Module.getValue(p_cue_sheet + 152,'i32');
	var tracks = [], trackOffset = ptrTrack;
	if(ptrTrack !== 0){

		for(var i=0; i < num_tracks; ++i){

			var tr = _readCueSheetMetadata_track(trackOffset, sb);
			tracks.push(tr);
			trackOffset += 32;
		}
	}

	return {
		media_catalog_number: media_catalog_number,
		lead_in: lead_in,
		is_cd: is_cd,
		num_tracks: num_tracks,
		tracks: tracks
	}
}

/**
 * helper read track data for cue-sheet metadata
 * @param       {POINTER} p_cue_sheet_track pointer to the track data
 * @param       {string[]} sb "string buffer" temporary buffer for reading string (may be reset)
 * @return      {CueSheetTrack}
 */
function _readCueSheetMetadata_track(p_cue_sheet_track, sb){

	// FLAC__StreamMetadata_CueSheet_Track:
	// 		FLAC__uint64 	offset
	// 		FLAC__byte 	number
	// 		char 	isrc [13]
	//		 unsigned 	type:1
	// 		unsigned 	pre_emphasis:1
	// 		FLAC__byte 	num_indices
	// 		FLAC__StreamMetadata_CueSheet_Index * 	indices

	var typePremph = Module.getValue(p_cue_sheet_track + 22,'i8');
	var num_indices = Module.getValue(p_cue_sheet_track + 23,'i8');

	var indices = [];
	var track = {
		offset: Module.getValue(p_cue_sheet_track,'i64'),
		number: Module.getValue(p_cue_sheet_track + 8,'i8') &255,
		isrc: _readConstChar(p_cue_sheet_track + 9, 13, sb),
		type: typePremph & 1? 'NON_AUDIO' : 'AUDIO',
		pre_emphasis: !!(typePremph & 2),
		num_indices: num_indices,
		indices: indices
	}

	var idx;
	if(num_indices > 0){
		idx = Module.getValue(p_cue_sheet_track + 24,'i32');

		//FLAC__StreamMetadata_CueSheet_Index:
		// 	FLAC__uint64 	offset
		// 	FLAC__byte 	number

		for(var i=0; i < num_indices; ++i){
			indices.push({
				offset: Module.getValue(idx + (i*16),'i64'),
				number: Module.getValue(idx + (i*16) + 8,'i8')
			});
		}
	}

	return track;
}

/**
 * HELPER read/extract picture meta-data from meta-data block
 * @param {POINTER} p_picture_metadata
 * @returns PictureMetadata
 */
function _readPictureMetadata(p_picture_metadata){//-> FLAC__StreamMetadata.type (FLAC__MetadataType) === FLAC__METADATA_TYPE_PICTURE (6)

	// FLAC__StreamMetadata_Picture_Type 	type
	// char * 	mime_type
	// FLAC__byte * 	description
	// FLAC__uint32 	width
	// FLAC__uint32 	height
	// FLAC__uint32 	depth
	// FLAC__uint32 	colors
	// FLAC__uint32 	data_length
	// FLAC__byte * 	data

	var type = Module.getValue(p_picture_metadata,'i32');

	var mime = Module.getValue(p_picture_metadata + 4,'i32');

	var sb = [];
	var mime_type = _readNullTerminatedChar(mime, sb);

	var desc = Module.getValue(p_picture_metadata + 8,'i32');
	var description = _readNullTerminatedChar(desc, sb);

	var width  = Module.getValue(p_picture_metadata + 12,'i32');
	var height = Module.getValue(p_picture_metadata + 16,'i32');
	var depth  = Module.getValue(p_picture_metadata + 20,'i32');
	var colors = Module.getValue(p_picture_metadata + 24,'i32');
	var data_length = Module.getValue(p_picture_metadata + 28,'i32');

	var data = Module.getValue(p_picture_metadata + 32,'i32');

	var buffer = Uint8Array.from(Module.HEAPU8.subarray(data, data + data_length));

	return {
		type: type,
		mime_type: mime_type,
		description: description,
		width: width,
		height: height,
		depth: depth,
		colors: colors,
		data_length: data_length,
		data: buffer
	}
}

/**
 * HELPER workaround / fix for returned write-buffer when decoding FLAC
 *
 * @param {number} heapOffset
 * 				the offset for the data on HEAPU8
 * @param {Uint8Array} newBuffer
 * 				the target buffer into which the data should be written -- with the correct (block) size
 * @param {boolean} applyFix
 * 				whether or not to apply the data repair heuristics
 * 				(handling duplicated/triplicated values in raw data)
 */
function __fix_write_buffer(heapOffset, newBuffer, applyFix){

	var dv = new DataView(newBuffer.buffer);
	var targetSize = newBuffer.length;

	var increase = !applyFix? 1 : 2;//<- for FIX/workaround, NOTE: e.g. if 24-bit padding occurres, there is no fix/increase needed (more details comment below)
	var buffer = HEAPU8.subarray(heapOffset, heapOffset + targetSize * increase);

	// FIXME for some reason, the bytes values 0 (min) and 255 (max) get "triplicated",
	//		or inserted "doubled" which should be ignored, i.e.
	//		x x x	-> x
	//		x x		-> <ignored>
	//		where x is 0 or 255
	// -> HACK for now: remove/"over-read" 2 of the values, for each of these triplets/doublications
	var jump, isPrint;
	for(var i=0, j=0, size = buffer.length; i < size && j < targetSize; ++i, ++j){

		if(i === size-1 && j < targetSize - 1){
			//increase heap-view, in order to read more (valid) data into the target buffer
			buffer = HEAPU8.subarray(heapOffset, size + targetSize);
			size = buffer.length;
		}

		// NOTE if e.g. 24-bit padding occurres, there does not seem to be no duplication/triplication of 255 or 0, so must not try to fix!
		if(applyFix && (buffer[i] === 0 || buffer[i] === 255)){

			jump = 0;
			isPrint = true;

			if(i + 1 < size && buffer[i] === buffer[i+1]){

				++jump;

				if(i + 2 < size){
					if(buffer[i] === buffer[i+2]){
						++jump;
					} else {
						//if only 2 occurrences: ignore value
						isPrint = false;
					}
				}
			}//else: if single value: do print (an do not jump)


			if(isPrint){
				dv.setUint8(j, buffer[i]);
				if(jump === 2 && i + 3 < size && buffer[i] === buffer[i+3]){
					//special case for reducing triples in case the following value is also the same
					// (ie. something like: x x x |+ x)
					// -> then: do write the value one more time, and jump one further ahead
					// i.e. if value occurs 4 times in a row, write 2 values
					++jump;
					dv.setUint8(++j, buffer[i]);
				}
			} else {
				--j;
			}

			i += jump;//<- apply jump, if there were value duplications

		} else {
			dv.setUint8(j, buffer[i]);
		}

	}
}


// FLAC__STREAM_DECODER_READ_STATUS_CONTINUE     	The read was OK and decoding can continue.
// FLAC__STREAM_DECODER_READ_STATUS_END_OF_STREAM   The read was attempted while at the end of the stream. Note that the client must only return this value when the read callback was called when already at the end of the stream. Otherwise, if the read itself moves to the end of the stream, the client should still return the data and FLAC__STREAM_DECODER_READ_STATUS_CONTINUE, and then on the next read callback it should return FLAC__STREAM_DECODER_READ_STATUS_END_OF_STREAM with a byte count of 0.
// FLAC__STREAM_DECODER_READ_STATUS_ABORT       	An unrecoverable error occurred. The decoder will return from the process call.
var FLAC__STREAM_DECODER_READ_STATUS_CONTINUE = 0;
var FLAC__STREAM_DECODER_READ_STATUS_END_OF_STREAM = 1;
var FLAC__STREAM_DECODER_READ_STATUS_ABORT = 2;

// FLAC__STREAM_DECODER_WRITE_STATUS_CONTINUE   The write was OK and decoding can continue.
// FLAC__STREAM_DECODER_WRITE_STATUS_ABORT     	An unrecoverable error occurred. The decoder will return from the process call.
var FLAC__STREAM_DECODER_WRITE_STATUS_CONTINUE = 0;
var FLAC__STREAM_DECODER_WRITE_STATUS_ABORT = 1;

/**
 * @interface FLAC__StreamDecoderInitStatus
 * @memberOf Flac
 *
 * @property {"FLAC__STREAM_DECODER_INIT_STATUS_OK"}						0 	Initialization was successful.
 * @property {"FLAC__STREAM_DECODER_INIT_STATUS_UNSUPPORTED_CONTAINER"}		1 	The library was not compiled with support for the given container format.
 * @property {"FLAC__STREAM_DECODER_INIT_STATUS_INVALID_CALLBACKS"}			2 	A required callback was not supplied.
 * @property {"FLAC__STREAM_DECODER_INIT_STATUS_MEMORY_ALLOCATION_ERROR"}	3 	An error occurred allocating memory.
 * @property {"FLAC__STREAM_DECODER_INIT_STATUS_ERROR_OPENING_FILE"}		4 	fopen() failed in FLAC__stream_decoder_init_file() or FLAC__stream_decoder_init_ogg_file().
 * @property {"FLAC__STREAM_DECODER_INIT_STATUS_ALREADY_INITIALIZED"}		5 	FLAC__stream_decoder_init_*() was called when the decoder was already initialized, usually because FLAC__stream_decoder_finish() was not called.
 */
var FLAC__STREAM_DECODER_INIT_STATUS_OK	= 0;
var FLAC__STREAM_DECODER_INIT_STATUS_UNSUPPORTED_CONTAINER	= 1;
var FLAC__STREAM_DECODER_INIT_STATUS_INVALID_CALLBACKS	= 2;
var FLAC__STREAM_DECODER_INIT_STATUS_MEMORY_ALLOCATION_ERROR = 3;
var FLAC__STREAM_DECODER_INIT_STATUS_ERROR_OPENING_FILE = 4;
var FLAC__STREAM_DECODER_INIT_STATUS_ALREADY_INITIALIZED = 5;

/**
 * @interface FLAC__StreamEncoderInitStatus
 * @memberOf Flac
 *
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_OK"}									0 	Initialization was successful.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_ENCODER_ERROR"}							1 	General failure to set up encoder; call FLAC__stream_encoder_get_state() for cause.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_UNSUPPORTED_CONTAINER"}					2 	The library was not compiled with support for the given container format.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_CALLBACKS"}						3 	A required callback was not supplied.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_NUMBER_OF_CHANNELS"}			4 	The encoder has an invalid setting for number of channels.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_BITS_PER_SAMPLE"}				5 	The encoder has an invalid setting for bits-per-sample. FLAC supports 4-32 bps but the reference encoder currently supports only up to 24 bps.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_SAMPLE_RATE"}					6 	The encoder has an invalid setting for the input sample rate.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_BLOCK_SIZE"}					7 	The encoder has an invalid setting for the block size.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_MAX_LPC_ORDER"}					8 	The encoder has an invalid setting for the maximum LPC order.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_QLP_COEFF_PRECISION"}			9 	The encoder has an invalid setting for the precision of the quantized linear predictor coefficients.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_BLOCK_SIZE_TOO_SMALL_FOR_LPC_ORDER"}	10 	The specified block size is less than the maximum LPC order.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_NOT_STREAMABLE"}						11 	The encoder is bound to the Subset but other settings violate it.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_METADATA"}						12 	The metadata input to the encoder is invalid, in one of the following ways:
 *																						      FLAC__stream_encoder_set_metadata() was called with a null pointer but a block count > 0
 *																						      One of the metadata blocks contains an undefined type
 *																						      It contains an illegal CUESHEET as checked by FLAC__format_cuesheet_is_legal()
 *																						      It contains an illegal SEEKTABLE as checked by FLAC__format_seektable_is_legal()
 *																						      It contains more than one SEEKTABLE block or more than one VORBIS_COMMENT block
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_ALREADY_INITIALIZED"}					13 	FLAC__stream_encoder_init_*() was called when the encoder was already initialized, usually because FLAC__stream_encoder_finish() was not called.
 */
var FLAC__STREAM_ENCODER_INIT_STATUS_OK = 0;
var FLAC__STREAM_ENCODER_INIT_STATUS_ENCODER_ERROR = 1;
var FLAC__STREAM_ENCODER_INIT_STATUS_UNSUPPORTED_CONTAINER = 2;
var FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_CALLBACKS = 3;
var FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_NUMBER_OF_CHANNELS = 4;
var FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_BITS_PER_SAMPLE = 5;
var FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_SAMPLE_RATE = 6;
var FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_BLOCK_SIZE = 7;
var FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_MAX_LPC_ORDER = 8;
var FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_QLP_COEFF_PRECISION = 9;
var FLAC__STREAM_ENCODER_INIT_STATUS_BLOCK_SIZE_TOO_SMALL_FOR_LPC_ORDER = 10;
var FLAC__STREAM_ENCODER_INIT_STATUS_NOT_STREAMABLE = 11;
var FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_METADATA = 12;
var FLAC__STREAM_ENCODER_INIT_STATUS_ALREADY_INITIALIZED = 13;

//FLAC__STREAM_ENCODER_WRITE_STATUS_OK 				The write was OK and encoding can continue.
//FLAC__STREAM_ENCODER_WRITE_STATUS_FATAL_ERROR		An unrecoverable error occurred. The encoder will return from the process call
var FLAC__STREAM_ENCODER_WRITE_STATUS_OK = 0;
var FLAC__STREAM_ENCODER_WRITE_STATUS_FATAL_ERROR = 1;


/**
 * Map for encoder/decoder callback functions
 *
 * <pre>[ID] -> {function_type: FUNCTION}</pre>
 *
 * type: {[id: number]: {[callback_type: string]: function}}
 * @private
 */
var coders = {};

/**
 * Get a registered callback for the encoder / decoder instance
 *
 * @param {Number} p_coder
 * 			the encoder/decoder pointer (ID)
 * @param {String} func_type
 * 			the callback type, one of
 * 				"write" | "read" | "error" | "metadata"
 * @returns {Function} the callback (or VOID if there is no callback registered)
 * @private
 */
function getCallback(p_coder, func_type){
	if(coders[p_coder]){
		return coders[p_coder][func_type];
	}
}

/**
 * Register a callback for an encoder / decoder instance (will / should be deleted, when finish()/delete())
 *
 * @param {Number} p_coder
 * 			the encoder/decoder pointer (ID)
 * @param {String} func_type
 * 			the callback type, one of
 * 				"write" | "read" | "error" | "metadata"
 * @param {Function} callback
 * 			the callback function
 * @private
 */
function setCallback(p_coder, func_type, callback){
	if(!coders[p_coder]){
		coders[p_coder] = {};
	}
	coders[p_coder][func_type] = callback;
}

/**
 * Get coding options for the encoder / decoder instance:
 * returns FALSY when not set.
 *
 * @param {Number} p_coder
 * 			the encoder/decoder pointer (ID)
 * @returns {CodingOptions} the coding options
 * @private
 * @memberOf Flac
 */
function _getOptions(p_coder){
	if(coders[p_coder]){
		return coders[p_coder]["options"];
	}
}

/**
 * Set coding options for an encoder / decoder instance (will / should be deleted, when finish()/delete())
 *
 * @param {Number} p_coder
 * 			the encoder/decoder pointer (ID)
 * @param {Flac.CodingOptions} options
 * 			the coding options
 * @private
 * @memberOf Flac
 */
function _setOptions(p_coder, options){
	if(!coders[p_coder]){
		coders[p_coder] = {};
	}
	coders[p_coder]["options"] = options;
}

//(const FLAC__StreamEncoder *encoder, const FLAC__byte buffer[], size_t bytes, unsigned samples, unsigned current_frame, void *client_data)
// -> FLAC__StreamEncoderWriteStatus
var enc_write_fn_ptr = addFunction(function(p_encoder, buffer, bytes, samples, current_frame, p_client_data){
	var retdata = new Uint8Array(bytes);
	retdata.set(HEAPU8.subarray(buffer, buffer + bytes));
	var write_callback_fn = getCallback(p_encoder, 'write');
	try{
		write_callback_fn(retdata, bytes, samples, current_frame, p_client_data);
	} catch(err) {
		console.error(err);
		return FLAC__STREAM_ENCODER_WRITE_STATUS_FATAL_ERROR;
	}
	return FLAC__STREAM_ENCODER_WRITE_STATUS_OK;
}, 'iiiiiii');

//(const FLAC__StreamDecoder *decoder, FLAC__byte buffer[], size_t *bytes, void *client_data)
// -> FLAC__StreamDecoderReadStatus
var dec_read_fn_ptr = addFunction(function(p_decoder, buffer, bytes, p_client_data){
	//FLAC__StreamDecoderReadCallback, see https://xiph.org/flac/api/group__flac__stream__decoder.html#ga7a5f593b9bc2d163884348b48c4285fd

	var len = Module.getValue(bytes, 'i32');

	if(len === 0){
		return FLAC__STREAM_DECODER_READ_STATUS_ABORT;
	}

	var read_callback_fn = getCallback(p_decoder, 'read');

	//callback must return object with: {buffer: TypedArray, readDataLength: number, error: boolean}
	var readResult = read_callback_fn(len, p_client_data);
	//in case of END_OF_STREAM or an error, readResult.readDataLength must be returned with 0

	var readLen = readResult.readDataLength;
	Module.setValue(bytes, readLen, 'i32');

	if(readResult.error){
		return FLAC__STREAM_DECODER_READ_STATUS_ABORT;
	}

	if(readLen === 0){
		return FLAC__STREAM_DECODER_READ_STATUS_END_OF_STREAM;
	}

	var readBuf = readResult.buffer;

	var dataHeap = new Uint8Array(Module.HEAPU8.buffer, buffer, readLen);
	dataHeap.set(new Uint8Array(readBuf));

	return FLAC__STREAM_DECODER_READ_STATUS_CONTINUE;
}, 'iiiii');

//(const FLAC__StreamDecoder *decoder, const FLAC__Frame *frame, const FLAC__int32 *const buffer[], void *client_data)
// -> FLAC__StreamDecoderWriteStatus
var dec_write_fn_ptr = addFunction(function(p_decoder, p_frame, p_buffer, p_client_data){

	// var dec = Module.getValue(p_decoder,'i32');
	// var clientData = Module.getValue(p_client_data,'i32');

	var dec_opts = _getOptions(p_decoder);
	var frameInfo = _readFrameHdr(p_frame, dec_opts);

//	console.log(frameInfo);//DEBUG

	var channels = frameInfo.channels;
	var block_size = frameInfo.blocksize * (frameInfo.bitsPerSample / 8);

	//whether or not to apply data fixing heuristics (e.g. not needed for 24-bit samples)
	var isFix = frameInfo.bitsPerSample !== 24;

	//take padding bits into account for calculating buffer size
	// -> seems to be done for uneven byte sizes, i.e. 1 (8 bits) and 3 (24 bits)
	var padding = (frameInfo.bitsPerSample / 8)%2;
	if(padding > 0){
		block_size += frameInfo.blocksize * padding;
	}

	var data = [];//<- array for the data of each channel
	var bufferOffset, _buffer;

	for(var i=0; i < channels; ++i){

		bufferOffset = Module.getValue(p_buffer + (i*4),'i32');

		_buffer = new Uint8Array(block_size);
		//FIXME HACK for "strange" data (see helper function __fix_write_buffer)
		__fix_write_buffer(bufferOffset, _buffer, isFix);

		data.push(_buffer.subarray(0, block_size));
	}

	var write_callback_fn = getCallback(p_decoder, 'write');
	var res = write_callback_fn(data, frameInfo);//, clientData);

	// FLAC__STREAM_DECODER_WRITE_STATUS_CONTINUE	The write was OK and decoding can continue.
	// FLAC__STREAM_DECODER_WRITE_STATUS_ABORT     	An unrecoverable error occurred. The decoder will return from the process call.

	return res !== false? FLAC__STREAM_DECODER_WRITE_STATUS_CONTINUE : FLAC__STREAM_DECODER_WRITE_STATUS_ABORT;
}, 'iiiii');

/**
 * Decoding error codes.
 *
 * <br>
 * If the error code is not known, value <code>FLAC__STREAM_DECODER_ERROR__UNKNOWN__</code> is used.
 *
 * @property {"FLAC__STREAM_DECODER_ERROR_STATUS_LOST_SYNC"}			0   An error in the stream caused the decoder to lose synchronization.
 * @property {"FLAC__STREAM_DECODER_ERROR_STATUS_BAD_HEADER"}  			1   The decoder encountered a corrupted frame header.
 * @property {"FLAC__STREAM_DECODER_ERROR_STATUS_FRAME_CRC_MISMATCH"}	2   The frame's data did not match the CRC in the footer.
 * @property {"FLAC__STREAM_DECODER_ERROR_STATUS_UNPARSEABLE_STREAM"}	3   The decoder encountered reserved fields in use in the stream.
 *
 *
 * @interface FLAC__StreamDecoderErrorStatus
 * @memberOf Flac
 */
var DecoderErrorCode = {
	0: 'FLAC__STREAM_DECODER_ERROR_STATUS_LOST_SYNC',
	1: 'FLAC__STREAM_DECODER_ERROR_STATUS_BAD_HEADER',
	2: 'FLAC__STREAM_DECODER_ERROR_STATUS_FRAME_CRC_MISMATCH',
	3: 'FLAC__STREAM_DECODER_ERROR_STATUS_UNPARSEABLE_STREAM'
}

//(const FLAC__StreamDecoder *decoder, FLAC__StreamDecoderErrorStatus status, void *client_data)
// -> void
var dec_error_fn_ptr = addFunction(function(p_decoder, err, p_client_data){

	//err:
	var msg = DecoderErrorCode[err] || 'FLAC__STREAM_DECODER_ERROR__UNKNOWN__';//<- this should never happen;

	var error_callback_fn = getCallback(p_decoder, 'error');
	error_callback_fn(err, msg, p_client_data);
}, 'viii');

//(const FLAC__StreamDecoder *decoder, const FLAC__StreamMetadata *metadata, void *client_data) -> void
//(const FLAC__StreamEncoder *encoder, const FLAC__StreamMetadata *metadata, void *client_data) -> void
var metadata_fn_ptr = addFunction(function(p_coder, p_metadata, p_client_data){
	/*
	 typedef struct {
		FLAC__MetadataType type;
		FLAC__bool is_last;
		unsigned length;
		union {
			FLAC__StreamMetadata_StreamInfo stream_info;
			FLAC__StreamMetadata_Padding padding;
			FLAC__StreamMetadata_Application application;
			FLAC__StreamMetadata_SeekTable seek_table;
			FLAC__StreamMetadata_VorbisComment vorbis_comment;
			FLAC__StreamMetadata_CueSheet cue_sheet;
			FLAC__StreamMetadata_Picture picture;
			FLAC__StreamMetadata_Unknown unknown;
		} data;
	} FLAC__StreamMetadata;
	 */

	/*
	FLAC__METADATA_TYPE_STREAMINFO 		STREAMINFO block
	FLAC__METADATA_TYPE_PADDING 		PADDING block
	FLAC__METADATA_TYPE_APPLICATION 	APPLICATION block
	FLAC__METADATA_TYPE_SEEKTABLE 		SEEKTABLE block
	FLAC__METADATA_TYPE_VORBIS_COMMENT 	VORBISCOMMENT block (a.k.a. FLAC tags)
	FLAC__METADATA_TYPE_CUESHEET 		CUESHEET block
	FLAC__METADATA_TYPE_PICTURE 		PICTURE block
	FLAC__METADATA_TYPE_UNDEFINED 		marker to denote beginning of undefined type range; this number will increase as new metadata types are added
	FLAC__MAX_METADATA_TYPE 			No type will ever be greater than this. There is not enough room in the protocol block.
	 */

	var type = Module.getValue(p_metadata,'i32');//4 bytes
	var is_last = Module.getValue(p_metadata+4,'i32');//4 bytes
	var length = Module.getValue(p_metadata+8,'i64');//8 bytes

	var meta_data = {
		type: type,
		isLast: is_last,
		length: length,
		data: void(0)
	};

	var metadata_callback_fn = getCallback(p_coder, 'metadata');
	if(type === 0){// === FLAC__METADATA_TYPE_STREAMINFO

		meta_data.data = _readStreamInfo(p_metadata+16);
		metadata_callback_fn(meta_data.data, meta_data);

	} else {

		var data;
		switch(type){
			case 1: //FLAC__METADATA_TYPE_PADDING
				data = _readPaddingMetadata(p_metadata+16);
				break;
			case 2: //FLAC__METADATA_TYPE_APPLICATION
				data =  readApplicationMetadata(p_metadata+16);
				break;
			case 3: //FLAC__METADATA_TYPE_SEEKTABLE
				data = _readSeekTableMetadata(p_metadata+16);
				break;

			case 4: //FLAC__METADATA_TYPE_VORBIS_COMMENT
				data = _readVorbisComment(p_metadata+16);
				break;

			case 5: //FLAC__METADATA_TYPE_CUESHEET
				data = _readCueSheetMetadata(p_metadata+16);
				break;

			case 6: //FLAC__METADATA_TYPE_PICTURE
				data = _readPictureMetadata(p_metadata+16);
				break;
			default: { //NOTE this should not happen, and the raw data is very likely not correct!
				var cod_opts = _getOptions(p_coder);
				if(cod_opts && cod_opts.enableRawMetadata){
					var buffer = Uint8Array.from(HEAPU8.subarray(p_metadata+16, p_metadata+16+length));
					meta_data.raw = buffer;
				}
			}

		}

		meta_data.data = data;
		metadata_callback_fn(void(0), meta_data);
	}

}, 'viii');


////////////// helper fields and functions for event handling
// see exported on()/off() functions
var listeners = {};
var persistedEvents = [];
var add_event_listener = function (eventName, listener){
	var list = listeners[eventName];
	if(!list){
		list = [listener];
		listeners[eventName] = list;
	} else {
		list.push(listener);
	}
	check_and_trigger_persisted_event(eventName, listener);
};
var check_and_trigger_persisted_event = function(eventName, listener){
	var activated;
	for(var i=persistedEvents.length-1; i >= 0; --i){
		activated = persistedEvents[i];
		if(activated && activated.event === eventName){
			listener.apply(null, activated.args);
			break;
		}
	}
};
var remove_event_listener = function (eventName, listener){
	var list = listeners[eventName];
	if(list){
		for(var i=list.length-1; i >= 0; --i){
			if(list[i] === listener){
				list.splice(i, 1);
			}
		}
	}
};
/**
 * HELPER: fire an event
 * @param  {string} eventName
 * 										the event name
 * @param  {any[]} [args] OPITIONAL
 * 										the arguments when triggering the listeners
 * @param  {boolean} [isPersist] OPTIONAL (positinal argument!)
 * 										if TRUE, handlers for this event that will be registered after this will get triggered immediately
 * 										(i.e. event is "persistent": once triggered it stays "active")
 *
 */
var do_fire_event = function (eventName, args, isPersist){
	if(_exported['on'+eventName]){
		_exported['on'+eventName].apply(null, args);
	}
	var list = listeners[eventName];
	if(list){
		for(var i=0, size=list.length; i < size; ++i){
			list[i].apply(null, args)
		}
	}
	if(isPersist){
		persistedEvents.push({event: eventName, args: args});
	}
}

/////////////////////////////////////    export / public: /////////////////////////////////////////////
/**
 * The <code>Flac</code> module that provides functionality
 * for encoding WAV/PCM audio to Flac and decoding Flac to PCM.
 *
 * <br/><br/>
 * <p>
 * NOTE most functions are named analogous to the original C library functions,
 *      so that its documentation may be used for further reading.
 * </p>
 *
 * @see https://xiph.org/flac/api/group__flac__stream__encoder.html
 * @see https://xiph.org/flac/api/group__flac__stream__decoder.html
 *
 * @class Flac
 * @namespace Flac
 */
var _exported = {
	_module: Module,//internal: reference to Flac module
	_clear_enc_cb: function(enc_ptr){//internal function: remove reference to encoder instance and its callbacks
		delete coders[enc_ptr];
	},
	_clear_dec_cb: function(dec_ptr){//internal function: remove reference to decoder instance and its callbacks
		delete coders[dec_ptr];
	},
	/**
	 * Additional options for encoding or decoding
	 * @interface CodingOptions
	 * @memberOf Flac
	 * @property {boolean}  [analyseSubframes] for decoding: include subframes metadata in write-callback metadata, DEFAULT: false
	 * @property {boolean}  [analyseResiduals] for decoding: include residual data in subframes metadata in write-callback metadata, NOTE {@link #analyseSubframes} muste also be enabled, DEFAULT: false
	 * @property {boolean}  [enableRawMetadata] DEBUG option for decoding: enable receiving raw metadata for unknown metadata types in second argument in the metadata-callback, DEFAULT: false
	 *
	 * @see Flac#setOptions
	 * @see Flac~metadata_callback_fn
	 * @see Flac#FLAC__stream_decoder_set_metadata_respond_all
	 */
	/**
	 * FLAC raw metadata
	 *
	 * @interface MetadataBlock
	 * @memberOf Flac
	 * @property {Flac.FLAC__MetadataType}  type the type of the metadata
	 * @property {boolean}  isLast if it is the last block of metadata
	 * @property {number}  length the length of the metadata block (bytes)
	 * @property {Flac.StreamMetadata | Flac.PaddingMetadata | Flac.ApplicationMetadata | Flac.SeekTableMetadata | Flac.CueSheetMetadata | Flac.PictureMetadata}  [data] the metadata (omitted for unknown metadata types)
	 * @property {Uint8Array}  [raw] raw metadata (for debugging: enable via {@link Flac#setOptions})
	 */
	/**
	 * FLAC padding metadata block
	 *
	 * @interface PaddingMetadata
	 * @memberOf Flac
	 * @property {number}  dummy Conceptually this is an empty struct since we don't store the padding bytes. Empty structs are not allowed by some C compilers, hence the dummy.
	 *
	 * @see Flac.FLAC__MetadataType#FLAC__METADATA_TYPE_PADDING
	 */
	/**
	 * FLAC application metadata block
	 *
	 * NOTE the application meta data type is not really supported, i.e. the
	 *      (binary) data is only a pointer to the memory heap.
	 *
	 * @interface ApplicationMetadata
	 * @memberOf Flac
	 * @property {number}  id the application ID
	 * @property {number}  data (pointer)
	 *
	 * @see Flac.FLAC__MetadataType#FLAC__METADATA_TYPE_APPLICATION
	 * @see <a href="https://xiph.org/flac/format.html#metadata_block_application">application block format specification</a>
	 */
	/**
	 * FLAC seek table metadata block
	 *
	 * <p>
	 * From the format specification:
	 *
	 * The seek points must be sorted by ascending sample number.
	 *
	 * Each seek point's sample number must be the first sample of the target frame.
	 *
	 * Each seek point's sample number must be unique within the table
	 *
	 * Existence of a SEEKTABLE block implies a correct setting of total_samples in the stream_info block.
	 *
	 * Behavior is undefined when more than one SEEKTABLE block is present in a stream.
	 *
	 * @interface SeekTableMetadata
	 * @memberOf Flac
	 * @property {number}  num_points the number of seek points
	 * @property {Flac.SeekPoint[]}  points the seek points
	 *
	 * @see Flac.FLAC__MetadataType#FLAC__METADATA_TYPE_SEEKTABLE
	 */
	/**
	 * FLAC seek point data
	 *
	 * @interface SeekPoint
	 * @memberOf Flac
	 * @property {number}  sample_number The sample number of the target frame. NOTE <code>-1</code> for a placeholder point.
	 * @property {number}  stream_offset The offset, in bytes, of the target frame with respect to beginning of the first frame.
	 * @property {number}  frame_samples The number of samples in the target frame.
	 *
	 * @see Flac.SeekTableMetadata
	 */
	/**
	 * FLAC vorbis comment metadata block
	 *
	 * @interface VorbisCommentMetadata
	 * @memberOf Flac
	 * @property {string}  vendor_string the vendor string
	 * @property {number}  num_comments the number of comments
	 * @property {string[]}  comments the comments
	 *
	 * @see Flac.FLAC__MetadataType#FLAC__METADATA_TYPE_VORBIS_COMMENT
	 */
	 /**
	 * FLAC cue sheet metadata block
	 *
	 * @interface CueSheetMetadata
	 * @memberOf Flac
	 * @property {string}  media_catalog_number Media catalog number, in ASCII printable characters 0x20-0x7e. In general, the media catalog number may be 0 to 128 bytes long.
	 * @property {number}  lead_in The number of lead-in samples.
	 * @property {boolean}  is_cd true if CUESHEET corresponds to a Compact Disc, else false.
	 * @property {number}  num_tracks The number of tracks.
	 * @property {Flac.CueSheetTrack[]}  tracks the tracks
	 *
	 * @see Flac.FLAC__MetadataType#FLAC__METADATA_TYPE_CUESHEET
	 */
	 /**
	 * FLAC cue sheet track data
	 *
	 * @interface CueSheetTrack
	 * @memberOf Flac
	 * @property {number}  offset Track offset in samples, relative to the beginning of the FLAC audio stream.
	 * @property {number}  number The track number.
	 * @property {string}  isrc Track ISRC. This is a 12-digit alphanumeric code.
	 * @property {"AUDIO" | "NON_AUDIO"}  type The track type: audio or non-audio.
	 * @property {boolean}  pre_emphasis The pre-emphasis flag
	 * @property {number}  num_indices The number of track index points.
	 * @property {Flac.CueSheetTracIndex}  indices The track index points.
	 *
	 * @see Flac.CueSheetMetadata
	 */
	/**
	 * FLAC track index data for cue sheet metadata
	 *
	 * @interface CueSheetTracIndex
	 * @memberOf Flac
	 * @property {number}  offset Offset in samples, relative to the track offset, of the index point.
	 * @property {number}  number The index point number.
	 *
	 * @see Flac.CueSheetTrack
	 */
	/**
	 * FLAC picture metadata block
	 *
	 * @interface PictureMetadata
	 * @memberOf Flac
	 * @property {Flac.FLAC__StreamMetadata_Picture_Type}  type The kind of picture stored.
	 * @property {string}  mime_type Picture data's MIME type, in ASCII printable characters 0x20-0x7e, NUL terminated. For best compatibility with players, use picture data of MIME type image/jpeg or image/png. A MIME type of '–>' is also allowed, in which case the picture data should be a complete URL.
	 * @property {string}  description Picture's description.
	 * @property {number}  width Picture's width in pixels.
	 * @property {number}  height Picture's height in pixels.
	 * @property {number}  depth Picture's color depth in bits-per-pixel.
	 * @property {number}  colors For indexed palettes (like GIF), picture's number of colors (the number of palette entries), or 0 for non-indexed (i.e. 2^depth).
	 * @property {number}  data_length Length of binary picture data in bytes.
	 * @property {Uint8Array}  data Binary picture data.
	 */
	/**
	 * An enumeration of the PICTURE types (see FLAC__StreamMetadataPicture and id3 v2.4 APIC tag).
	 *
	 * @interface FLAC__StreamMetadata_Picture_Type
	 * @memberOf Flac
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_OTHER"} 					0		Other
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_FILE_ICON_STANDARD"} 		1		32x32 pixels 'file icon' (PNG only)
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_FILE_ICON"} 				2		Other file icon
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_FRONT_COVER"} 			3		Cover (front)
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_BACK_COVER"} 				4		Cover (back)
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_LEAFLET_PAGE"} 			5		Leaflet page
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_MEDIA"} 					6		Media (e.g. label side of CD)
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_LEAD_ARTIST"} 			7		Lead artist/lead performer/soloist
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_ARTIST"} 					8		Artist/performer
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_CONDUCTOR"} 				9		Conductor
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_BAND"} 					10		Band/Orchestra
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_COMPOSER"} 				11		Composer
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_LYRICIST"} 				12		Lyricist/text writer
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_RECORDING_LOCATION"} 		13		Recording Location
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_DURING_RECORDING"} 		14		During recording
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_DURING_PERFORMANCE"} 		15		During performance
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_VIDEO_SCREEN_CAPTURE"} 	16		Movie/video screen capture
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_FISH"} 					17		A bright coloured fish
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_ILLUSTRATION"} 			18		Illustration
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_BAND_LOGOTYPE"} 			19		Band/artist logotype
	 * @property {"FLAC__STREAM_METADATA_PICTURE_TYPE_PUBLISHER_LOGOTYPE"} 		20		Publisher/Studio logotype
	 *
	 * @see Flac.PictureMetadata
	 */

	/**
	 * An enumeration of the available metadata block types.
	 *
	 * @interface FLAC__MetadataType
	 * @memberOf Flac
	 *
	 * @property {"FLAC__METADATA_TYPE_STREAMINFO"} 		0	STREAMINFO block
	 * @property {"FLAC__METADATA_TYPE_PADDING"} 			1	PADDING block
	 * @property {"FLAC__METADATA_TYPE_APPLICATION"} 		2	APPLICATION block
	 * @property {"FLAC__METADATA_TYPE_SEEKTABLE"} 			3	SEEKTABLE block
	 * @property {"FLAC__METADATA_TYPE_VORBIS_COMMENT"} 	4	VORBISCOMMENT block (a.k.a. FLAC tags)
	 * @property {"FLAC__METADATA_TYPE_CUESHEET"} 			5	CUESHEET block
	 * @property {"FLAC__METADATA_TYPE_PICTURE"} 			6	PICTURE block
	 * @property {"FLAC__METADATA_TYPE_UNDEFINED"} 			7	marker to denote beginning of undefined type range; this number will increase as new metadata types are added
	 * @property {"FLAC__MAX_METADATA_TYPE"} 				126	No type will ever be greater than this. There is not enough room in the protocol block.
	 *
	 * @see Flac.MetadataBlock
	 * @see <a href="https://xiph.org/flac/format.html">FLAC format documentation</a>
	 */
	/**
	 * @function
	 * @public
	 * @memberOf Flac#
	 * @copydoc Flac._setOptions
	 */
	setOptions: _setOptions,
	/**
	 * @function
	 * @public
	 * @memberOf Flac#
	 * @copydoc Flac._getOptions
	 */
	getOptions: _getOptions,
	/**
	 * Returns if Flac has been initialized / is ready to be used.
	 *
	 * @returns {boolean} <code>true</code>, if Flac is ready to be used
	 *
	 * @memberOf Flac#
	 * @function
	 * @see #onready
	 * @see #on
	 */
	isReady: function() { return _flac_ready; },
	/**
	 * Hook for handler function that gets called, when asynchronous initialization has finished.
	 *
	 * NOTE that if the execution environment does not support <code>Object#defineProperty</code>, then
	 *      this function is not called, after {@link #isReady} is <code>true</code>.
	 *      In this case, {@link #isReady} should be checked, before setting <code>onready</code>
	 *      and if it is <code>true</code>, handler should be executed immediately instead of setting <code>onready</code>.
	 *
	 * @memberOf Flac#
	 * @function
	 * @param {Flac.event:ReadyEvent} event the ready-event object
	 * @see #isReady
	 * @see #on
	 * @default undefined
	 * @example
	 *  // [1] if Object.defineProperty() IS supported:
	 *  Flac.onready = function(event){
	 *     //gets executed when library becomes ready, or immediately, if it already is ready...
	 *	   doSomethingWithFlac();
	 *  };
	 *
	 *  // [2] if Object.defineProperty() is NOT supported:
	 *	// do check Flac.isReady(), and only set handler, if not ready yet
	 *  // (otherwise immediately excute handler code)
	 *  if(!Flac.isReady()){
	 *    Flac.onready = function(event){
	 *       //gets executed when library becomes ready...
	 *		 doSomethingWithFlac();
	 *    };
	 *  } else {
	 * 		// Flac is already ready: immediately start processing
	 *		doSomethingWithFlac();
	 *	}
	 */
	onready: void(0),
	/**
	 * Ready event: is fired when the library has been initialized and is ready to be used
	 * (e.g. asynchronous loading of binary / WASM modules has been completed).
	 *
	 * Before this event is fired, use of functions related to encoding and decoding may
	 * cause errors.
	 *
	 * @event ReadyEvent
	 * @memberOf Flac
	 * @type {object}
	 * @property {"ready"} type 	the type of the event <code>"ready"</code>
	 * @property {Flac} target 	the initalized FLAC library instance
	 *
	 * @see #isReady
	 * @see #on
	 */
	/**
	 * Created event: is fired when an encoder or decoder was created.
	 *
	 * @event CreatedEvent
	 * @memberOf Flac
	 * @type {object}
	 * @property {"created"} type 	the type of the event <code>"created"</code>
	 * @property {Flac.CoderChangedEventData} target 	the information for the created encoder or decoder
	 *
	 * @see #on
	 */
	/**
	 * Destroyed event: is fired when an encoder or decoder was destroyed.
	 *
	 * @event DestroyedEvent
	 * @memberOf Flac
	 * @type {object}
	 * @property {"destroyed"} type 	the type of the event <code>"destroyed"</code>
	 * @property {Flac.CoderChangedEventData} target 	the information for the destroyed encoder or decoder
	 *
	 * @see #on
	 */
	/**
	 * Life cycle event data for signaling life cycle changes of encoder or decoder instances
	 * @interface CoderChangedEventData
	 * @memberOf Flac
	 * @property {number}  id  the ID for the encoder or decoder instance
	 * @property {"encoder" | "decoder"}  type  signifies whether the event is for an encoder or decoder instance
	 * @property {any}  [data]  specific data for the life cycle change
	 *
	 * @see Flac.event:CreatedEvent
	 * @see Flac.event:DestroyedEvent
	 */
	/**
	 * Add an event listener for module-events.
	 * Supported events:
	 * <ul>
	 *  <li> <code>"ready"</code> &rarr; {@link Flac.event:ReadyEvent}: emitted when module is ready for usage (i.e. {@link #isReady} is true)<br/>
	 *             <em>NOTE listener will get immediately triggered if module is already <code>"ready"</code></em>
	 *  </li>
	 *  <li> <code>"created"</code> &rarr; {@link Flac.event:CreatedEvent}: emitted when an encoder or decoder instance was created<br/>
	 *  </li>
	 *  <li> <code>"destroyed"</code> &rarr; {@link Flac.event:DestroyedEvent}: emitted when an encoder or decoder instance was destroyed<br/>
	 *  </li>
	 * </ul>
	 *
	 * @param {string} eventName
	 * @param {Function} listener
	 *
	 * @memberOf Flac#
	 * @function
	 * @see #off
	 * @see #onready
	 * @see Flac.event:ReadyEvent
	 * @see Flac.event:CreatedEvent
	 * @see Flac.event:DestroyedEvent
	 * @example
	 *  Flac.on('ready', function(event){
	 *     //gets executed when library is ready, or becomes ready...
	 *  });
	 */
	on: add_event_listener,
	/**
	 * Remove an event listener for module-events.
	 * @param {string} eventName
	 * @param {Function} listener
	 *
	 * @memberOf Flac#
	 * @function
	 * @see #on
	 */
	off: remove_event_listener,

	/**
	 * Set the "verify" flag. If true, the encoder will verify it's own encoded output by feeding it through an internal decoder and comparing the original signal against the decoded signal. If a mismatch occurs, the process call will return false. Note that this will slow the encoding process by the extra time required for decoding and comparison.
	 *
	 * <p>
	 * NOTE: only use on un-initilized encoder instances!
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @param {boolean} is_verify enable/disable checksum verification during encoding
	 *
	 * @returns {boolean} <code>false</code> if the encoder is already initialized, else <code>true</code>
	 *
	 * @see #create_libflac_encoder
	 * @see #FLAC__stream_encoder_get_verify
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_encoder_set_verify: function(encoder, is_verify){
		is_verify = is_verify? 1 : 0;
		Module.ccall('FLAC__stream_encoder_set_verify', 'number', ['number', 'number'], [ encoder, is_verify ]);
	},
	/**
	 * Set the compression level
	 *
	 * The compression level is roughly proportional to the amount of effort the encoder expends to compress the file. A higher level usually means more computation but higher compression. The default level is suitable for most applications.
	 *
	 * Currently the levels range from 0 (fastest, least compression) to 8 (slowest, most compression). A value larger than 8 will be treated as 8.
	 *
	 *
	 * <p>
	 * NOTE: only use on un-initilized encoder instances!
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @param {Flac.CompressionLevel} compression_level the desired Flac compression level: [0, 8]
	 *
	 * @returns {boolean} <code>false</code> if the encoder is already initialized, else <code>true</code>
	 *
	 * @see #create_libflac_encoder
	 * @see Flac.CompressionLevel
	 * @see <a href="https://xiph.org/flac/api/group__flac__stream__encoder.html#gae49cf32f5256cb47eecd33779493ac85">FLAC API for FLAC__stream_encoder_set_compression_level()</a>
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_encoder_set_compression_level: Module.cwrap('FLAC__stream_encoder_set_compression_level', 'number', [ 'number', 'number' ]),
	/**
	 * Set the blocksize to use while encoding.
	 * The number of samples to use per frame. Use 0 to let the encoder estimate a blocksize; this is usually best.
	 *
	 * <p>
	 * NOTE: only use on un-initilized encoder instances!
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @param {number} block_size  the number of samples to use per frame
	 *
	 * @returns {boolean} <code>false</code> if the encoder is already initialized, else <code>true</code>
	 *
	 * @see #create_libflac_encoder
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_encoder_set_blocksize: Module.cwrap('FLAC__stream_encoder_set_blocksize', 'number', [ 'number', 'number']),


	/**
	 * Get the state of the verify stream decoder. Useful when the stream encoder state is FLAC__STREAM_ENCODER_VERIFY_DECODER_ERROR.
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @returns {Flac.FLAC__StreamDecoderState} the verify stream decoder state
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_encoder_get_verify_decoder_state: Module.cwrap('FLAC__stream_encoder_get_verify_decoder_state', 'number', ['number']),

	/**
	 * Get the "verify" flag for the encoder.
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @returns {boolean} the verify flag for the encoder
	 *
	 *
	 * @memberOf Flac#
	 * @function
	 *
	 * @see #FLAC__stream_encoder_set_verify
	 */
	FLAC__stream_encoder_get_verify: Module.cwrap('FLAC__stream_encoder_get_verify', 'number', ['number']),
/*

TODO export other encoder API functions?:

FLAC__bool 	FLAC__stream_encoder_set_channels (FLAC__StreamEncoder *encoder, unsigned value)

FLAC__bool 	FLAC__stream_encoder_set_bits_per_sample (FLAC__StreamEncoder *encoder, unsigned value)

FLAC__bool 	FLAC__stream_encoder_set_sample_rate (FLAC__StreamEncoder *encoder, unsigned value)

FLAC__bool 	FLAC__stream_encoder_set_do_mid_side_stereo (FLAC__StreamEncoder *encoder, FLAC__bool value)

FLAC__bool 	FLAC__stream_encoder_set_loose_mid_side_stereo (FLAC__StreamEncoder *encoder, FLAC__bool value)

FLAC__bool 	FLAC__stream_encoder_set_apodization (FLAC__StreamEncoder *encoder, const char *specification)

FLAC__bool 	FLAC__stream_encoder_set_max_lpc_order (FLAC__StreamEncoder *encoder, unsigned value)

FLAC__bool 	FLAC__stream_encoder_set_qlp_coeff_precision (FLAC__StreamEncoder *encoder, unsigned value)

FLAC__bool 	FLAC__stream_encoder_set_do_qlp_coeff_prec_search (FLAC__StreamEncoder *encoder, FLAC__bool value)

FLAC__bool 	FLAC__stream_encoder_set_do_escape_coding (FLAC__StreamEncoder *encoder, FLAC__bool value)

FLAC__bool 	FLAC__stream_encoder_set_do_exhaustive_model_search (FLAC__StreamEncoder *encoder, FLAC__bool value)

FLAC__bool 	FLAC__stream_encoder_set_min_residual_partition_order (FLAC__StreamEncoder *encoder, unsigned value)

FLAC__bool 	FLAC__stream_encoder_set_max_residual_partition_order (FLAC__StreamEncoder *encoder, unsigned value)

FLAC__bool 	FLAC__stream_encoder_set_rice_parameter_search_dist (FLAC__StreamEncoder *encoder, unsigned value)

FLAC__bool 	FLAC__stream_encoder_get_streamable_subset (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_channels (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_bits_per_sample (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_sample_rate (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_blocksize (const FLAC__StreamEncoder *encoder)

FLAC__bool 	FLAC__stream_encoder_get_do_mid_side_stereo (const FLAC__StreamEncoder *encoder)

FLAC__bool 	FLAC__stream_encoder_get_loose_mid_side_stereo (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_max_lpc_order (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_qlp_coeff_precision (const FLAC__StreamEncoder *encoder)

FLAC__bool 	FLAC__stream_encoder_get_do_qlp_coeff_prec_search (const FLAC__StreamEncoder *encoder)

FLAC__bool 	FLAC__stream_encoder_get_do_escape_coding (const FLAC__StreamEncoder *encoder)

FLAC__bool 	FLAC__stream_encoder_get_do_exhaustive_model_search (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_min_residual_partition_order (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_max_residual_partition_order (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_rice_parameter_search_dist (const FLAC__StreamEncoder *encoder)

FLAC__uint64 	FLAC__stream_encoder_get_total_samples_estimate (const FLAC__StreamEncoder *encoder)



TODO export other decoder API functions?:


const char * 	FLAC__stream_decoder_get_resolved_state_string (const FLAC__StreamDecoder *decoder)

FLAC__uint64 	FLAC__stream_decoder_get_total_samples (const FLAC__StreamDecoder *decoder)

unsigned 	FLAC__stream_decoder_get_channels (const FLAC__StreamDecoder *decoder)

unsigned 	FLAC__stream_decoder_get_bits_per_sample (const FLAC__StreamDecoder *decoder)

unsigned 	FLAC__stream_decoder_get_sample_rate (const FLAC__StreamDecoder *decoder)

unsigned 	FLAC__stream_decoder_get_blocksize (const FLAC__StreamDecoder *decoder)


FLAC__bool 	FLAC__stream_decoder_flush (FLAC__StreamDecoder *decoder)

FLAC__bool 	FLAC__stream_decoder_skip_single_frame (FLAC__StreamDecoder *decoder)

 */

	 /**
	 * Set the compression level
	 *
	 * The compression level is roughly proportional to the amount of effort the encoder expends to compress the file. A higher level usually means more computation but higher compression. The default level is suitable for most applications.
	 *
	 * Currently the levels range from 0 (fastest, least compression) to 8 (slowest, most compression). A value larger than 8 will be treated as 8.
	 *
	 * This function automatically calls the following other set functions with appropriate values, so the client does not need to unless it specifically wants to override them:
	 * <pre>
	 *     FLAC__stream_encoder_set_do_mid_side_stereo()
	 *     FLAC__stream_encoder_set_loose_mid_side_stereo()
	 *     FLAC__stream_encoder_set_apodization()
	 *     FLAC__stream_encoder_set_max_lpc_order()
	 *     FLAC__stream_encoder_set_qlp_coeff_precision()
	 *     FLAC__stream_encoder_set_do_qlp_coeff_prec_search()
	 *     FLAC__stream_encoder_set_do_escape_coding()
	 *     FLAC__stream_encoder_set_do_exhaustive_model_search()
	 *     FLAC__stream_encoder_set_min_residual_partition_order()
	 *     FLAC__stream_encoder_set_max_residual_partition_order()
	 *     FLAC__stream_encoder_set_rice_parameter_search_dist()
	 * </pre>
	 * The actual values set for each level are:
	 * | level  | do mid-side stereo  | loose mid-side stereo  | apodization                                    | max lpc order  | qlp coeff precision  | qlp coeff prec search  | escape coding  | exhaustive model search  | min residual partition order  | max residual partition order  | rice parameter search dist   |
	 * |--------|---------------------|------------------------|------------------------------------------------|----------------|----------------------|------------------------|----------------|--------------------------|-------------------------------|-------------------------------|------------------------------|
	 * | 0      | false               | false                  | tukey(0.5)                                     | 0              | 0                    | false                  | false          | false                    | 0                             | 3                             | 0                            |
	 * | 1      | true                | true                   | tukey(0.5)                                     | 0              | 0                    | false                  | false          | false                    | 0                             | 3                             | 0                            |
	 * | 2      | true                | false                  | tukey(0.5)                                     | 0              | 0                    | false                  | false          | false                    | 0                             | 3                             | 0                            |
	 * | 3      | false               | false                  | tukey(0.5)                                     | 6              | 0                    | false                  | false          | false                    | 0                             | 4                             | 0                            |
	 * | 4      | true                | true                   | tukey(0.5)                                     | 8              | 0                    | false                  | false          | false                    | 0                             | 4                             | 0                            |
	 * | 5      | true                | false                  | tukey(0.5)                                     | 8              | 0                    | false                  | false          | false                    | 0                             | 5                             | 0                            |
	 * | 6      | true                | false                  | tukey(0.5);partial_tukey(2)                    | 8              | 0                    | false                  | false          | false                    | 0                             | 6                             | 0                            |
	 * | 7      | true                | false                  | tukey(0.5);partial_tukey(2)                    | 12             | 0                    | false                  | false          | false                    | 0                             | 6                             | 0                            |
	 * | 8      | true                | false                  | tukey(0.5);partial_tukey(2);punchout_tukey(3)  | 12             | 0                    | false                  | false          | false                    | 0                             | 6                             | 0                            |
	 *
	 * @interface CompressionLevel
	 * @memberOf Flac
	 *
	 * @property {"FLAC__COMPRESSION_LEVEL_0"} 		0	compression level 0
	 * @property {"FLAC__COMPRESSION_LEVEL_1"} 		1	compression level 1
	 * @property {"FLAC__COMPRESSION_LEVEL_2"} 		2	compression level 2
	 * @property {"FLAC__COMPRESSION_LEVEL_3"} 		3	compression level 3
	 * @property {"FLAC__COMPRESSION_LEVEL_4"} 		4	compression level 4
	 * @property {"FLAC__COMPRESSION_LEVEL_5"} 		5	compression level 5
	 * @property {"FLAC__COMPRESSION_LEVEL_6"} 		6	compression level 6
	 * @property {"FLAC__COMPRESSION_LEVEL_7"} 		7	compression level 7
	 * @property {"FLAC__COMPRESSION_LEVEL_8"} 		8	compression level 8
	 */
	/**
	 * Create an encoder.
	 *
	 * @param {number} sample_rate
	 * 					the sample rate of the input PCM data
	 * @param {number} channels
	 * 					the number of channels of the input PCM data
	 * @param {number} bps
	 * 					bits per sample of the input PCM data
	 * @param {Flac.CompressionLevel} compression_level
	 * 					the desired Flac compression level: [0, 8]
	 * @param {number} [total_samples] OPTIONAL
	 * 					the number of total samples of the input PCM data:<br>
	 * 					 Sets an estimate of the total samples that will be encoded.
	 * 					 This is merely an estimate and may be set to 0 if unknown.
	 * 					 This value will be written to the STREAMINFO block before encoding,
	 * 					 and can remove the need for the caller to rewrite the value later if
	 * 					 the value is known before encoding.<br>
	 * 					If specified, the it will be written into metadata of the FLAC header.<br>
	 * 					DEFAULT: 0 (i.e. unknown number of samples)
	 * @param {boolean} [is_verify] OPTIONAL
	 * 					enable/disable checksum verification during encoding<br>
	 * 					DEFAULT: true<br>
	 * 					NOTE: this argument is positional (i.e. total_samples must also be given)
	 * @param {number} [block_size] OPTIONAL
	 * 					the number of samples to use per frame.<br>
	 * 					DEFAULT: 0 (i.e. encoder sets block size automatically)
	 * 					NOTE: this argument is positional (i.e. total_samples and is_verify must also be given)
	 *
	 *
	 * @returns {number} the ID of the created encoder instance (or 0, if there was an error)
	 *
	 * @memberOf Flac#
	 * @function
	 */
	create_libflac_encoder: function(sample_rate, channels, bps, compression_level, total_samples, is_verify, block_size){
		is_verify = typeof is_verify === 'undefined'? 1 : is_verify + 0;
		total_samples = typeof total_samples === 'number'? total_samples : 0;
		block_size = typeof block_size === 'number'? block_size : 0;
		var ok = true;
		var encoder = Module.ccall('FLAC__stream_encoder_new', 'number', [ ], [ ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_verify', 'number', ['number', 'number'], [ encoder, is_verify ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_compression_level', 'number', ['number', 'number'], [ encoder, compression_level ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_channels', 'number', ['number', 'number'], [ encoder, channels ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_bits_per_sample', 'number', ['number', 'number'], [ encoder, bps ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_sample_rate', 'number', ['number', 'number'], [ encoder, sample_rate ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_blocksize', 'number', [ 'number', 'number'], [ encoder, block_size ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_total_samples_estimate', 'number', ['number', 'number'], [ encoder, total_samples ]);
		if (ok){
			do_fire_event('created', [{type: 'created', target: {id: encoder, type: 'encoder'}}], false);
			return encoder;
		}
		return 0;
	},
	/**
	 * @deprecated use {@link #create_libflac_encoder} instead
	 * @memberOf Flac#
	 * @function
	 */
	init_libflac_encoder: function(){
		console.warn('Flac.init_libflac_encoder() is deprecated, use Flac.create_libflac_encoder() instead!');
		return this.create_libflac_encoder.apply(this, arguments);
	},

	/**
	 * Create a decoder.
	 *
	 * @param {boolean} [is_verify]
	 * 				enable/disable checksum verification during decoding<br>
	 * 				DEFAULT: true
	 *
	 * @returns {number} the ID of the created decoder instance (or 0, if there was an error)
	 *
	 * @memberOf Flac#
	 * @function
	 */
	create_libflac_decoder: function(is_verify){
		is_verify = typeof is_verify === 'undefined'? 1 : is_verify + 0;
		var ok = true;
		var decoder = Module.ccall('FLAC__stream_decoder_new', 'number', [ ], [ ]);
		ok &= Module.ccall('FLAC__stream_decoder_set_md5_checking', 'number', ['number', 'number'], [ decoder, is_verify ]);
		if (ok){
			do_fire_event('created', [{type: 'created', target: {id: decoder, type: 'decoder'}}], false);
			return decoder;
		}
		return 0;
	},
	/**
	 * @deprecated use {@link #create_libflac_decoder} instead
	 * @memberOf Flac#
	 * @function
	 */
	init_libflac_decoder: function(){
		console.warn('Flac.init_libflac_decoder() is deprecated, use Flac.create_libflac_decoder() instead!');
		return this.create_libflac_decoder.apply(this, arguments);
	},
	/**
	 * The callback for writing the encoded FLAC data.
	 *
	 * @callback Flac~encoder_write_callback_fn
	 * @param {Uint8Array} data the encoded FLAC data
	 * @param {number} numberOfBytes the number of bytes in data
	 * @param {number} samples the number of samples encoded in data
	 * @param {number} currentFrame the number of the (current) encoded frame in data
	 * @returns {void | false} returning <code>false</code> indicates that an
	 * 								unrecoverable error occurred and decoding should be aborted
	 */
	/**
	 * The callback for the metadata of the encoded/decoded Flac data.
	 *
	 * By default, only the STREAMINFO metadata is enabled.
	 *
	 * For other metadata types {@link Flac.FLAC__MetadataType} they need to be enabled,
	 * see e.g. {@link Flac#FLAC__stream_decoder_set_metadata_respond}
	 *
	 * @callback Flac~metadata_callback_fn
	 * @param {Flac.StreamMetadata | undefined} metadata the FLAC meta data, NOTE only STREAMINFO is returned in first argument, for other types use 2nd argument's <code>metadataBlock.data<code>
	 * @param {Flac.MetadataBlock} metadataBlock the detailed meta data block
	 *
	 * @see Flac#init_decoder_stream
	 * @see Flac#init_encoder_stream
	 * @see Flac.CodingOptions
	 * @see Flac#FLAC__stream_decoder_set_metadata_respond_all
	 */
	/**
	 * FLAC meta data
	 * @interface Metadata
	 * @memberOf Flac
	 * @property {number}  sampleRate the sample rate (Hz)
	 * @property {number}  channels the number of channels
	 * @property {number}  bitsPerSample bits per sample
	 */
	/**
	 * FLAC stream meta data
	 * @interface StreamMetadata
	 * @memberOf Flac
	 * @augments Flac.Metadata
	 * @property {number}  min_blocksize the minimal block size (bytes)
	 * @property {number}  max_blocksize the maximal block size (bytes)
	 * @property {number}  min_framesize the minimal frame size (bytes)
	 * @property {number}  max_framesize the maximal frame size (bytes)
	 * @property {number}  total_samples the total number of (encoded/decoded) samples
	 * @property {string}  md5sum  the MD5 checksum for the decoded data (if validation is active)
	 */
	/**
	 * Initialize the encoder.
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance that has not been initialized (or has been reset)
	 *
	 * @param {Flac~encoder_write_callback_fn} write_callback_fn
	 * 				the callback for writing the encoded Flac data:
	 * 				<pre>write_callback_fn(data: Uint8Array, numberOfBytes: Number, samples: Number, currentFrame: Number)</pre>
	 *
	 * @param {Flac~metadata_callback_fn} [metadata_callback_fn] OPTIONAL
	 * 				the callback for the metadata of the encoded Flac data:
	 * 				<pre>metadata_callback_fn(metadata: StreamMetadata)</pre>
	 *
	 * @param {number|boolean} [ogg_serial_number] OPTIONAL
	 * 				if number or <code>true</code> is specified, the encoder will be initialized to
	 * 				write to an OGG container, see {@link Flac.init_encoder_ogg_stream}:
	 * 				<code>true</code> will set a default serial number (<code>1</code>),
	 * 				if specified as number, it will be used as the stream's serial number within the ogg container.
	 *
	 * @returns {Flac.FLAC__StreamEncoderInitStatus} the encoder status (<code>0</code> for <code>FLAC__STREAM_ENCODER_INIT_STATUS_OK</code>)
	 *
	 * @memberOf Flac#
	 * @function
	 */
	init_encoder_stream: function(encoder, write_callback_fn, metadata_callback_fn, ogg_serial_number, client_data){

		var is_ogg = (ogg_serial_number === true);
		client_data = client_data|0;

		if(typeof write_callback_fn !== 'function'){
			return FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_CALLBACKS;
		}
		setCallback(encoder, 'write', write_callback_fn);

		var __metadata_callback_fn_ptr = 0;
		if(typeof metadata_callback_fn === 'function'){
			setCallback(encoder, 'metadata', metadata_callback_fn);
			__metadata_callback_fn_ptr = metadata_fn_ptr;
		}

		//NOTE the following comments are used for auto-detecting exported functions (only change if ccall function name(s) change!):
		//	Module.ccall('FLAC__stream_encoder_init_stream'
		var func_name = 'FLAC__stream_encoder_init_stream';
		var args_types = ['number', 'number', 'number', 'number', 'number', 'number'];
		var args = [
			encoder,
			enc_write_fn_ptr,
			0,//	FLAC__StreamEncoderSeekCallback
			0,//	FLAC__StreamEncoderTellCallback
			__metadata_callback_fn_ptr,
			client_data
		];

		if(typeof ogg_serial_number === 'number'){

			is_ogg = true;

		} else if(is_ogg){//else: set default serial number for stream in OGG container

			//NOTE from FLAC docs: "It is recommended to set a serial number explicitly as the default of '0' may collide with other streams."
			ogg_serial_number = 1;
		}

		if(is_ogg){
			//NOTE the following comments are used for auto-detecting exported functions (only change if ccall function name(s) change!):
			//	Module.ccall('FLAC__stream_encoder_init_ogg_stream'
			func_name = 'FLAC__stream_encoder_init_ogg_stream';

			//2nd arg: FLAC__StreamEncoderReadCallback ptr -> duplicate first entry & insert at [1]
			args.unshift(args[0]);
			args[1] = 0;//	FLAC__StreamEncoderReadCallback

			args_types.unshift(args_types[0]);
			args_types[1] = 'number';


			//NOTE ignore BOOL return value when setting serial number, since init-call's returned
			//     status will also indicate, if encoder already has been initialized
			Module.ccall(
				'FLAC__stream_encoder_set_ogg_serial_number', 'number',
				['number', 'number'],
				[ encoder, ogg_serial_number ]
			);
		}

		var init_status = Module.ccall(func_name, 'number', args_types, args);

		return init_status;
	},
	/**
	 * Initialize the encoder for writing to an OGG container.
	 *
	 * @param {number} [ogg_serial_number] OPTIONAL
	 * 				the serial number for the stream in the OGG container
	 * 				DEFAULT: <code>1</code>
	 *
	 * @memberOf Flac#
	 * @function
	 * @copydoc #init_encoder_stream
	 */
	init_encoder_ogg_stream: function(encoder, write_callback_fn, metadata_callback_fn, ogg_serial_number, client_data){

		if(typeof ogg_serial_number !== 'number'){
			ogg_serial_number = true;
		}
		return this.init_encoder_stream(encoder, write_callback_fn, metadata_callback_fn, ogg_serial_number, client_data);
	},
	/**
	 * Result / return value for {@link Flac~decoder_read_callback_fn} callback function
	 *
	 * @interface ReadResult
	 * @memberOf Flac
	 * @property {TypedArray}  buffer  a TypedArray (e.g. Uint8Array) with the read data
	 * @property {number}  readDataLength the number of read data bytes. A number of <code>0</code> (zero) indicates that the end-of-stream is reached.
	 * @property {boolean}  [error] OPTIONAL value of <code>true</code> indicates that an error occured (decoding will be aborted)
	 */
	/**
	 * Result / return value for {@link Flac~decoder_read_callback_fn} callback function for signifying that there is no more data to read
	 *
	 * @interface CompletedReadResult
	 * @memberOf Flac
	 * @augments Flac.ReadResult
	 * @property {TypedArray | undefined}  buffer  a TypedArray (e.g. Uint8Array) with the read data (will be ignored in case readDataLength is <code>0</code>)
	 * @property {0}  readDataLength the number of read data bytes: The number of <code>0</code> (zero) indicates that the end-of-stream is reached.
	 */
	/**
	 * The callback for reading the FLAC data that will be decoded.
	 *
	 * @callback Flac~decoder_read_callback_fn
	 * @param {number} numberOfBytes the maximal number of bytes that the read callback can return
	 * @returns {Flac.ReadResult | Flac.CompletedReadResult} the result of the reading action/request
	 */
	/**
	 * The callback for writing the decoded FLAC data.
	 *
	 * @callback Flac~decoder_write_callback_fn
	 * @param {Uint8Array[]} data array of the channels with the decoded PCM data as <code>Uint8Array</code>s
	 * @param {Flac.BlockMetadata} frameInfo the metadata information for the decoded data
	 */
	/**
	 * The callback for reporting decoding errors.
	 *
	 * @callback Flac~decoder_error_callback_fn
	 * @param {number} errorCode the error code
	 * @param {Flac.FLAC__StreamDecoderErrorStatus} errorDescription the string representation / description of the error
	 */
	/**
	 * FLAC block meta data
	 * @interface BlockMetadata
	 * @augments Flac.Metadata
	 * @memberOf Flac
	 *
	 * @property {number}  blocksize the block size (bytes)
	 * @property {number}  number the number of the decoded samples or frames
	 * @property {string}  numberType the type to which <code>number</code> refers to: either <code>"frames"</code> or <code>"samples"</code>
	 * @property {Flac.FLAC__ChannelAssignment} channelAssignment the channel assignment
	 * @property {string}  crc the MD5 checksum for the decoded data, if validation is enabled
	 * @property {Flac.SubFrameMetadata[]}  [subframes] the metadata of the subframes. The array length corresponds to the number of channels. NOTE will only be included if {@link Flac.CodingOptions CodingOptions.analyseSubframes} is enabled for the decoder.
	 *
	 * @see Flac.CodingOptions
	 * @see Flac#setOptions
	 */
	/**
	 * FLAC subframe metadata
	 * @interface SubFrameMetadata
	 * @memberOf Flac
	 *
	 * @property {Flac.FLAC__SubframeType}  type the type of the subframe
	 * @property {number|Flac.FixedSubFrameData|Flac.LPCSubFrameData}  data the type specific metadata for subframe
	 * @property {number}  wastedBits the wasted bits-per-sample
	 */
	/**
	 * metadata for FIXED subframe type
	 * @interface FixedSubFrameData
	 * @memberOf Flac
	 *
	 * @property {number}  order  The polynomial order.
	 * @property {number[]}  warmup  Warmup samples to prime the predictor, length == order.
	 * @property {Flac.SubFramePartition}  partition  The residual coding method.
	 * @property {number[]}  [residual]  The residual signal, length == (blocksize minus order) samples.
	 * 									NOTE will only be included if {@link Flac.CodingOptions CodingOptions.analyseSubframes} is enabled for the decoder.
	 */
	/**
	 * metadata for LPC subframe type
	 * @interface LPCSubFrameData
	 * @augments Flac.FixedSubFrameData
	 * @memberOf Flac
	 *
	 * @property {number}  order  The FIR order.
	 * @property {number[]}  qlp_coeff  FIR filter coefficients.
	 * @property {number}  qlp_coeff_precision  Quantized FIR filter coefficient precision in bits.
	 * @property {number}  quantization_level The qlp coeff shift needed.
	 */
	/**
	 * metadata for FIXED or LPC subframe partitions
	 * @interface SubFramePartition
	 * @memberOf Flac
	 *
	 * @property {Flac.FLAC__EntropyCodingMethodType}  type  the entropy coding method
	 * @property {Flac.SubFramePartitionData}  data  metadata for a Rice partitioned residual
	 */
	/**
	 * metadata for FIXED or LPC subframe partition data
	 * @interface SubFramePartitionData
	 * @memberOf Flac
	 *
	 * @property {number}  order  The partition order, i.e. # of contexts = 2 ^ order.
	 * @property {Flac.SubFramePartitionContent}  contents  The context's Rice parameters and/or raw bits.
	 */
	/**
	 * metadata for FIXED or LPC subframe partition data content
	 * @interface SubFramePartitionContent
	 * @memberOf Flac
	 *
	 * @property {number[]}  parameters  The Rice parameters for each context.
	 * @property {number[]}  rawBits  Widths for escape-coded partitions. Will be non-zero for escaped partitions and zero for unescaped partitions.
	 * @property {number}  capacityByOrder  The capacity of the parameters and raw_bits arrays specified as an order, i.e. the number of array elements allocated is 2 ^ capacity_by_order.
	 */
	/**
	 * The types for FLAC subframes
	 *
	 * @interface FLAC__SubframeType
	 * @memberOf Flac
	 *
	 * @property {"FLAC__SUBFRAME_TYPE_CONSTANT"} 	0	constant signal
	 * @property {"FLAC__SUBFRAME_TYPE_VERBATIM"} 	1	uncompressed signal
	 * @property {"FLAC__SUBFRAME_TYPE_FIXED"} 		2	fixed polynomial prediction
	 * @property {"FLAC__SUBFRAME_TYPE_LPC"} 		3	linear prediction
	 */
	/**
	 * The channel assignment for the (decoded) frame.
	 *
	 * @interface FLAC__ChannelAssignment
	 * @memberOf Flac
	 *
	 * @property {"FLAC__CHANNEL_ASSIGNMENT_INDEPENDENT"} 		0	independent channels
	 * @property {"FLAC__CHANNEL_ASSIGNMENT_LEFT_SIDE"}  		1	left+side stereo
	 * @property {"FLAC__CHANNEL_ASSIGNMENT_RIGHT_SIDE"} 		2	right+side stereo
	 * @property {"FLAC__CHANNEL_ASSIGNMENT_MID_SIDE"}			3	mid+side stereo
	 */
	/**
	 * entropy coding methods
	 *
	 * @interface FLAC__EntropyCodingMethodType
	 * @memberOf Flac
	 *
	 * @property {"FLAC__ENTROPY_CODING_METHOD_PARTITIONED_RICE"} 	0	Residual is coded by partitioning into contexts, each with it's own 4-bit Rice parameter.
	 * @property {"FLAC__ENTROPY_CODING_METHOD_PARTITIONED_RICE2"} 	1	Residual is coded by partitioning into contexts, each with it's own 5-bit Rice parameter.
	 */
	/**
	 * Initialize the decoder.
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance that has not been initialized (or has been reset)
	 *
	 * @param {Flac~decoder_read_callback_fn} read_callback_fn
	 * 				the callback for reading the Flac data that should get decoded:
	 * 				<pre>read_callback_fn(numberOfBytes: Number) : {buffer: ArrayBuffer, readDataLength: number, error: boolean}</pre>
	 *
	 * @param {Flac~decoder_write_callback_fn} write_callback_fn
	 * 				the callback for writing the decoded data:
	 * 				<pre>write_callback_fn(data: Uint8Array[], frameInfo: Metadata)</pre>
	 *
	 * @param {Flac~decoder_error_callback_fn} error_callback_fn
	 * 				the error callback:
	 * 				<pre>error_callback_fn(errorCode: Number, errorDescription: String)</pre>
	 *
	 * @param {Flac~metadata_callback_fn} [metadata_callback_fn] OPTIONAL
	 * 				callback for receiving the metadata of FLAC data that will be decoded:
	 * 				<pre>metadata_callback_fn(metadata: StreamMetadata)</pre>
	 *
	 * @param {number|boolean} [ogg_serial_number] OPTIONAL
	 * 				if number or <code>true</code> is specified, the decoder will be initilized to
	 * 				read from an OGG container, see {@link Flac.init_decoder_ogg_stream}:<br/>
	 * 				<code>true</code> will use the default serial number, if specified as number the
	 * 				corresponding stream with the serial number from the ogg container will be used.
	 *
	 * @returns {Flac.FLAC__StreamDecoderInitStatus} the decoder status(<code>0</code> for <code>FLAC__STREAM_DECODER_INIT_STATUS_OK</code>)
	 *
	 * @memberOf Flac#
	 * @function
	 */
	init_decoder_stream: function(decoder, read_callback_fn, write_callback_fn, error_callback_fn, metadata_callback_fn, ogg_serial_number, client_data){

		client_data = client_data|0;

		if(typeof read_callback_fn !== 'function'){
			return FLAC__STREAM_DECODER_INIT_STATUS_INVALID_CALLBACKS;
		}
		setCallback(decoder, 'read', read_callback_fn);

		if(typeof write_callback_fn !== 'function'){
			return FLAC__STREAM_DECODER_INIT_STATUS_INVALID_CALLBACKS;
		}
		setCallback(decoder, 'write', write_callback_fn);

		var __error_callback_fn_ptr = 0;
		if(typeof error_callback_fn === 'function'){
			setCallback(decoder, 'error', error_callback_fn);
			__error_callback_fn_ptr = dec_error_fn_ptr;
		}

		var __metadata_callback_fn_ptr = 0;
		if(typeof metadata_callback_fn === 'function'){
			setCallback(decoder, 'metadata', metadata_callback_fn);
			__metadata_callback_fn_ptr = metadata_fn_ptr;
		}

		var is_ogg = (ogg_serial_number === true);
		if(typeof ogg_serial_number === 'number'){

			is_ogg = true;

			//NOTE ignore BOOL return value when setting serial number, since init-call's returned
			//     status will also indicate, if decoder already has been initialized
			Module.ccall(
				'FLAC__stream_decoder_set_ogg_serial_number', 'number',
				['number', 'number'],
				[ decoder, ogg_serial_number ]
			);
		}

		//NOTE the following comments are used for auto-detecting exported functions (only change if ccall function name(s) change!):
		//	Module.ccall('FLAC__stream_decoder_init_stream'
		//	Module.ccall('FLAC__stream_decoder_init_ogg_stream'
		var init_func_name = !is_ogg? 'FLAC__stream_decoder_init_stream' : 'FLAC__stream_decoder_init_ogg_stream';

		var init_status = Module.ccall(
				init_func_name, 'number',
				[ 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'],
				[
					 decoder,
					 dec_read_fn_ptr,
					 0,// 	FLAC__StreamDecoderSeekCallback
					 0,// 	FLAC__StreamDecoderTellCallback
					 0,//	FLAC__StreamDecoderLengthCallback
					 0,//	FLAC__StreamDecoderEofCallback
					 dec_write_fn_ptr,
					 __metadata_callback_fn_ptr,
					 __error_callback_fn_ptr,
					 client_data
				]
		);

		return init_status;
	},
	/**
	 * Initialize the decoder for writing to an OGG container.
	 *
	 * @param {number} [ogg_serial_number] OPTIONAL
	 * 				the serial number for the stream in the OGG container that should be decoded.<br/>
	 * 				The default behavior is to use the serial number of the first Ogg page. Setting a serial number here will explicitly specify which stream is to be decoded.
	 *
	 * @memberOf Flac#
	 * @function
	 * @copydoc #init_decoder_stream
	 */
	init_decoder_ogg_stream: function(decoder, read_callback_fn, write_callback_fn, error_callback_fn, metadata_callback_fn, ogg_serial_number, client_data){

		if(typeof ogg_serial_number !== 'number'){
			ogg_serial_number = true;
		}
		return this.init_decoder_stream(decoder, read_callback_fn, write_callback_fn, error_callback_fn, metadata_callback_fn, ogg_serial_number, client_data);
	},
	/**
	 * Encode / submit data for encoding.
	 *
	 * This version allows you to supply the input data where the channels are interleaved into a
	 * single array (i.e. channel0_sample0, channel1_sample0, ... , channelN_sample0, channel0_sample1, ...).
	 *
	 * The samples need not be block-aligned but they must be sample-aligned, i.e. the first value should be
	 * channel0_sample0 and the last value channelN_sampleM.
	 *
	 * Each sample should be a signed integer, right-justified to the resolution set by bits-per-sample.
	 *
	 * For example, if the resolution is 16 bits per sample, the samples should all be in the range [-32768,32767].
	 *
	 *
	 * For applications where channel order is important, channels must follow the order as described in the frame header.
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @param {TypedArray} buffer
	 * 				the audio data in a typed array with signed integers (and size according to the set bits-per-sample setting)
	 *
	 * @param {number} num_of_samples
	 * 				the number of samples in buffer
	 *
	 * @returns {boolean} true if successful, else false; in this case, check the encoder state with FLAC__stream_encoder_get_state() to see what went wrong.
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_encoder_process_interleaved: function(encoder, buffer, num_of_samples){
		// get the length of the data in bytes
		var numBytes = buffer.length * buffer.BYTES_PER_ELEMENT;
		// malloc enough space for the data
		var ptr = Module._malloc(numBytes);
		// get a bytes-wise view on the newly allocated buffer
		var heapBytes= new Uint8Array(Module.HEAPU8.buffer, ptr, numBytes);
		// copy data into heapBytes
		heapBytes.set(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));// issue #11 (2): do use byteOffset and byteLength for copying the data in case the underlying buffer/ArrayBuffer of the TypedArray view is larger than the TypedArray
		var status = Module.ccall('FLAC__stream_encoder_process_interleaved', 'number',
				['number', 'number', 'number'],
				[encoder, heapBytes.byteOffset, num_of_samples]
		);
		Module._free(ptr);
		return status;
	},

	/**
	 * Encode / submit data for encoding.
	 *
	 * Submit data for encoding. This version allows you to supply the input data via an array of pointers,
	 * each pointer pointing to an array of samples samples representing one channel.
	 * The samples need not be block-aligned, but each channel should have the same number of samples.
	 *
	 * Each sample should be a signed integer, right-justified to the resolution set by FLAC__stream_encoder_set_bits_per_sample().
	 * For example, if the resolution is 16 bits per sample, the samples should all be in the range [-32768,32767].
	 *
	 *
	 * For applications where channel order is important, channels must follow the order as described in the frame header.
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @param {TypedArray[]} channelBuffers
	 * 				an array for the audio data channels as typed arrays with signed integers (and size according to the set bits-per-sample setting)
	 *
	 * @param {number} num_of_samples
	 * 				the number of samples in one channel (i.e. one of the buffers)
	 *
	 * @returns {boolean} true if successful, else false; in this case, check the encoder state with FLAC__stream_encoder_get_state() to see what went wrong.
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_encoder_process: function(encoder, channelBuffers, num_of_samples){

		var ptrInfo = this._create_pointer_array(channelBuffers);
		var pointerPtr = ptrInfo.pointerPointer;

		var status = Module.ccall('FLAC__stream_encoder_process', 'number',
				['number', 'number', 'number'],
				[encoder, pointerPtr, num_of_samples]
		);

		this._destroy_pointer_array(ptrInfo);
		return status;
	},
	/**
	 * Decodes a single frame.
	 *
	 * To check decoding progress, use {@link #FLAC__stream_decoder_get_state}.
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @returns {boolean} FALSE if an error occurred
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_decoder_process_single: Module.cwrap('FLAC__stream_decoder_process_single', 'number', ['number']),

	/**
	 * Decodes data until end of stream.
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @returns {boolean} FALSE if an error occurred
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_decoder_process_until_end_of_stream: Module.cwrap('FLAC__stream_decoder_process_until_end_of_stream', 'number', ['number']),

	/**
	 * Decodes data until end of metadata.
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @returns {boolean} false if any fatal read, write, or memory allocation error occurred (meaning decoding must stop), else true.
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_decoder_process_until_end_of_metadata: Module.cwrap('FLAC__stream_decoder_process_until_end_of_metadata', 'number', ['number']),

	/**
	 * Decoder state code.
	 *
	 * @interface FLAC__StreamDecoderState
	 * @memberOf Flac
	 *
	 * @property {"FLAC__STREAM_DECODER_SEARCH_FOR_METADATA"} 		0	The decoder is ready to search for metadata
	 * @property {"FLAC__STREAM_DECODER_READ_METADATA"}  			1	The decoder is ready to or is in the process of reading metadata
	 * @property {"FLAC__STREAM_DECODER_SEARCH_FOR_FRAME_SYNC"} 	2	The decoder is ready to or is in the process of searching for the frame sync code
	 * @property {"FLAC__STREAM_DECODER_READ_FRAME"}				3	The decoder is ready to or is in the process of reading a frame
	 * @property {"FLAC__STREAM_DECODER_END_OF_STREAM"}				4	The decoder has reached the end of the stream
	 * @property {"FLAC__STREAM_DECODER_OGG_ERROR"}					5	An error occurred in the underlying Ogg layer
	 * @property {"FLAC__STREAM_DECODER_SEEK_ERROR"}				6	An error occurred while seeking. The decoder must be flushed with FLAC__stream_decoder_flush() or reset with FLAC__stream_decoder_reset() before decoding can continue
	 * @property {"FLAC__STREAM_DECODER_ABORTED"}					7	The decoder was aborted by the read callback
	 * @property {"FLAC__STREAM_DECODER_MEMORY_ALLOCATION_ERROR"}	8	An error occurred allocating memory. The decoder is in an invalid state and can no longer be used
	 * @property {"FLAC__STREAM_DECODER_UNINITIALIZED"}				9	The decoder is in the uninitialized state; one of the FLAC__stream_decoder_init_*() functions must be called before samples can be processed.
	 *
	 */
	/**
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @returns {Flac.FLAC__StreamDecoderState} the decoder state
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_decoder_get_state: Module.cwrap('FLAC__stream_decoder_get_state', 'number', ['number']),

	/**
	 * Encoder state code.
	 *
	 * @interface FLAC__StreamEncoderState
	 * @memberOf Flac
	 *
	 * @property {"FLAC__STREAM_ENCODER_OK"}								0 	The encoder is in the normal OK state and samples can be processed.
	 * @property {"FLAC__STREAM_ENCODER_UNINITIALIZED"}						1 	The encoder is in the uninitialized state; one of the FLAC__stream_encoder_init_*() functions must be called before samples can be processed.
	 * @property {"FLAC__STREAM_ENCODER_OGG_ERROR"}							2 	An error occurred in the underlying Ogg layer.
	 * @property {"FLAC__STREAM_ENCODER_VERIFY_DECODER_ERROR"}				3 	An error occurred in the underlying verify stream decoder; check FLAC__stream_encoder_get_verify_decoder_state().
	 * @property {"FLAC__STREAM_ENCODER_VERIFY_MISMATCH_IN_AUDIO_DATA"}		4 	The verify decoder detected a mismatch between the original audio signal and the decoded audio signal.
	 * @property {"FLAC__STREAM_ENCODER_CLIENT_ERROR"}						5 	One of the callbacks returned a fatal error.
	 * @property {"FLAC__STREAM_ENCODER_IO_ERROR"}							6 	An I/O error occurred while opening/reading/writing a file. Check errno.
	 * @property {"FLAC__STREAM_ENCODER_FRAMING_ERROR"}						7 	An error occurred while writing the stream; usually, the write_callback returned an error.
	 * @property {"FLAC__STREAM_ENCODER_MEMORY_ALLOCATION_ERROR"}			8 	Memory allocation failed.
	 *
	 */
	/**
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @returns {Flac.FLAC__StreamEncoderState} the encoder state
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_encoder_get_state:  Module.cwrap('FLAC__stream_encoder_get_state', 'number', ['number']),
	/**
	 * Direct the decoder to pass on all metadata blocks of type type.
	 *
	 * By default, only the STREAMINFO block is returned via the metadata callback.
	 *
	 * <p>
	 * NOTE: only use on un-initilized decoder instances!
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @param {Flac.FLAC__MetadataType} type  the metadata type to be enabled
	 *
	 * @returns {boolean} <code>false</code> if the decoder is already initialized, else <code>true</code>
	 *
	 * @memberOf Flac#
	 * @function
	 *
	 * @see Flac#FLAC__stream_decoder_set_metadata_respond_all
	 */
	FLAC__stream_decoder_set_metadata_respond: Module.cwrap('FLAC__stream_decoder_set_metadata_respond', 'number', ['number', 'number']),
	/**
	 * Direct the decoder to pass on all APPLICATION metadata blocks of the given id.
	 *
	 * By default, only the STREAMINFO block is returned via the metadata callback.
	 *
	 * <p>
	 * NOTE: only use on un-initilized decoder instances!
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @param {number} id  the ID of application metadata
	 *
	 * @returns {boolean} <code>false</code> if the decoder is already initialized, else <code>true</code>
	 *
	 * @memberOf Flac#
	 * @function
	 *
	 * @see Flac#FLAC__stream_decoder_set_metadata_respond_all
	 */
	FLAC__stream_decoder_set_metadata_respond_application: Module.cwrap('FLAC__stream_decoder_set_metadata_respond_application', 'number', ['number', 'number']),// (FLAC__StreamDecoder *decoder, const FLAC__byte id[4])
	/**
	 * Direct the decoder to pass on all metadata blocks of any type.
	 *
	 * By default, only the STREAMINFO block is returned via the metadata callback.
	 *
	 * <p>
	 * NOTE: only use on un-initilized decoder instances!
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @returns {boolean} <code>false</code> if the decoder is already initialized, else <code>true</code>
	 *
	 * @memberOf Flac#
	 * @function
	 *
	 * @see Flac#FLAC__stream_decoder_set_metadata_ignore_all
	 * @see Flac#FLAC__stream_decoder_set_metadata_respond_application
	 * @see Flac#FLAC__stream_decoder_set_metadata_respond
	 */
	FLAC__stream_decoder_set_metadata_respond_all: Module.cwrap('FLAC__stream_decoder_set_metadata_respond_all', 'number', ['number']),// (FLAC__StreamDecoder *decoder)
	/**
	 * Direct the decoder to filter out all metadata blocks of type type.
	 *
	 * By default, only the STREAMINFO block is returned via the metadata callback.
	 *
	 * <p>
	 * NOTE: only use on un-initilized decoder instances!
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @param {Flac.FLAC__MetadataType} type  the metadata type to be ignored
	 *
	 * @returns {boolean} <code>false</code> if the decoder is already initialized, else <code>true</code>
	 *
	 * @memberOf Flac#
	 * @function
	 *
	 * @see Flac#FLAC__stream_decoder_set_metadata_ignore_all
	 */
	FLAC__stream_decoder_set_metadata_ignore: Module.cwrap('FLAC__stream_decoder_set_metadata_ignore', 'number', ['number', 'number']),// (FLAC__StreamDecoder *decoder, FLAC__MetadataType type)
	/**
	 * Direct the decoder to filter out all APPLICATION metadata blocks of the given id.
	 *
	 * By default, only the STREAMINFO block is returned via the metadata callback.
	 *
	 * <p>
	 * NOTE: only use on un-initilized decoder instances!
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @param {number} id  the ID of application metadata
	 *
	 * @returns {boolean} <code>false</code> if the decoder is already initialized, else <code>true</code>
	 *
	 * @memberOf Flac#
	 * @function
	 *
	 * @see Flac#FLAC__stream_decoder_set_metadata_ignore_all
	 */
	FLAC__stream_decoder_set_metadata_ignore_application: Module.cwrap('FLAC__stream_decoder_set_metadata_ignore_application', 'number', ['number', 'number']),// (FLAC__StreamDecoder *decoder, const FLAC__byte id[4])
	/**
	 * Direct the decoder to filter out all metadata blocks of any type.
	 *
	 * By default, only the STREAMINFO block is returned via the metadata callback.
	 *
	 * <p>
	 * NOTE: only use on un-initilized decoder instances!
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @returns {boolean} <code>false</code> if the decoder is already initialized, else <code>true</code>
	 *
	 * @memberOf Flac#
	 * @function
	 *
	 * @see Flac#FLAC__stream_decoder_set_metadata_respond_all
	 * @see Flac#FLAC__stream_decoder_set_metadata_ignore
	 * @see Flac#FLAC__stream_decoder_set_metadata_ignore_application
	 */
	FLAC__stream_decoder_set_metadata_ignore_all: Module.cwrap('FLAC__stream_decoder_set_metadata_ignore_all', 'number', ['number']),// (FLAC__StreamDecoder *decoder)
	/**
	 * Set the metadata blocks to be emitted to the stream before encoding. A value of NULL, 0 implies no metadata; otherwise, supply an array of pointers to metadata blocks.
	 * The array is non-const since the encoder may need to change the is_last flag inside them, and in some cases update seek point offsets. Otherwise, the encoder
	 * will not modify or free the blocks. It is up to the caller to free the metadata blocks after encoding finishes.
	 *
	 * <p>
	 *     The encoder stores only copies of the pointers in the metadata array; the metadata blocks themselves must survive at least until after FLAC__stream_encoder_finish() returns.
	 *     Do not free the blocks until then.
	 *
	 *     The STREAMINFO block is always written and no STREAMINFO block may occur in the supplied array.
	 *
	 *     By default the encoder does not create a SEEKTABLE. If one is supplied in the metadata array, but the client has specified that it does not support seeking,
	 *     then the SEEKTABLE will be written verbatim. However by itself this is not very useful as the client will not know the stream offsets for the seekpoints ahead of time.
	 *     In order to get a proper seektable the client must support seeking. See next note.
	 *
	 *     SEEKTABLE blocks are handled specially. Since you will not know the values for the seek point stream offsets, you should pass in a SEEKTABLE 'template', that is,
	 *     a SEEKTABLE object with the required sample numbers (or placeholder points), with 0 for the frame_samples and stream_offset fields for each point.
	 *     If the client has specified that it supports seeking by providing a seek callback to FLAC__stream_encoder_init_stream() or both seek AND read callback to
	 *      FLAC__stream_encoder_init_ogg_stream() (or by using FLAC__stream_encoder_init*_file() or FLAC__stream_encoder_init*_FILE()), then while it is encoding the encoder will
	 *      fill the stream offsets in for you and when encoding is finished, it will seek back and write the real values into the SEEKTABLE block in the stream. There are helper
	 *      routines for manipulating seektable template blocks; see metadata.h: FLAC__metadata_object_seektable_template_*(). If the client does not support seeking,
	 *      the SEEKTABLE will have inaccurate offsets which will slow down or remove the ability to seek in the FLAC stream.
	 *
	 *     The encoder instance will modify the first SEEKTABLE block as it transforms the template to a valid seektable while encoding, but it is still up to the caller to free
	 *     all metadata blocks after encoding.
	 *
	 *     A VORBIS_COMMENT block may be supplied. The vendor string in it will be ignored. libFLAC will use it's own vendor string. libFLAC will not modify the passed-in
	 *     VORBIS_COMMENT's vendor string, it will simply write it's own into the stream. If no VORBIS_COMMENT block is present in the metadata array, libFLAC will write an
	 *     empty one, containing only the vendor string.
	 *
	 *     The Ogg FLAC mapping requires that the VORBIS_COMMENT block be the second metadata block of the stream. The encoder already supplies the STREAMINFO block automatically.
	 *
	 *     If metadata does not contain a VORBIS_COMMENT block, the encoder will supply that too. Otherwise, if metadata does contain a VORBIS_COMMENT block and it is not the first,
	 *     the init function will reorder metadata by moving the VORBIS_COMMENT block to the front; the relative ordering of the other blocks will remain as they were.
	 *
	 *     The Ogg FLAC mapping limits the number of metadata blocks per stream to 65535. If num_blocks exceeds this the function will return false.
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @param {Flac.PointerInfo} metadataBuffersPointer
	 *
	 * @param {number} num_blocks
	 *
	 * @returns {boolean} <code>false</code> if the encoder is already initialized, else <code>true</code>. <code>false</code> if the encoder is already initialized, or if num_blocks > 65535 if encoding to Ogg FLAC, else true.
	 *
	 * @memberOf Flac#
	 * @function
	 *
	 * @see Flac.FLAC__MetadataType
	 * @see Flac#_create_pointer_array
	 * @see Flac#_destroy_pointer_array
	 */
	FLAC__stream_encoder_set_metadata: function(encoder, metadataBuffersPointer, num_blocks){// ( FLAC__StreamEncoder *  encoder, FLAC__StreamMetadata **  metadata, unsigned  num_blocks)
		var status = Module.ccall('FLAC__stream_encoder_set_metadata', 'number',
				['number', 'number', 'number'],
				[encoder, metadataBuffersPointer.pointerPointer, num_blocks]
		);
		return status;
	},
	/**
	 * Helper object for allocating an array of buffers on the (memory) heap.
	 *
	 * @interface PointerInfo
	 * @memberOf Flac
	 * @property {number}  pointerPointer pointer to the array of (pointer) buffers
	 * @property {number[]}  dataPointer array of pointers to the allocated data arrays (i.e. buffers)
	 *
	 * @see Flac#_create_pointer_array
	 * @see Flac#_destroy_pointer_array
	 */
	/**
	 * Helper function for creating pointer (and allocating the data) to an array of buffers on the (memory) heap.
	 *
	 * Use the returned <code>PointerInfo.dataPointer</code> as argument, where the array-pointer is required.
	 *
	 * NOTE: afer use, the allocated buffers on the heap need be freed, see {@link #_destroy_pointer_array}.
	 *
	 * @param {Uint8Array[]} bufferArray
	 * 						the buffer for which to create
	 *
	 * @returns {Flac.PointerInfo} <code>false</code> if the decoder is already initialized, else <code>true</code>
	 *
	 * @memberOf Flac#
	 * @function
	 *
	 * @see Flac#_destroy_pointer_array
	 */
	_create_pointer_array: function(bufferArray){
		var size=bufferArray.length;
		var ptrs = [], ptrData = new Uint32Array(size);
		var ptrOffsets = new DataView(ptrData.buffer);
		var buffer, numBytes, heapBytes, ptr;
		for(var i=0, size; i < size; ++i){
			buffer = bufferArray[i];
			// get the length of the data in bytes
			numBytes = buffer.length * buffer.BYTES_PER_ELEMENT;
			// malloc enough space for the data
			ptr = Module._malloc(numBytes);
			ptrs.push(ptr);
			// get a bytes-wise view on the newly allocated buffer
			heapBytes = new Uint8Array(Module.HEAPU8.buffer, ptr, numBytes);
			// copy data into heapBytes
			heapBytes.set(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));// use FIX for issue #11 (2)
			ptrOffsets.setUint32(i*4, ptr, true);
		}
		var nPointerBytes = ptrData.length * ptrData.BYTES_PER_ELEMENT
		var pointerPtr = Module._malloc(nPointerBytes);
		var pointerHeap = new Uint8Array(Module.HEAPU8.buffer, pointerPtr, nPointerBytes);
		pointerHeap.set( new Uint8Array(ptrData.buffer) );

		return {
			dataPointer: ptrs,
			pointerPointer: pointerPtr
		};
	},
	/**
	 * Helper function for destroying/freeing a previously created pointer (and allocating the data) of an array of buffers on the (memory) heap.
	 *
	 * @param {Flac.PointerInfo} pointerInfo
	 * 						the pointer / allocation information that should be destroyed/freed
	 *
	 *
	 * @memberOf Flac#
	 * @function
	 *
	 * @see Flac#_create_pointer_array
	 */
	_destroy_pointer_array: function(pointerInfo){
		var pointerArray = pointerInfo.dataPointer;
		for(var i=0, size=pointerArray.length; i < size; ++i){
			Module._free(pointerArray[i]);
		}
		Module._free(pointerInfo.pointerPointer);
	},
	/**
	 * Get if MD5 verification is enabled for the decoder
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @returns {boolean} <code>true</code> if MD5 verification is enabled
	 *
	 * @memberOf Flac#
	 * @function
	 *
	 * @see #FLAC__stream_decoder_set_md5_checking
	 */
	FLAC__stream_decoder_get_md5_checking: Module.cwrap('FLAC__stream_decoder_get_md5_checking', 'number', ['number']),

	/**
	 * Set the "MD5 signature checking" flag. If true, the decoder will compute the MD5 signature of the unencoded audio data while decoding and compare it to the signature from the STREAMINFO block,
	 * if it exists, during {@link Flac.FLAC__stream_decoder_finish FLAC__stream_decoder_finish()}.
	 *
	 * MD5 signature checking will be turned off (until the next {@link Flac.FLAC__stream_decoder_reset FLAC__stream_decoder_reset()}) if there is no signature in the STREAMINFO block or when a seek is attempted.
	 *
	 * Clients that do not use the MD5 check should leave this off to speed up decoding.
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 * @param {boolean} is_verify
	 * 				enable/disable checksum verification during decoding
	 * @returns {boolean} FALSE if the decoder is already initialized, else TRUE.
	 *
	 * @memberOf Flac#
	 * @function
	 *
	 * @see #FLAC__stream_decoder_get_md5_checking
	 */
	FLAC__stream_decoder_set_md5_checking: function(decoder, is_verify){
		is_verify = is_verify? 1 : 0;
		return Module.ccall('FLAC__stream_decoder_set_md5_checking', 'number', ['number', 'number'], [ decoder, is_verify ]);
	},

	/**
	 * Finish the encoding process.
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @returns {boolean} <code>false</code> if an error occurred processing the last frame;
	 * 					 or if verify mode is set, there was a verify mismatch; else <code>true</code>.
	 * 					 If <code>false</code>, caller should check the state with {@link Flac#FLAC__stream_encoder_get_state}
	 * 					 for more information about the error.
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_encoder_finish: Module.cwrap('FLAC__stream_encoder_finish', 'number', [ 'number' ]),
	/**
	 * Finish the decoding process.
	 *
	 * The decoder can be reused, after initializing it again.
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @returns {boolean} <code>false</code> if MD5 checking is on AND a STREAMINFO block was available AND the MD5 signature in
	 * 						 the STREAMINFO block was non-zero AND the signature does not match the one computed by the decoder;
	 * 						 else <code>true</code>.
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_decoder_finish: Module.cwrap('FLAC__stream_decoder_finish', 'number', [ 'number' ]),
	/**
	 * Reset the decoder for reuse.
	 *
	 * <p>
	 * NOTE: Needs to be re-initialized, before it can be used again
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @returns {boolean} true if successful
	 *
	 * @see #init_decoder_stream
	 * @see #init_decoder_ogg_stream
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_decoder_reset: Module.cwrap('FLAC__stream_decoder_reset', 'number', [ 'number' ]),
	/**
	 * Delete the encoder instance, and free up its resources.
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_encoder_delete: function(encoder){
		this._clear_enc_cb(encoder);//<- remove callback references
		Module.ccall('FLAC__stream_encoder_delete', 'number', [ 'number' ], [encoder]);
		do_fire_event('destroyed', [{type: 'destroyed', target: {id: encoder, type: 'encoder'}}], false);
	},
	/**
	 * Delete the decoder instance, and free up its resources.
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_decoder_delete: function(decoder){
		this._clear_dec_cb(decoder);//<- remove callback references
		Module.ccall('FLAC__stream_decoder_delete', 'number', [ 'number' ], [decoder]);
		do_fire_event('destroyed', [{type: 'destroyed', target: {id: decoder, type: 'decoder'}}], false);
	}

};//END: var _exported = {

//if Properties are supported by JS execution environment:
// support "immediate triggering" onready function, if library is already initialized when setting onready callback
if(typeof Object.defineProperty === 'function'){
	//add internal field for storing onready callback:
	_exported._onready = void(0);
	//define getter & define setter with "immediate trigger" functionality:
	Object.defineProperty(_exported, 'onready', {
		get() { return this._onready; },
		set(newValue) {
			this._onready = newValue;
			if(newValue && this.isReady()){
				check_and_trigger_persisted_event('ready', newValue);
			}
		}
	});
} else {
	//if Properties are NOTE supported by JS execution environment:
	// pring usage warning for onready hook instead
	console.warn('WARN: note that setting Flac.onready handler after Flac.isReady() is already true, will have no effect, that is, the handler function will not be triggered!');
}

if(expLib && expLib.exports){
	expLib.exports = _exported;
}
return _exported;

}));//END: UMD wrapper
// end include: /home/tema/libflac.js/libflac_post.js

