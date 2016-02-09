(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else {
		var a = factory();
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(this, function() {

	return  (function(modules) { // webpackBootstrap
	 	// The module cache
	 	var installedModules = {};

	 	// The require function
	 	function __webpack_require__(moduleId) {

	 		// Check if module is in cache
	 		if(installedModules[moduleId])
	 			return installedModules[moduleId].exports;

	 		// Create a new module (and put it into the cache)
	 		var module = installedModules[moduleId] = {
	 			exports: {},
	 			id: moduleId,
	 			loaded: false
	 		};

	 		// Execute the module function
	 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

	 		// Flag the module as loaded
	 		module.loaded = true;

	 		// Return the exports of the module
	 		return module.exports;
	 	}


	 	// expose the modules object (__webpack_modules__)
	 	__webpack_require__.m = modules;

	 	// expose the module cache
	 	__webpack_require__.c = installedModules;

	 	// __webpack_public_path__
	 	__webpack_require__.p = "";

	 	// Load entry module and return exports
	 	return __webpack_require__(0);
	})([
	/* 0 */
	function(module, exports, __webpack_require__) {

		var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// Main type inference engine
		
		// Walks an AST, building up a graph of abstract values and constraints
		// that cause types to flow from one node to another. Also defines a
		// number of utilities for accessing ASTs and scopes.
		
		// Analysis is done in a context, which is tracked by the dynamically
		// bound cx variable. Use withContext to set the current context.
		
		// For memory-saving reasons, individual types export an interface
		// similar to abstract values (which can hold multiple types), and can
		// thus be used in place abstract values that only ever contain a
		// single type.
		/* eslint-disable  */
		(function(root, mod) {
		  if (true) // CommonJS
		    return mod(exports, __webpack_require__(1), __webpack_require__(2),
		               __webpack_require__(3), __webpack_require__(4), __webpack_require__(5));
		})(this, function(exports, acorn, walk, def, signal, Util) {
		  "use strict";
		
		  var toString = exports.toString = function(type, maxDepth, parent) {
		    if (!type || type == parent || maxDepth && maxDepth < -3) return "?";
		    return type.toString(maxDepth, parent);
		  };
		
		  // A variant of AVal used for unknown, dead-end values. Also serves
		  // as prototype for AVals, Types, and Constraints because it
		  // implements 'empty' versions of all the methods that the code
		  // expects.
		  var ANull = exports.ANull = signal.mixin({
		    addType: function() {},
		    propagate: function() {},
		    getProp: function() { return ANull; },
		    forAllProps: function() {},
		    hasType: function() { return false; },
		    isEmpty: function() { return true; },
		    getFunctionType: function() {},
		    getObjType: function() {},
		    getType: function() {},
		    gatherProperties: function() {},
		    propagatesTo: function() {},
		    typeHint: function() {},
		    propHint: function() {},
		    toString: function() { return "?"; }
		  });
		
		  function extend(proto, props) {
		    var obj = Object.create(proto);
		    if (props) for (var prop in props) obj[prop] = props[prop];
		    return obj;
		  }
		
		  // ABSTRACT VALUES
		
		  var WG_DEFAULT = 100, WG_NEW_INSTANCE = 90, WG_MADEUP_PROTO = 10, WG_MULTI_MEMBER = 5,
		      WG_CATCH_ERROR = 5, WG_GLOBAL_THIS = 90, WG_SPECULATIVE_THIS = 2;
		
		  var AVal = exports.AVal = function() {
		    this.types = [];
		    this.forward = null;
		    this.maxWeight = 0;
		  };
		  AVal.prototype = extend(ANull, {
		    addType: function(type, weight) {
		      weight = weight || WG_DEFAULT;
		      if (this.maxWeight < weight) {
		        this.maxWeight = weight;
		        if (this.types.length == 1 && this.types[0] == type) return;
		        this.types.length = 0;
		      } else if (this.maxWeight > weight || this.types.indexOf(type) > -1) {
		        return;
		      }
		
		      this.signal("addType", type);
		      this.types.push(type);
		      var forward = this.forward;
		      if (forward) withWorklist(function(add) {
		        for (var i = 0; i < forward.length; ++i) add(type, forward[i], weight);
		      });
		    },
		
		    propagate: function(target, weight) {
		      if (target == ANull || (target instanceof Type && this.forward && this.forward.length > 2)) return;
		      if (weight && weight != WG_DEFAULT) target = new Muffle(target, weight);
		      (this.forward || (this.forward = [])).push(target);
		      var types = this.types;
		      if (types.length) withWorklist(function(add) {
		        for (var i = 0; i < types.length; ++i) add(types[i], target, weight);
		      });
		    },
		
		    getProp: function(prop) {
		      if (prop == "__proto__" || prop == "✖") return ANull;
		      var found = (this.props || (this.props = Object.create(null)))[prop];
		      if (!found) {
		        found = this.props[prop] = new AVal;
		        this.propagate(new PropIsSubset(prop, found));
		      }
		      return found;
		    },
		
		    forAllProps: function(c) {
		      this.propagate(new ForAllProps(c));
		    },
		
		    hasType: function(type) {
		      return this.types.indexOf(type) > -1;
		    },

		    isEmpty: function() { return this.types.length === 0; },

		    getFunctionType: function() {
		      for (var i = this.types.length - 1; i >= 0; --i)
		        if (this.types[i] instanceof Fn) return this.types[i];
		    },

		    getObjType: function() {
		      var seen = null;
		      for (var i = this.types.length - 1; i >= 0; --i) {
		        var type = this.types[i];
		        if (!(type instanceof Obj)) continue;
		        if (type.name) return type;
		        if (!seen) seen = type;
		      }
		      return seen;
		    },
		
		    getType: function(guess) {
		      if (this.types.length === 0 && guess !== false) return this.makeupType();
		      if (this.types.length === 1) return this.types[0];
		      return canonicalType(this.types);
		    },
		
		    toString: function(maxDepth, parent) {
		      if (this.types.length == 0) return toString(this.makeupType(), maxDepth, parent);
		      if (this.types.length == 1) return toString(this.types[0], maxDepth, parent);
		      var simplified = simplifyTypes(this.types);
		      if (simplified.length > 2) return "?";
		      return simplified.map(function(tp) { return toString(tp, maxDepth, parent); }).join("|");
		    },
		
		    computedPropType: function() {
		      if (!this.propertyOf) return null;
		      if (this.propertyOf.hasProp("<i>")) {
		        var computedProp = this.propertyOf.getProp("<i>");
		        if (computedProp == this) return null;
		        return computedProp.getType();
		      } else if (this.propertyOf.maybeProps && this.propertyOf.maybeProps["<i>"] == this) {
		        for (var prop in this.propertyOf.props) {
		          var val = this.propertyOf.props[prop];
		          if (!val.isEmpty()) return val;
		        }
		        return null;
		      }
		    },
		
		    makeupType: function() {
		      var computed = this.computedPropType();
		      if (computed) return computed;
		
		      if (!this.forward) return null;
		      for (var i = this.forward.length - 1; i >= 0; --i) {
		        var hint = this.forward[i].typeHint();
		        if (hint && !hint.isEmpty()) {guessing = true; return hint;}
		      }
		
		      var props = Object.create(null), foundProp = null;
		      for (var i = 0; i < this.forward.length; ++i) {
		        var prop = this.forward[i].propHint();
		        if (prop && prop != "length" && prop != "<i>" && prop != "✖" && prop != cx.completingProperty) {
		          props[prop] = true;
		          foundProp = prop;
		        }
		      }
		      if (!foundProp) return null;
		
		      var objs = objsWithProp(foundProp);
		      if (objs) {
		        var matches = [];
		        search: for (var i = 0; i < objs.length; ++i) {
		          var obj = objs[i];
		          for (var prop in props) if (!obj.hasProp(prop)) continue search;
		          if (obj.hasCtor) obj = getInstance(obj);
		          matches.push(obj);
		        }
		        var canon = canonicalType(matches);
		        if (canon) {
		        		guessing = true;
		        		if (matches.length > 0) {
		        			canon.potentialMatches = matches; //ORION
		        		}
		        		return canon;
		        	}
		      }
		    },
		
		    typeHint: function() { return this.types.length ? this.getType() : null; },

		    propagatesTo: function() { return this; },
		
		    gatherProperties: function(f, depth) {
		      for (var i = 0; i < this.types.length; ++i)
		        this.types[i].gatherProperties(f, depth);
		    },
		
		    guessProperties: function(f) {
		      if (this.forward) for (var i = 0; i < this.forward.length; ++i) {
		        var prop = this.forward[i].propHint();
		        if (prop) f(prop, null, 0);
		      }
		      var guessed = this.makeupType();
		      if (guessed) guessed.gatherProperties(f);
		    }
		  });
		
		  function similarAVal(a, b, depth) {
		    var typeA = a.getType(false), typeB = b.getType(false);
		    if (!typeA || !typeB) return true;
		    return similarType(typeA, typeB, depth);
		  }
		
		  function similarType(a, b, depth) {
		    if (!a || depth >= 5) return b;
		    if (!a || a == b) return a;
		    if (!b) return a;
		    if (a.constructor != b.constructor) return false;
		    if (a.constructor == Arr) {
		      var innerA = a.getProp("<i>").getType(false);
		      if (!innerA) return b;
		      var innerB = b.getProp("<i>").getType(false);
		      if (!innerB || similarType(innerA, innerB, depth + 1)) return b;
		    } else if (a.constructor == Obj) {
		      var propsA = 0, propsB = 0, same = 0;
		      for (var prop in a.props) {
		        propsA++;
		        if (prop in b.props && similarAVal(a.props[prop], b.props[prop], depth + 1))
		          same++;
		      }
		      for (var prop in b.props) propsB++;
		      if (propsA && propsB && same < Math.max(propsA, propsB) / 2) return false;
		      return propsA > propsB ? a : b;
		    } else if (a.constructor == Fn) {
		      if (a.args.length != b.args.length ||
		          !a.args.every(function(tp, i) { return similarAVal(tp, b.args[i], depth + 1); }) ||
		          !similarAVal(a.retval, b.retval, depth + 1) || !similarAVal(a.self, b.self, depth + 1))
		        return false;
		      return a;
		    } else {
		      return false;
		    }
		  }
		
		  var simplifyTypes = exports.simplifyTypes = function(types) {
		    var found = [];
		    outer: for (var i = 0; i < types.length; ++i) {
		      var tp = types[i];
		      for (var j = 0; j < found.length; j++) {
		        var similar = similarType(tp, found[j], 0);
		        if (similar) {
		          found[j] = similar;
		          continue outer;
		        }
		      }
		      found.push(tp);
		    }
		    return found;
		  };
		
		  function canonicalType(types) {
		    var arrays = 0, fns = 0, objs = 0, prim = null;
		    for (var i = 0; i < types.length; ++i) {
		      var tp = types[i];
		      if (tp instanceof Arr) ++arrays;
		      else if (tp instanceof Fn) ++fns;
		      else if (tp instanceof Obj) ++objs;
		      else if (tp instanceof Prim) {
		        if (prim && tp.name != prim.name) return null;
		        prim = tp;
		      }
		    }
		    var kinds = (arrays && 1) + (fns && 1) + (objs && 1) + (prim && 1);
		    if (kinds > 1) return null;
		    if (prim) return prim;
		
		    var maxScore = 0, maxTp = null;
		    for (var i = 0; i < types.length; ++i) {
		      var tp = types[i], score = 0;
		      if (arrays) {
		        score = tp.getProp("<i>").isEmpty() ? 1 : 2;
		      } else if (fns) {
		        score = 1;
		        for (var j = 0; j < tp.args.length; ++j) if (!tp.args[j].isEmpty()) ++score;
		        if (!tp.retval.isEmpty()) ++score;
		      } else if (objs) {
		        score = tp.name ? 100 : 2;
		      }
		      if (score >= maxScore) { maxScore = score; maxTp = tp; }
		    }
		    return maxTp;
		  }
		
		  // PROPAGATION STRATEGIES
		
		  var constraint = exports.constraint = function(methods) {
		    var ctor = function() {
		      this.origin = cx.curOrigin;
		      this.construct.apply(this, arguments);
		    };
		    ctor.prototype = Object.create(ANull);
		    for (var m in methods) if (methods.hasOwnProperty(m)) ctor.prototype[m] = methods[m];
		    return ctor;
		  };
		
		  var PropIsSubset = constraint({
		    construct: function(prop, target) {
		      this.prop = prop; this.target = target;
		    },
		    addType: function(type, weight) {
		      if (type.getProp)
		        type.getProp(this.prop).propagate(this.target, weight);
		    },
		    propHint: function() { return this.prop; },
		    propagatesTo: function() {
		      if (this.prop == "<i>" || !/[^\w_]/.test(this.prop))
		        return {target: this.target, pathExt: "." + this.prop};
		    }
		  });
		
		  var PropHasSubset = exports.PropHasSubset = constraint({
		    construct: function(prop, type, originNode) {
		      this.prop = prop; this.type = type; this.originNode = originNode;
		    },
		    addType: function(type, weight) {
		      if (!(type instanceof Obj)) return;
		      var prop = type.defProp(this.prop, this.originNode);
		      if (!prop.origin) prop.origin = this.origin;
		      this.type.propagate(prop, weight);
		    },
		    propHint: function() { return this.prop; }
		  });
		
		  var ForAllProps = constraint({
		    construct: function(c) { this.c = c; },
		    addType: function(type) {
		      if (!(type instanceof Obj)) return;
		      type.forAllProps(this.c);
		    }
		  });
		
		  function withDisabledComputing(fn, body) {
		    cx.disabledComputing = {fn: fn, prev: cx.disabledComputing};
		    try {
		      return body();
		    } finally {
		      cx.disabledComputing = cx.disabledComputing.prev;
		    }
		  }
		  var IsCallee = exports.IsCallee = constraint({
		    construct: function(self, args, argNodes, retval) {
		      this.self = self; this.args = args; this.argNodes = argNodes; this.retval = retval;
		      this.disabled = cx.disabledComputing;
		    },
		    addType: function(fn, weight) {
		      if (!(fn instanceof Fn)) return;
		      for (var i = 0; i < this.args.length; ++i) {
		        if (i < fn.args.length) this.args[i].propagate(fn.args[i], weight);
		        if (fn.arguments) this.args[i].propagate(fn.arguments, weight);
		      }
		      this.self.propagate(fn.self, this.self == cx.topScope ? WG_GLOBAL_THIS : weight);
		      var compute = fn.computeRet;
		      if (compute) for (var d = this.disabled; d; d = d.prev)
		        if (d.fn == fn || fn.originNode && d.fn.originNode == fn.originNode) compute = null;
		      if (compute)
		        compute(this.self, this.args, this.argNodes).propagate(this.retval, weight);
		      else
		        fn.retval.propagate(this.retval, weight);
		    },
		    typeHint: function() {
		      var names = [];
		      for (var i = 0; i < this.args.length; ++i) names.push("?");
		      return new Fn(null, this.self, this.args, names, ANull);
		    },
		    propagatesTo: function() {
		      return {target: this.retval, pathExt: ".!ret"};
		    }
		  });
		
		  var HasMethodCall = constraint({
		    construct: function(propName, args, argNodes, retval) {
		      this.propName = propName; this.args = args; this.argNodes = argNodes; this.retval = retval;
		      this.disabled = cx.disabledComputing;
		    },
		    addType: function(obj, weight) {
		      var callee = new IsCallee(obj, this.args, this.argNodes, this.retval);
		      callee.disabled = this.disabled;
		      obj.getProp(this.propName).propagate(callee, weight);
		    },
		    propHint: function() { return this.propName; }
		  });
		
		  var IsCtor = exports.IsCtor = constraint({
		    construct: function(target, noReuse) {
		      this.target = target; this.noReuse = noReuse;
		    },
		    addType: function(f, weight) {
		      if (!(f instanceof Fn)) return;
		      if (cx.parent && !cx.parent.options.reuseInstances) this.noReuse = true;
		      f.getProp("prototype").propagate(new IsProto(this.noReuse ? false : f, this.target), weight);
		    }
		  });
		
		  var getInstance = exports.getInstance = function(obj, ctor) {
		    if (ctor === false) return new Obj(obj);
		
		    if (!ctor) ctor = obj.hasCtor;
		    if (!obj.instances) obj.instances = [];
		    for (var i = 0; i < obj.instances.length; ++i) {
		      var cur = obj.instances[i];
		      if (cur.ctor == ctor) return cur.instance;
		    }
		    var instance = new Obj(obj, ctor && ctor.name);
		    instance.origin = obj.origin;
		    obj.instances.push({ctor: ctor, instance: instance});
		    return instance;
		  };
		
		  var IsProto = exports.IsProto = constraint({
		    construct: function(ctor, target) {
		      this.ctor = ctor; this.target = target;
		    },
		    addType: function(o, _weight) {
		      if (!(o instanceof Obj)) return;
		      if ((this.count = (this.count || 0) + 1) > 8) return;
		      if (o == cx.protos.Array)
		        this.target.addType(new Arr);
		      else
		        this.target.addType(getInstance(o, this.ctor));
		    }
		  });
		
		  var FnPrototype = constraint({
		    construct: function(fn) { this.fn = fn; },
		    addType: function(o, _weight) {
		      if (o instanceof Obj && !o.hasCtor) {
		        o.hasCtor = this.fn;
		        var adder = new SpeculativeThis(o, this.fn);
		        adder.addType(this.fn);
		        o.forAllProps(function(_prop, val, local) {
		          if (local) val.propagate(adder);
		        });
		      }
		    }
		  });
		
		  var IsAdded = constraint({
		    construct: function(other, target) {
		      this.other = other; this.target = target;
		    },
		    addType: function(type, weight) {
		      if (type == cx.str)
		        this.target.addType(cx.str, weight);
		      else if (type == cx.num && this.other.hasType(cx.num))
		        this.target.addType(cx.num, weight);
		    },
		    typeHint: function() { return this.other; }
		  });
		
		  var IfObj = exports.IfObj = constraint({
		    construct: function(target) { this.target = target; },
		    addType: function(t, weight) {
		      if (t instanceof Obj) this.target.addType(t, weight);
		    },
		    propagatesTo: function() { return this.target; }
		  });
		
		  var SpeculativeThis = constraint({
		    construct: function(obj, ctor) { this.obj = obj; this.ctor = ctor; },
		    addType: function(tp) {
		      if (tp instanceof Fn && tp.self && tp.self.isEmpty())
		        tp.self.addType(getInstance(this.obj, this.ctor), WG_SPECULATIVE_THIS);
		    }
		  });
		
		  var Muffle = constraint({
		    construct: function(inner, weight) {
		      this.inner = inner; this.weight = weight;
		    },
		    addType: function(tp, weight) {
		      this.inner.addType(tp, Math.min(weight, this.weight));
		    },
		    propagatesTo: function() { return this.inner.propagatesTo(); },
		    typeHint: function() { return this.inner.typeHint(); },
		    propHint: function() { return this.inner.propHint(); }
		  });
		
		  // TYPE OBJECTS
		
		  var Type = exports.Type = function() {};
		  Type.prototype = extend(ANull, {
		    constructor: Type,
		    propagate: function(c, w) { c.addType(this, w); },
		    hasType: function(other) { return other == this; },
		    isEmpty: function() { return false; },
		    typeHint: function() { return this; },
		    getType: function() { return this; }
		  });
		
		  var Prim = exports.Prim = function(proto, name) { this.name = name; this.proto = proto; };
		  Prim.prototype = extend(Type.prototype, {
		    constructor: Prim,
		    toString: function() { return this.name; },
		    getProp: function(prop) {return this.proto.hasProp(prop) || ANull;},
		    gatherProperties: function(f, depth) {
		      if (this.proto) this.proto.gatherProperties(f, depth);
		    }
		  });
		
		  var Obj = exports.Obj = function(proto, name) {
		    if (!this.props) this.props = Object.create(null);
		    this.proto = proto === true ? cx.protos.Object : proto;
		    if (proto && !name && proto.name && !(this instanceof Fn)) {
		      var match = /^(.*)\.prototype$/.exec(this.proto.name);
		      if (match) name = match[1];
		    }
		    this.name = name;
		    this.maybeProps = null;
		    this.origin = cx.curOrigin;
		  };
		  Obj.prototype = extend(Type.prototype, {
		    constructor: Obj,
		    toString: function(maxDepth) {
		      if (maxDepth == null) maxDepth = 0;
		      if (maxDepth <= 0 && this.name) return this.name;
		      var props = [], etc = false;
		      for (var prop in this.props) if (prop != "<i>") {
		        if (props.length > 5) { etc = true; break; }
		        if (maxDepth)
		          props.push(prop + ": " + toString(this.props[prop], maxDepth - 1, this));
		        else
		          props.push(prop);
		      }
		      props.sort();
		      if (etc) props.push("...");
		      return "{" + props.join(", ") + "}";
		    },
		    hasProp: function(prop, searchProto) {
		      var found = this.props[prop];
		      if (searchProto !== false)
		        for (var p = this.proto; p && !found; p = p.proto) found = p.props[prop];
		      return found;
		    },
		    defProp: function(prop, originNode) {
		      var found = this.hasProp(prop, false);
		      if (found) {
		        if (originNode && !found.originNode) found.originNode = originNode;
		        return found;
		      }
		      if (prop == "__proto__" || prop == "✖") return ANull;
		
		      var av = this.maybeProps && this.maybeProps[prop];
		      if (av) {
		        delete this.maybeProps[prop];
		        this.maybeUnregProtoPropHandler();
		      } else {
		        av = new AVal;
		        av.propertyOf = this;
		      }
		
		      this.props[prop] = av;
		      av.originNode = originNode;
		      av.origin = cx.curOrigin;
		      this.broadcastProp(prop, av, true);
		      return av;
		    },
		    getProp: function(prop) {
		      var found = this.hasProp(prop, true) || (this.maybeProps && this.maybeProps[prop]);
		      if (found) return found;
		      if (prop == "__proto__" || prop == "✖") return ANull;
		      var av = this.ensureMaybeProps()[prop] = new AVal;
		      av.propertyOf = this;
		      return av;
		    },
		    broadcastProp: function(prop, val, local) {
		      if (local) {
		        this.signal("addProp", prop, val);
		        // If this is a scope, it shouldn't be registered
		        if (!(this instanceof Scope)) registerProp(prop, this);
		      }
		
		      if (this.onNewProp) for (var i = 0; i < this.onNewProp.length; ++i) {
		        var h = this.onNewProp[i];
		        h.onProtoProp ? h.onProtoProp(prop, val, local) : h(prop, val, local);
		      }
		    },
		    onProtoProp: function(prop, val, _local) {
		      var maybe = this.maybeProps && this.maybeProps[prop];
		      if (maybe) {
		        delete this.maybeProps[prop];
		        this.maybeUnregProtoPropHandler();
		        this.proto.getProp(prop).propagate(maybe);
		      }
		      this.broadcastProp(prop, val, false);
		    },
		    ensureMaybeProps: function() {
		      if (!this.maybeProps) {
		        if (this.proto) this.proto.forAllProps(this);
		        this.maybeProps = Object.create(null);
		      }
		      return this.maybeProps;
		    },
		    removeProp: function(prop) {
		      var av = this.props[prop];
		      delete this.props[prop];
		      this.ensureMaybeProps()[prop] = av;
		      av.types.length = 0;
		    },
		    forAllProps: function(c) {
		      if (!this.onNewProp) {
		        this.onNewProp = [];
		        if (this.proto) this.proto.forAllProps(this);
		      }
		      this.onNewProp.push(c);
		      for (var o = this; o; o = o.proto) for (var prop in o.props) {
		        if (c.onProtoProp)
		          c.onProtoProp(prop, o.props[prop], o == this);
		        else
		          c(prop, o.props[prop], o == this);
		      }
		    },
		    maybeUnregProtoPropHandler: function() {
		      if (this.maybeProps) {
		        for (var _n in this.maybeProps) return;
		        this.maybeProps = null;
		      }
		      if (!this.proto || this.onNewProp && this.onNewProp.length) return;
		      this.proto.unregPropHandler(this);
		    },
		    unregPropHandler: function(handler) {
		      for (var i = 0; i < this.onNewProp.length; ++i)
		        if (this.onNewProp[i] == handler) { this.onNewProp.splice(i, 1); break; }
		      this.maybeUnregProtoPropHandler();
		    },
		    gatherProperties: function(f, depth) {
		      for (var prop in this.props) if (prop != "<i>")
		        f(prop, this, depth);
		      if (this.proto) this.proto.gatherProperties(f, depth + 1);
		    },
		    getObjType: function() { return this; }
		  });
		
		  var Fn = exports.Fn = function(name, self, args, argNames, retval) {
		    Obj.call(this, cx.protos.Function, name);
		    this.self = self;
		    this.args = args;
		    this.argNames = argNames;
		    this.retval = retval;
		  };
		  Fn.prototype = extend(Obj.prototype, {
		    constructor: Fn,
		    toString: function(maxDepth) {
		      if (maxDepth == null) maxDepth = 0;
		      var str = "fn(";
		      for (var i = 0; i < this.args.length; ++i) {
		        if (i) str += ", ";
		        var name = this.argNames[i];
		        if (name && name != "?") str += name + ": ";
		        str += maxDepth > -3 ? toString(this.args[i], maxDepth - 1, this) : "?";
		      }
		      str += ")";
		      if (!this.retval.isEmpty())
		        str += " -> " + (maxDepth > -3 ? toString(this.retval, maxDepth - 1, this) : "?");
		      return str;
		    },
		    getProp: function(prop) {
		      if (prop == "prototype") {
		        var known = this.hasProp(prop, false);
		        if (!known) {
		          known = this.defProp(prop);
		          var proto = new Obj(true, this.name && this.name + ".prototype");
		          proto.origin = this.origin;
		          known.addType(proto, WG_MADEUP_PROTO);
		        }
		        return known;
		      }
		      return Obj.prototype.getProp.call(this, prop);
		    },
		    defProp: function(prop, originNode) {
		      if (prop == "prototype") {
		        var found = this.hasProp(prop, false);
		        if (found) return found;
		        found = Obj.prototype.defProp.call(this, prop, originNode);
		        found.origin = this.origin;
		        found.propagate(new FnPrototype(this));
		        return found;
		      }
		      return Obj.prototype.defProp.call(this, prop, originNode);
		    },
		    getFunctionType: function() { return this; }
		  });
		
		  var Arr = exports.Arr = function(contentType) {
		    Obj.call(this, cx.protos.Array);
		    var content = this.defProp("<i>");
		    if (contentType) contentType.propagate(content);
		  };
		  Arr.prototype = extend(Obj.prototype, {
		    constructor: Arr,
		    toString: function(maxDepth) {
		      if (maxDepth == null) maxDepth = 0;
		      return "[" + (maxDepth > -3 ? toString(this.getProp("<i>"), maxDepth - 1, this) : "?") + "]";
		    }
		  });
		
		  // THE PROPERTY REGISTRY
		
		  function registerProp(prop, obj) {
		    var data = cx.props[prop] || (cx.props[prop] = []);
		    data.push(obj);
		  }
		
		  function objsWithProp(prop) {
		    return cx.props[prop];
		  }
		
		  // INFERENCE CONTEXT
		
		  exports.Context = function(defs, parent) {
		    this.parent = parent;
		    this.props = Object.create(null);
		    this.protos = Object.create(null);
		    this.origins = [];
		    this.curOrigin = "ecma5";
		    this.paths = Object.create(null);
		    this.definitions = Object.create(null);
		    this.purgeGen = 0;
		    this.workList = null;
		    this.disabledComputing = null;
		
		    exports.withContext(this, function() {
		      cx.protos.Object = new Obj(null, "Object.prototype");
		      cx.topScope = new Scope();
		      cx.topScope.name = "<top>";
		      cx.protos.Array = new Obj(true, "Array.prototype");
		      cx.protos.Function = new Fn("Function.prototype", ANull, [], [], ANull);
		      cx.protos.Function.proto = cx.protos.Object;
		      cx.protos.RegExp = new Obj(true, "RegExp.prototype");
		      cx.protos.String = new Obj(true, "String.prototype");
		      cx.protos.Number = new Obj(true, "Number.prototype");
		      cx.protos.Boolean = new Obj(true, "Boolean.prototype");
		      cx.str = new Prim(cx.protos.String, "string");
		      cx.bool = new Prim(cx.protos.Boolean, "bool");
		      cx.num = new Prim(cx.protos.Number, "number");
		      cx.curOrigin = null;
		
		      if (defs) for (var i = 0; i < defs.length; ++i)
		        def.load(defs[i]);
		    });
		  };
		
		  var cx = null;
		  exports.cx = function() { return cx; };
		
		  exports.withContext = function(context, f) {
		    var old = cx;
		    cx = context;
		    try { return f(); }
		    finally { cx = old; }
		  };
		
		  exports.TimedOut = function() {
		    this.message = "Timed out";
		    this.stack = (new Error()).stack;
		  };
		  exports.TimedOut.prototype = Object.create(Error.prototype);
		  exports.TimedOut.prototype.name = "infer.TimedOut";
		
		  var timeout;
		  exports.withTimeout = function(ms, f) {
		    var end = +new Date + ms;
		    var oldEnd = timeout;
		    if (oldEnd && oldEnd < end) return f();
		    timeout = end;
		    try { return f(); }
		    finally { timeout = oldEnd; }
		  };
		
		  exports.addOrigin = function(origin) {
		    if (cx.origins.indexOf(origin) < 0) cx.origins.push(origin);
		  };
		
		  var baseMaxWorkDepth = 20, reduceMaxWorkDepth = 0.0001;
		  function withWorklist(f) {
		    if (cx.workList) return f(cx.workList);
		
		    var list = [], depth = 0;
		    var add = cx.workList = function(type, target, weight) {
		      if (depth < baseMaxWorkDepth - reduceMaxWorkDepth * list.length)
		        list.push(type, target, weight, depth);
		    };
		    try {
		      var ret = f(add);
		      for (var i = 0; i < list.length; i += 4) {
		        if (timeout && +new Date >= timeout)
		          throw new exports.TimedOut();
		        depth = list[i + 3] + 1;
		        list[i + 1].addType(list[i], list[i + 2]);
		      }
		      return ret;
		    } finally {
		      cx.workList = null;
		    }
		  }
		
		  // SCOPES
		
		  var Scope = exports.Scope = function(prev) {
		    Obj.call(this, prev || true);
		    this.prev = prev;
		  };
		  Scope.prototype = extend(Obj.prototype, {
		    constructor: Scope,
		    defVar: function(name, originNode) {
		      for (var s = this; ; s = s.proto) {
		        var found = s.props[name];
		        if (found) return found;
		        if (!s.prev) return s.defProp(name, originNode);
		      }
		    }
		  });
		
		  // RETVAL COMPUTATION HEURISTICS
		
		  function maybeInstantiate(scope, score) {
		    if (scope.fnType)
		      scope.fnType.instantiateScore = (scope.fnType.instantiateScore || 0) + score;
		  }
		
		  var NotSmaller = {};
		  function nodeSmallerThan(node, n) {
		    try {
		      walk.simple(node, {Expression: function() { if (--n <= 0) throw NotSmaller; }});
		      return true;
		    } catch(e) {
		      if (e == NotSmaller) return false;
		      throw e;
		    }
		  }
		
		  function maybeTagAsInstantiated(node, scope) {
		    var score = scope.fnType.instantiateScore;
		    if (!cx.disabledComputing && score && scope.fnType.args.length && nodeSmallerThan(node, score * 5)) {
		      maybeInstantiate(scope.prev, score / 2);
		      setFunctionInstantiated(node, scope);
		      return true;
		    } else {
		      scope.fnType.instantiateScore = null;
		    }
		  }
		
		  function setFunctionInstantiated(node, scope) {
		    var fn = scope.fnType;
		    // Disconnect the arg avals, so that we can add info to them without side effects
		    for (var i = 0; i < fn.args.length; ++i) fn.args[i] = new AVal;
		    fn.self = new AVal;
		    fn.computeRet = function(self, args) {
		      // Prevent recursion
		      return withDisabledComputing(fn, function() {
		        var oldOrigin = cx.curOrigin;
		        cx.curOrigin = fn.origin;
		        var scopeCopy = new Scope(scope.prev);
		        scopeCopy.originNode = scope.originNode;
		        for (var v in scope.props) {
		          var local = scopeCopy.defProp(v, scope.props[v].originNode);
		          for (var i = 0; i < args.length; ++i) if (fn.argNames[i] == v && i < args.length)
		            args[i].propagate(local);
		        }
		        var argNames = fn.argNames.length != args.length ? fn.argNames.slice(0, args.length) : fn.argNames;
		        while (argNames.length < args.length) argNames.push("?");
		        scopeCopy.fnType = new Fn(fn.name, self, args, argNames, ANull);
		        scopeCopy.fnType.originNode = fn.originNode;
		        if (fn.arguments) {
		          var argset = scopeCopy.fnType.arguments = new AVal;
		          scopeCopy.defProp("arguments").addType(new Arr(argset));
		          for (var i = 0; i < args.length; ++i) args[i].propagate(argset);
		        }
		        node.body.scope = scopeCopy;
		        walk.recursive(node.body, scopeCopy, null, scopeGatherer);
		        walk.recursive(node.body, scopeCopy, null, inferWrapper);
		        cx.curOrigin = oldOrigin;
		        return scopeCopy.fnType.retval;
		      });
		    };
		  }
		
		  function maybeTagAsGeneric(scope) {
		    var fn = scope.fnType, target = fn.retval;
		    if (target == ANull) return;
		    var targetInner, asArray;
		    if (!target.isEmpty() && (targetInner = target.getType()) instanceof Arr)
		      target = asArray = targetInner.getProp("<i>");
		
		    function explore(aval, path, depth) {
		      if (depth > 3 || !aval.forward) return;
		      for (var i = 0; i < aval.forward.length; ++i) {
		        var prop = aval.forward[i].propagatesTo();
		        if (!prop) continue;
		        var newPath = path, dest;
		        if (prop instanceof AVal) {
		          dest = prop;
		        } else if (prop.target instanceof AVal) {
		          newPath += prop.pathExt;
		          dest = prop.target;
		        } else continue;
		        if (dest == target) return newPath;
		        var found = explore(dest, newPath, depth + 1);
		        if (found) return found;
		      }
		    }
		
		    var foundPath = explore(fn.self, "!this", 0);
		    for (var i = 0; !foundPath && i < fn.args.length; ++i)
		      foundPath = explore(fn.args[i], "!" + i, 0);
		
		    if (foundPath) {
		      if (asArray) foundPath = "[" + foundPath + "]";
		      var p = new def.TypeParser(foundPath);
		      var parsed = p.parseType(true);
		      fn.computeRet = parsed.apply ? parsed : function() { return parsed; };
		      fn.computeRetSource = foundPath;
		      return true;
		    }
		  }
		
		  // SCOPE GATHERING PASS
		
		  function addVar(scope, nameNode) {
		    return scope.defProp(nameNode.name, nameNode);
		  }
		
		  var scopeGatherer = walk.make({
		    Function: function(node, scope, c) {
		      var inner = node.body.scope = new Scope(scope);
		      inner.originNode = node;
		      var argVals = [], argNames = [];
		      for (var i = 0; i < node.params.length; ++i) {
		        var param = node.params[i];
		        argNames.push(param.name);
		        argVals.push(addVar(inner, param));
		      }
		      inner.fnType = new Fn(node.id && node.id.name, new AVal, argVals, argNames, ANull);
		      inner.fnType.originNode = node;
		      if (node.id) {
		        var decl = node.type == "FunctionDeclaration";
		        addVar(decl ? scope : inner, node.id);
		      }
		      c(node.body, inner, "ScopeBody");
		    },
		    TryStatement: function(node, scope, c) {
		      c(node.block, scope, "Statement");
		      if (node.handler) {
		        var v = addVar(scope, node.handler.param);
		        c(node.handler.body, scope, "ScopeBody");
		        var e5 = cx.definitions.ecma5;
		        if (e5 && v.isEmpty()) getInstance(e5["Error.prototype"]).propagate(v, WG_CATCH_ERROR);
		      }
		      if (node.finalizer) c(node.finalizer, scope, "Statement");
		    },
		    VariableDeclaration: function(node, scope, c) {
		      for (var i = 0; i < node.declarations.length; ++i) {
		        var decl = node.declarations[i];
		        addVar(scope, decl.id);
		        if (decl.init) c(decl.init, scope, "Expression");
		      }
		    }
		  });
		
		  // CONSTRAINT GATHERING PASS
		
		  function propName(node, scope, c) {
		    var prop = node.property;
		    if (!node.computed) return prop.name;
		    if (prop.type == "Literal" && typeof prop.value == "string") return prop.value;
		    if (c) infer(prop, scope, c, ANull);
		    return "<i>";
		  }
		
		  function unopResultType(op) {
		    switch (op) {
		    case "+": case "-": case "~": return cx.num;
		    case "!": return cx.bool;
		    case "typeof": return cx.str;
		    case "void": case "delete": return ANull;
		    }
		  }
		  function binopIsBoolean(op) {
		    switch (op) {
		    case "==": case "!=": case "===": case "!==": case "<": case ">": case ">=": case "<=":
		    case "in": case "instanceof": return true;
		    }
		  }
		  function literalType(node) {
		    if (node.regex) return getInstance(cx.protos.RegExp);
		    switch (typeof node.value) {
		    case "boolean": return cx.bool;
		    case "number": return cx.num;
		    case "string": return cx.str;
		    case "object":
		    case "function":
		      if (!node.value) return ANull;
		      return getInstance(cx.protos.RegExp);
		    }
		  }
		
		  function ret(f) {
		    return function(node, scope, c, out, name) {
		      var r = f(node, scope, c, name);
		      if (out) r.propagate(out);
		      return r;
		    };
		  }
		  function fill(f) {
		    return function(node, scope, c, out, name) {
		      if (!out) out = new AVal;
		      f(node, scope, c, out, name);
		      return out;
		    };
		  }
		
		  var inferExprVisitor = {
		    //ORION
		    RecoveredNode: ret(function(node, scope, c, out, name) {
		  		return new AVal;
		  	}),
		    ArrayExpression: ret(function(node, scope, c) {
		      var eltval = new AVal;
		      for (var i = 0; i < node.elements.length; ++i) {
		        var elt = node.elements[i];
		        if (elt) infer(elt, scope, c, eltval);
		      }
		      return new Arr(eltval);
		    }),
		    ObjectExpression: ret(function(node, scope, c, name) {
		      var obj = node.objType = new Obj(true, name);
		      obj.originNode = node;
		
		      for (var i = 0; i < node.properties.length; ++i) {
		        var prop = node.properties[i], key = prop.key, name;
		        if (prop.value.name == "✖") continue;
		
		        if (key.type == "Identifier") {
		          name = key.name;
		        } else if (typeof key.value == "string") {
		          name = key.value;
		        }
		        if (!name || prop.kind == "set") {
		          infer(prop.value, scope, c, ANull);
		          continue;
		        }
		
		        var val = obj.defProp(name, key), out = val;
		        val.initializer = true;
		        if (prop.kind == "get")
		          out = new IsCallee(obj, [], null, val);
		        infer(prop.value, scope, c, out, name);
		      }
		      return obj;
		    }),
		    FunctionExpression: ret(function(node, scope, c, name) {
		      var inner = node.body.scope, fn = inner.fnType;
		      if (name && !fn.name) fn.name = name;
		      c(node.body, scope, "ScopeBody");
		      maybeTagAsInstantiated(node, inner) || maybeTagAsGeneric(inner);
		      if (node.id) inner.getProp(node.id.name).addType(fn);
		      return fn;
		    }),
		    SequenceExpression: ret(function(node, scope, c) {
		      for (var i = 0, l = node.expressions.length - 1; i < l; ++i)
		        infer(node.expressions[i], scope, c, ANull);
		      return infer(node.expressions[l], scope, c);
		    }),
		    UnaryExpression: ret(function(node, scope, c) {
		      infer(node.argument, scope, c, ANull);
		      return unopResultType(node.operator);
		    }),
		    UpdateExpression: ret(function(node, scope, c) {
		      infer(node.argument, scope, c, ANull);
		      return cx.num;
		    }),
		    BinaryExpression: ret(function(node, scope, c) {
		      if (node.operator == "+") {
		        var lhs = infer(node.left, scope, c);
		        var rhs = infer(node.right, scope, c);
		        if (lhs.hasType(cx.str) || rhs.hasType(cx.str)) return cx.str;
		        if (lhs.hasType(cx.num) && rhs.hasType(cx.num)) return cx.num;
		        var result = new AVal;
		        lhs.propagate(new IsAdded(rhs, result));
		        rhs.propagate(new IsAdded(lhs, result));
		        return result;
		      } else {
		        infer(node.left, scope, c, ANull);
		        infer(node.right, scope, c, ANull);
		        return binopIsBoolean(node.operator) ? cx.bool : cx.num;
		      }
		    }),
		    AssignmentExpression: ret(function(node, scope, c) {
		      var rhs, name, pName;
		      if (node.left.type == "MemberExpression") {
		        pName = propName(node.left, scope, c);
		        if (node.left.object.type == "Identifier")
		          name = node.left.object.name + "." + pName;
		      } else {
		        name = node.left.name;
		      }
		
		      if (node.operator != "=" && node.operator != "+=") {
		        infer(node.right, scope, c, ANull);
		        rhs = cx.num;
		      } else {
		        rhs = infer(node.right, scope, c, null, name);
		      }
		
		      if (node.left.type == "MemberExpression") {
		        var obj = infer(node.left.object, scope, c);
		        if (pName == "prototype") maybeInstantiate(scope, 20);
		        if (pName == "<i>") {
		          // This is a hack to recognize for/in loops that copy
		          // properties, and do the copying ourselves, insofar as we
		          // manage, because such loops tend to be relevant for type
		          // information.
		          var v = node.left.property.name, local = scope.props[v], over = local && local.iteratesOver;
		          if (over) {
		            maybeInstantiate(scope, 20);
		            var fromRight = node.right.type == "MemberExpression" && node.right.computed && node.right.property.name == v;
		            over.forAllProps(function(prop, val, local) {
		              if (local && prop != "prototype" && prop != "<i>")
		                obj.propagate(new PropHasSubset(prop, fromRight ? val : ANull));
		            });
		            return rhs;
		          }
		        }
		        obj.propagate(new PropHasSubset(pName, rhs, node.left.property));
		      } else { // Identifier
		        rhs.propagate(scope.defVar(node.left.name, node.left));
		      }
		      return rhs;
		    }),
		    LogicalExpression: fill(function(node, scope, c, out) {
		      infer(node.left, scope, c, out);
		      infer(node.right, scope, c, out);
		    }),
		    ConditionalExpression: fill(function(node, scope, c, out) {
		      infer(node.test, scope, c, ANull);
		      infer(node.consequent, scope, c, out);
		      infer(node.alternate, scope, c, out);
		    }),
		    NewExpression: fill(function(node, scope, c, out, name) {
		      if (node.callee.type == "Identifier" && node.callee.name in scope.props)
		        maybeInstantiate(scope, 20);
		
		      for (var i = 0, args = []; i < node.arguments.length; ++i)
		        args.push(infer(node.arguments[i], scope, c));
		      var callee = infer(node.callee, scope, c);
		      var self = new AVal;
		      callee.propagate(new IsCtor(self, name && /\.prototype$/.test(name)));
		      self.propagate(out, WG_NEW_INSTANCE);
		      callee.propagate(new IsCallee(self, args, node.arguments, new IfObj(out)));
		    }),
		    CallExpression: fill(function(node, scope, c, out) {
		      for (var i = 0, args = []; i < node.arguments.length; ++i)
		        args.push(infer(node.arguments[i], scope, c));
		      if (node.callee.type == "MemberExpression") {
		        var self = infer(node.callee.object, scope, c);
		        var pName = propName(node.callee, scope, c);
		        if ((pName == "call" || pName == "apply") &&
		            scope.fnType && scope.fnType.args.indexOf(self) > -1)
		          maybeInstantiate(scope, 30);
		        self.propagate(new HasMethodCall(pName, args, node.arguments, out));
		      } else {
		        var callee = infer(node.callee, scope, c);
		        if (scope.fnType && scope.fnType.args.indexOf(callee) > -1)
		          maybeInstantiate(scope, 30);
		        var knownFn = callee.getFunctionType();
		        if (knownFn && knownFn.instantiateScore && scope.fnType)
		          maybeInstantiate(scope, knownFn.instantiateScore / 5);
		        callee.propagate(new IsCallee(cx.topScope, args, node.arguments, out));
		      }
		    }),
		    MemberExpression: fill(function(node, scope, c, out) {
		      var name = propName(node, scope);
		      var obj = infer(node.object, scope, c);
		      var prop = obj.getProp(name);
		      if (name == "<i>") {
		        var propType = infer(node.property, scope, c);
		        if (!propType.hasType(cx.num))
		          return prop.propagate(out, WG_MULTI_MEMBER);
		      }
		      prop.propagate(out);
		    }),
		    Identifier: ret(function(node, scope) {
		      if (node.name == "arguments" && scope.fnType && !(node.name in scope.props))
		        scope.defProp(node.name, scope.fnType.originNode)
		          .addType(new Arr(scope.fnType.arguments = new AVal));
		      return scope.getProp(node.name);
		    }),
		    ThisExpression: ret(function(_node, scope) {
		      return scope.fnType ? scope.fnType.self : cx.topScope;
		    }),
		    Literal: ret(function(node) {
		      return literalType(node);
		    })
		  };
		
		  function infer(node, scope, c, out, name) {
		      //ORION
		      var _f = inferExprVisitor[node.type];
		      if(_f) {
		          return _f(node, scope, c, out, name);
		      }
		  }
		
		  var inferWrapper = walk.make({
		    Expression: function(node, scope, c) {
		      infer(node, scope, c, ANull);
		    },
		
		    FunctionDeclaration: function(node, scope, c) {
		      var inner = node.body.scope, fn = inner.fnType;
		      c(node.body, scope, "ScopeBody");
		      maybeTagAsInstantiated(node, inner) || maybeTagAsGeneric(inner);
		      var prop = scope.getProp(node.id.name);
		      prop.addType(fn);
		    },
		
		    VariableDeclaration: function(node, scope, c) {
		      for (var i = 0; i < node.declarations.length; ++i) {
		        var decl = node.declarations[i], prop = scope.getProp(decl.id.name);
		        if (decl.init)
		          infer(decl.init, scope, c, prop, decl.id.name);
		      }
		    },
		
		    ReturnStatement: function(node, scope, c) {
		      if (!node.argument) return;
		      var output = ANull;
		      if (scope.fnType) {
		        if (scope.fnType.retval == ANull) scope.fnType.retval = new AVal;
		        output = scope.fnType.retval;
		      }
		      infer(node.argument, scope, c, output);
		    },
		
		    ForInStatement: function(node, scope, c) {
		      var source = infer(node.right, scope, c);
		      if ((node.right.type == "Identifier" && node.right.name in scope.props) ||
		          (node.right.type == "MemberExpression" && node.right.property.name == "prototype")) {
		        maybeInstantiate(scope, 5);
		        var varName;
		        if (node.left.type == "Identifier") {
		          varName = node.left.name;
		        } else if (node.left.type == "VariableDeclaration") {
		          varName = node.left.declarations[0].id.name;
		        }
		        if (varName && varName in scope.props)
		          scope.getProp(varName).iteratesOver = source;
		      }
		      c(node.body, scope, "Statement");
		    },
		
		    ScopeBody: function(node, scope, c) { c(node, node.scope || scope); }
		  });
		
		  // PARSING
		
		  function runPasses(passes, pass) {
		    var arr = passes && passes[pass];
		    var args = Array.prototype.slice.call(arguments, 2);
		    if (arr) for (var i = 0; i < arr.length; ++i) arr[i].apply(null, args);
		  }
		
		  var parse = exports.parse = function(text, passes, options) {
		    var ast;
		    if (passes.preParse) for (var i = 0; i < passes.preParse.length; i++) {
		      var result = passes.preParse[i](text, options);
		      if (typeof result == "string") text = result;
		    }
		    var ast;
		    try {
		        options.tolerant = true;
		        options.tokens = true;
		        options.comment = true;
		        options.range = true;
		        options.deps = true;
		        options.loc = true;
		        options.attachComment = true;
		        ast = acorn.parse(text, options);
		        if(typeof ast.sourceFile !== "object") {
			        ast.sourceFile  = Object.create(null);
			        ast.sourceFile.text = ast.source;
			        ast.sourceFile.name = ast.fileLocation;
		        }
		    }
		    //ORION
		    catch(e) {
		    	ast = Util.errorAST(e, options.directSourceFile.name, text); //ORION
		    }
			ast.errors = Util.serializeAstErrors(ast);
		    runPasses(passes, "postParse", ast, text);
		    return ast;
		  };
		
		  // ANALYSIS INTERFACE
		
		  exports.analyze = function(ast, name, scope, passes) {
		    if (typeof ast == "string") ast = parse(ast);
		
		    if (!name) name = "file#" + cx.origins.length;
		    exports.addOrigin(cx.curOrigin = name);
		
		    if (!scope) scope = cx.topScope;
		    walk.recursive(ast, scope, null, scopeGatherer);
		    runPasses(passes, "preInfer", ast, scope);
		    walk.recursive(ast, scope, null, inferWrapper);
		    runPasses(passes, "postInfer", ast, scope);
		
		    cx.curOrigin = null;
		  };
		
		  // PURGING
		
		  exports.purge = function(origins, start, end) {
		    var test = makePredicate(origins, start, end);
		    ++cx.purgeGen;
		    cx.topScope.purge(test);
		    for (var prop in cx.props) {
		      var list = cx.props[prop];
		      for (var i = 0; i < list.length; ++i) {
		        var obj = list[i], av = obj.props[prop];
		        if (!av || test(av, av.originNode)) list.splice(i--, 1);
		      }
		      if (!list.length) delete cx.props[prop];
		    }
		  };
		
		  function makePredicate(origins, start, end) {
		    var arr = Array.isArray(origins);
		    if (arr && origins.length == 1) { origins = origins[0]; arr = false; }
		    if (arr) {
		      if (end == null) return function(n) { return origins.indexOf(n.origin) > -1; };
		      return function(n, pos) { return pos && pos.start >= start && pos.end <= end && origins.indexOf(n.origin) > -1; };
		    } else {
		      if (end == null) return function(n) { return n.origin == origins; };
		      return function(n, pos) { return pos && pos.start >= start && pos.end <= end && n.origin == origins; };
		    }
		  }
		
		  AVal.prototype.purge = function(test) {
		    if (this.purgeGen == cx.purgeGen) return;
		    this.purgeGen = cx.purgeGen;
		    for (var i = 0; i < this.types.length; ++i) {
		      var type = this.types[i];
		      if (test(type, type.originNode))
		        this.types.splice(i--, 1);
		      else
		        type.purge(test);
		    }
		    if (this.forward) for (var i = 0; i < this.forward.length; ++i) {
		      var f = this.forward[i];
		      if (test(f)) {
		        this.forward.splice(i--, 1);
		        if (this.props) this.props = null;
		      } else if (f.purge) {
		        f.purge(test);
		      }
		    }
		  };
		  ANull.purge = function() {};
		  Obj.prototype.purge = function(test) {
		    if (this.purgeGen == cx.purgeGen) return true;
		    this.purgeGen = cx.purgeGen;
		    for (var p in this.props) {
		      var av = this.props[p];
		      if (test(av, av.originNode))
		        this.removeProp(p);
		      av.purge(test);
		    }
		  };
		  Fn.prototype.purge = function(test) {
		    if (Obj.prototype.purge.call(this, test)) return;
		    this.self.purge(test);
		    this.retval.purge(test);
		    for (var i = 0; i < this.args.length; ++i) this.args[i].purge(test);
		  };
		
		  // EXPRESSION TYPE DETERMINATION
		
		  function findByPropertyName(name) {
		    guessing = true;
		    var found = objsWithProp(name);
		    if (found) for (var i = 0; i < found.length; ++i) {
		      var val = found[i].getProp(name);
		      if (!val.isEmpty()) return val;
		    }
		    return ANull;
		  }
		
		  var typeFinder = {
		    ArrayExpression: function(node, scope) {
		      var eltval = new AVal;
		      for (var i = 0; i < node.elements.length; ++i) {
		        var elt = node.elements[i];
		        if (elt) findType(elt, scope).propagate(eltval);
		      }
		      return new Arr(eltval);
		    },
		    ObjectExpression: function(node) {
		      return node.objType;
		    },
		    FunctionExpression: function(node) {
		      return node.body.scope.fnType;
		    },
		    SequenceExpression: function(node, scope) {
		      return findType(node.expressions[node.expressions.length-1], scope);
		    },
		    UnaryExpression: function(node) {
		      return unopResultType(node.operator);
		    },
		    UpdateExpression: function() {
		      return cx.num;
		    },
		    BinaryExpression: function(node, scope) {
		      if (binopIsBoolean(node.operator)) return cx.bool;
		      if (node.operator == "+") {
		        var lhs = findType(node.left, scope);
		        var rhs = findType(node.right, scope);
		        if (lhs.hasType(cx.str) || rhs.hasType(cx.str)) return cx.str;
		      }
		      return cx.num;
		    },
		    AssignmentExpression: function(node, scope) {
		      return findType(node.right, scope);
		    },
		    LogicalExpression: function(node, scope) {
		      var lhs = findType(node.left, scope);
		      return lhs.isEmpty() ? findType(node.right, scope) : lhs;
		    },
		    ConditionalExpression: function(node, scope) {
		      var lhs = findType(node.consequent, scope);
		      return lhs.isEmpty() ? findType(node.alternate, scope) : lhs;
		    },
		    NewExpression: function(node, scope) {
		      var f = findType(node.callee, scope).getFunctionType();
		      var proto = f && f.getProp("prototype").getObjType();
		      if (!proto) return ANull;
		      return getInstance(proto, f);
		    },
		    CallExpression: function(node, scope) {
		      var f = findType(node.callee, scope).getFunctionType();
		      if (!f) return ANull;
		      if (f.computeRet) {
		        for (var i = 0, args = []; i < node.arguments.length; ++i)
		          args.push(findType(node.arguments[i], scope));
		        var self = ANull;
		        if (node.callee.type == "MemberExpression")
		          self = findType(node.callee.object, scope);
		        return f.computeRet(self, args, node.arguments);
		      } else {
		        return f.retval;
		      }
		    },
			MemberExpression: function(node, scope) {
				var propN = propName(node, scope), obj = findType(node.object, scope).getType();
				if (obj) {
					//ORION
					var currentMatch = obj.getProp(propN);
					if (guessing && Array.isArray(obj.potentialMatches)) {
						var potentialMatches = obj.potentialMatches;
						var matchesProp = [];
						for(var i = 0, len = potentialMatches.length; i < len; i++) {
							var match = potentialMatches[i];
							var propMatch = match.getProp(propN);
							if (typeof propMatch !== "undefined") {
								if (typeof propMatch.originNode !== "undefined"
										&& typeof propMatch.origin !== "undefined") {
									if (propMatch.originNode.sourceFile) {
										if (propMatch.originNode.sourceFile.name === propMatch.origin) {
											matchesProp.push(propMatch);
										}
									}
								}
							}
						}
						if (matchesProp.length > 0) {
							currentMatch.potentialMatches = matchesProp;
						}
					}
					return currentMatch;
				}
				if (propN == "<i>") return ANull;
				return findByPropertyName(propN);
			},
		    Identifier: function(node, scope) {
		      return scope.hasProp(node.name) || ANull;
		    },
		    ThisExpression: function(_node, scope) {
		      return scope.fnType ? scope.fnType.self : cx.topScope;
		    },
		    Literal: function(node) {
		      return literalType(node);
		    }
		  };
		
		  function findType(node, scope) {
		    //ORION
		    var _f = typeFinder[node.type];
		    if(_f) {
		      return _f(node, scope);
		    }
		    return null;
		  }
		
		  var searchVisitor = exports.searchVisitor = walk.make({
		    Function: function(node, _st, c) {
		      var scope = node.body.scope;
		      if (node.id) c(node.id, scope);
		      for (var i = 0; i < node.params.length; ++i)
		        c(node.params[i], scope);
		      c(node.body, scope, "ScopeBody");
		    },
		    TryStatement: function(node, st, c) {
		      if (node.handler)
		        c(node.handler.param, st);
		      walk.base.TryStatement(node, st, c);
		    },
		    VariableDeclaration: function(node, st, c) {
		      for (var i = 0; i < node.declarations.length; ++i) {
		        var decl = node.declarations[i];
		        c(decl.id, st);
		        if (decl.init) c(decl.init, st, "Expression");
		      }
		    }
		  });
		  exports.fullVisitor = walk.make({
		    MemberExpression: function(node, st, c) {
		      c(node.object, st, "Expression");
		      c(node.property, st, node.computed ? "Expression" : null);
		    },
		    ObjectExpression: function(node, st, c) {
		      for (var i = 0; i < node.properties.length; ++i) {
		        c(node.properties[i].value, st, "Expression");
		        c(node.properties[i].key, st);
		      }
		    }
		  }, searchVisitor);
		
		  exports.findExpressionAt = function(ast, start, end, defaultScope, filter) {
		    var test = filter || function(_t, node) {
		      if (node.type == "Identifier" && node.name == "✖") return false;
		      return typeFinder.hasOwnProperty(node.type);
		    };
		    return walk.findNodeAt(ast, start, end, test, searchVisitor, defaultScope || cx.topScope);
		  };
		
		  exports.findExpressionAround = function(ast, start, end, defaultScope, filter) {
		    var test = filter || function(_t, node) {
		      if (start != null && node.start > start) return false;
		      if (node.type == "Identifier" && node.name == "✖") return false;
		      return typeFinder.hasOwnProperty(node.type);
		    };
		    return walk.findNodeAround(ast, end, test, searchVisitor, defaultScope || cx.topScope);
		  };
		
		  exports.expressionType = function(found) {
		    return findType(found.node, found.state);
		  };
		
		  // Finding the expected type of something, from context
		
		  exports.parentNode = function(child, ast) {
		    var stack = [];
		    function c(node, st, override) {
		      if (node.start <= child.start && node.end >= child.end) {
		        var top = stack[stack.length - 1];
		        if (node == child) throw {found: top};
		        if (top != node) stack.push(node);
		        walk.base[override || node.type](node, st, c);
		        if (top != node) stack.pop();
		      }
		    }
		    try {
		      c(ast, null);
		    } catch (e) {
		      if (e.found) return e.found;
		      throw e;
		    }
		  };
		
		  var findTypeFromContext = {
		    ArrayExpression: function(parent, _, get) { return get(parent, true).getProp("<i>"); },
		    ObjectExpression: function(parent, node, get) {
		      for (var i = 0; i < parent.properties.length; ++i) {
		        var prop = node.properties[i];
		        if (prop.value == node)
		          return get(parent, true).getProp(prop.key.name);
		      }
		    },
		    UnaryExpression: function(parent) { return unopResultType(parent.operator); },
		    UpdateExpression: function() { return cx.num; },
		    BinaryExpression: function(parent) { return binopIsBoolean(parent.operator) ? cx.bool : cx.num; },
		    AssignmentExpression: function(parent, _, get) { return get(parent.left); },
		    LogicalExpression: function(parent, _, get) { return get(parent, true); },
		    ConditionalExpression: function(parent, node, get) {
		      if (parent.consequent == node || parent.alternate == node) return get(parent, true);
		    },
		    NewExpression: function(parent, node, get) {
		      return this.CallExpression(parent, node, get);
		    },
		    CallExpression: function(parent, node, get) {
		      for (var i = 0; i < parent.arguments.length; i++) {
		        var arg = parent.arguments[i];
		        if (arg == node) {
		          var calleeType = get(parent.callee).getFunctionType();
		          if (calleeType instanceof Fn)
		            return calleeType.args[i];
		          break;
		        }
		      }
		    },
		    ReturnStatement: function(_parent, node, get) {
		      var fnNode = walk.findNodeAround(node.sourceFile.ast, node.start, "Function");
		      if (fnNode) {
		        var fnType = fnNode.node.type == "FunctionExpression"
		          ? get(fnNode.node, true).getFunctionType()
		          : fnNode.node.body.scope.fnType;
		        if (fnType) return fnType.retval.getType();
		      }
		    },
		    VariableDeclaration: function(parent, node, get) {
		      for (var i = 0; i < parent.declarations.length; i++) {
		        var decl = parent.declarations[i];
		        if (decl.init == node) return get(decl.id);
		      }
		    }
		  };
		
		  exports.typeFromContext = function(ast, found) {
		    var parent = exports.parentNode(found.node, ast);
		    var type = null;
		    if (findTypeFromContext.hasOwnProperty(parent.type)) {
		      type = findTypeFromContext[parent.type](parent, found.node, function(node, fromContext) {
		        var obj = {node: node, state: found.state};
		        var tp = fromContext ? exports.typeFromContext(ast, obj) : exports.expressionType(obj);
		        return tp || ANull;
		      });
		    }
		    return type || exports.expressionType(found);
		  };
		
		  // Flag used to indicate that some wild guessing was used to produce
		  // a type or set of completions.
		  var guessing = false;
		
		  exports.resetGuessing = function(val) { guessing = val; };
		  exports.didGuess = function() { return guessing; };
		
		  exports.forAllPropertiesOf = function(type, f) {
		    type.gatherProperties(f, 0);
		  };
		
		  var refFindWalker = walk.make({}, searchVisitor);
		
		  exports.findRefs = function(ast, baseScope, name, refScope, f) {
		    refFindWalker.Identifier = refFindWalker.VariablePattern = function(node, scope) {
		      if (node.name != name) return;
		      for (var s = scope; s; s = s.prev) {
		        if (s == refScope) f(node, scope);
		        if (name in s.props) return;
		      }
		    };
		    walk.recursive(ast, baseScope, null, refFindWalker);
		  };
		
		  var simpleWalker = walk.make({
		    Function: function(node, _st, c) { c(node.body, node.body.scope, "ScopeBody"); }
		  });
		
		  exports.findPropRefs = function(ast, scope, objType, propName, f) {
		    walk.simple(ast, {
		      MemberExpression: function(node, scope) {
		        if (node.computed || node.property.name != propName) return;
		        if (findType(node.object, scope).getType() == objType) f(node.property);
		      },
		      ObjectExpression: function(node, scope) {
		        if (findType(node, scope).getType() != objType) return;
		        for (var i = 0; i < node.properties.length; ++i)
		          if (node.properties[i].key.name == propName) f(node.properties[i].key);
		      }
		    }, simpleWalker, scope);
		  };
		
		  // LOCAL-VARIABLE QUERIES
		
		  var scopeAt = exports.scopeAt = function(ast, pos, defaultScope) {
		    var found = walk.findNodeAround(ast, pos, function(tp, node) {
		      return tp == "ScopeBody" && node.scope;
		    });
		    if (found) return found.node.scope;
		    else return defaultScope || cx.topScope;
		  };
		
		  exports.forAllLocalsAt = function(ast, pos, defaultScope, f) {
		    var scope = scopeAt(ast, pos, defaultScope);
		    scope.gatherProperties(f, 0);
		  };
		
		  // INIT DEF MODULE
		
		  // Delayed initialization because of cyclic dependencies.
		  def = exports.def = def.init({}, exports);
		});
	},
	/* 1 */
	function(module, exports, __webpack_require__) {

		var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*
		  Copyright (C) 2013 Ariya Hidayat <ariya.hidayat@gmail.com>
		  Copyright (C) 2013 Thaddee Tyl <thaddee.tyl@gmail.com>
		  Copyright (C) 2013 Mathias Bynens <mathias@qiwi.be>
		  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
		  Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
		  Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
		  Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
		  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
		  Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
		  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>
		
		  Redistribution and use in source and binary forms, with or without
		  modification, are permitted provided that the following conditions are met:
		
		    * Redistributions of source code must retain the above copyright
		      notice, this list of conditions and the following disclaimer.
		    * Redistributions in binary form must reproduce the above copyright
		      notice, this list of conditions and the following disclaimer in the
		      documentation and/or other materials provided with the distribution.
		
		  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
		  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
		  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
		  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
		  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
		  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
		  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
		  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
		  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
		  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
		*/
		
		/*jslint bitwise:true plusplus:true */
		/*global esprima:true, define:true, exports:true, window: true,
		throwError: true, generateStatement: true, peek: true,
		parseAssignmentExpression: true, parseBlock: true, parseExpression: true,
		parseFunctionDeclaration: true, parseFunctionExpression: true,
		parseFunctionSourceElements: true, parseVariableIdentifier: true,
		parseLeftHandSideExpression: true, parseParams: true, validateParam: true,
		parseUnaryExpression: true,
		parseStatement: true, parseSourceElement: true */
		/* eslint-disable missing-nls */
		(function (root, factory) {
		    'use strict';
		
		    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
		    // Rhino, and plain browser loading.
		
		    /* istanbul ignore next */
		    if (true) {
		        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
		    } else if (typeof exports !== 'undefined') {
		        factory(exports);
		    } else {
		        factory((root.esprima = {}));
		    }
		}(this, function (exports) {
		    'use strict';
		
		    var Token,
		        TokenName,
		        FnExprTokens,
		        Syntax,
		        PlaceHolders,
		        PropertyKind,
		        Messages,
		        Regex,
		        source,
		        strict,
		        index,
		        lineNumber,
		        lineStart,
		        hasLineTerminator,
		        lastIndex,
		        lastLineNumber,
		        lastLineStart,
		        startIndex,
		        startLineNumber,
		        startLineStart,
		        scanning,
		        length,
		        lookahead,
		        state,
		        extra;
		
		    Token = {
		        BooleanLiteral: 1,
		        EOF: 2,
		        Identifier: 3,
		        Keyword: 4,
		        NullLiteral: 5,
		        NumericLiteral: 6,
		        Punctuator: 7,
		        StringLiteral: 8,
		        RegularExpression: 9
		    };
		
		    TokenName = {};
		    TokenName[Token.BooleanLiteral] = 'Boolean';
		    TokenName[Token.EOF] = '<end>';
		    TokenName[Token.Identifier] = 'Identifier';
		    TokenName[Token.Keyword] = 'Keyword';
		    TokenName[Token.NullLiteral] = 'Null';
		    TokenName[Token.NumericLiteral] = 'Numeric';
		    TokenName[Token.Punctuator] = 'Punctuator';
		    TokenName[Token.StringLiteral] = 'String';
		    TokenName[Token.RegularExpression] = 'RegularExpression';
		
		    // A function following one of those tokens is an expression.
		    FnExprTokens = ['(', '{', '[', 'in', 'typeof', 'instanceof', 'new',
		                    'return', 'case', 'delete', 'throw', 'void',
		                    // assignment operators
		                    '=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=',
		                    '&=', '|=', '^=', ',',
		                    // binary/unary operators
		                    '+', '-', '*', '/', '%', '++', '--', '<<', '>>', '>>>', '&',
		                    '|', '^', '!', '~', '&&', '||', '?', ':', '===', '==', '>=',
		                    '<=', '<', '>', '!=', '!=='];
		
		    Syntax = {
		        AssignmentExpression: 'AssignmentExpression',
		        ArrayExpression: 'ArrayExpression',
		        ArrowFunctionExpression: 'ArrowFunctionExpression',
		        BlockStatement: 'BlockStatement',
		        BinaryExpression: 'BinaryExpression',
		        BreakStatement: 'BreakStatement',
		        CallExpression: 'CallExpression',
		        CatchClause: 'CatchClause',
		        ConditionalExpression: 'ConditionalExpression',
		        ContinueStatement: 'ContinueStatement',
		        DoWhileStatement: 'DoWhileStatement',
		        DebuggerStatement: 'DebuggerStatement',
		        EmptyStatement: 'EmptyStatement',
		        ExpressionStatement: 'ExpressionStatement',
		        ForStatement: 'ForStatement',
		        ForInStatement: 'ForInStatement',
		        FunctionDeclaration: 'FunctionDeclaration',
		        FunctionExpression: 'FunctionExpression',
		        Identifier: 'Identifier',
		        IfStatement: 'IfStatement',
		        Literal: 'Literal',
		        LabeledStatement: 'LabeledStatement',
		        LogicalExpression: 'LogicalExpression',
		        MemberExpression: 'MemberExpression',
		        NewExpression: 'NewExpression',
		        ObjectExpression: 'ObjectExpression',
		        Program: 'Program',
		        Property: 'Property',
		        ReturnStatement: 'ReturnStatement',
		        SequenceExpression: 'SequenceExpression',
		        SwitchStatement: 'SwitchStatement',
		        SwitchCase: 'SwitchCase',
		        ThisExpression: 'ThisExpression',
		        ThrowStatement: 'ThrowStatement',
		        TryStatement: 'TryStatement',
		        UnaryExpression: 'UnaryExpression',
		        UpdateExpression: 'UpdateExpression',
		        VariableDeclaration: 'VariableDeclaration',
		        VariableDeclarator: 'VariableDeclarator',
		        WhileStatement: 'WhileStatement',
		        WithStatement: 'WithStatement'
		    };
		
		    PlaceHolders = {
		        ArrowParameterPlaceHolder: {
		            type: 'ArrowParameterPlaceHolder'
		        }
		    };
		
		    PropertyKind = {
		        Data: 1,
		        Get: 2,
		        Set: 4
		    };
		
		    // Error messages should be identical to V8.
		    Messages = {
		        UnexpectedToken:  'Unexpected token %0',
		        UnexpectedNumber:  'Unexpected number',
		        UnexpectedString:  'Unexpected string',
		        UnexpectedIdentifier:  'Unexpected identifier',
		        UnexpectedReserved:  'Unexpected reserved word',
		        UnexpectedEOS:  'Unexpected end of input',
		        NewlineAfterThrow:  'Illegal newline after throw',
		        InvalidRegExp: 'Invalid regular expression',
		        UnterminatedRegExp:  'Invalid regular expression: missing /',
		        InvalidLHSInAssignment:  'Invalid left-hand side in assignment',
		        InvalidLHSInForIn:  'Invalid left-hand side in for-in',
		        MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
		        NoCatchOrFinally:  'Missing catch or finally after try',
		        UnknownLabel: 'Undefined label \'%0\'',
		        Redeclaration: '%0 \'%1\' has already been declared',
		        IllegalContinue: 'Illegal continue statement',
		        IllegalBreak: 'Illegal break statement',
		        IllegalReturn: 'Illegal return statement',
		        StrictModeWith:  'Strict mode code may not include a with statement',
		        StrictCatchVariable:  'Catch variable may not be eval or arguments in strict mode',
		        StrictVarName:  'Variable name may not be eval or arguments in strict mode',
		        StrictParamName:  'Parameter name eval or arguments is not allowed in strict mode',
		        StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
		        StrictFunctionName:  'Function name may not be eval or arguments in strict mode',
		        StrictOctalLiteral:  'Octal literals are not allowed in strict mode.',
		        StrictDelete:  'Delete of an unqualified identifier in strict mode.',
		        StrictDuplicateProperty:  'Duplicate data property in object literal not allowed in strict mode',
		        AccessorDataProperty:  'Object literal may not have data and accessor property with the same name',
		        AccessorGetSet:  'Object literal may not have multiple get/set accessors with the same name',
		        StrictLHSAssignment:  'Assignment to eval or arguments is not allowed in strict mode',
		        StrictLHSPostfix:  'Postfix increment/decrement may not have eval or arguments operand in strict mode',
		        StrictLHSPrefix:  'Prefix increment/decrement may not have eval or arguments operand in strict mode',
		        StrictReservedWord:  'Use of future reserved word in strict mode',
		        MissingToken: 'Missing expected \'%0\''
		    };
		
		    // See also tools/generate-unicode-regex.py.
		    Regex = {
		        NonAsciiIdentifierStart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]'),
		        NonAsciiIdentifierPart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B2\u08E4-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA69D\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2D\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]')
		    };
		
		    // Ensure the condition is true, otherwise throw an error.
		    // This is only to have a better contract semantic, i.e. another safety net
		    // to catch a logic error. The condition shall be fulfilled in normal case.
		    // Do NOT use this to enforce a certain condition on any user input.
		
		    function assert(condition, message) {
		        /* istanbul ignore if */
		        if (!condition) {
		            throw new Error('ASSERT: ' + message);
		        }
		    }
		
		    function isDecimalDigit(ch) {
		        return (ch >= 0x30 && ch <= 0x39);   // 0..9
		    }
		
		    function isHexDigit(ch) {
		        return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
		    }
		
		    function isOctalDigit(ch) {
		        return '01234567'.indexOf(ch) >= 0;
		    }
		
		
		    // 7.2 White Space
		
		    function isWhiteSpace(ch) {
		        return (ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
		            (ch >= 0x1680 && [0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF].indexOf(ch) >= 0);
		    }
		
		    // 7.3 Line Terminators
		
		    function isLineTerminator(ch) {
		        return (ch === 0x0A) || (ch === 0x0D) || (ch === 0x2028) || (ch === 0x2029);
		    }
		
		    // 7.6 Identifier Names and Identifiers
		
		    function isIdentifierStart(ch) {
		        return (ch === 0x24) || (ch === 0x5F) ||  // $ (dollar) and _ (underscore)
		            (ch >= 0x41 && ch <= 0x5A) ||         // A..Z
		            (ch >= 0x61 && ch <= 0x7A) ||         // a..z
		            (ch === 0x5C) ||                      // \ (backslash)
		            ((ch >= 0x80) && Regex.NonAsciiIdentifierStart.test(String.fromCharCode(ch)));
		    }
		
		    function isIdentifierPart(ch) {
		        return (ch === 0x24) || (ch === 0x5F) ||  // $ (dollar) and _ (underscore)
		            (ch >= 0x41 && ch <= 0x5A) ||         // A..Z
		            (ch >= 0x61 && ch <= 0x7A) ||         // a..z
		            (ch >= 0x30 && ch <= 0x39) ||         // 0..9
		            (ch === 0x5C) ||                      // \ (backslash)
		            ((ch >= 0x80) && Regex.NonAsciiIdentifierPart.test(String.fromCharCode(ch)));
		    }
		
		    // 7.6.1.2 Future Reserved Words
		
		    function isFutureReservedWord(id) {
		        switch (id) {
		        case 'class':
		        case 'enum':
		        case 'export':
		        case 'extends':
		        case 'import':
		        case 'super':
		            return true;
		        default:
		            return false;
		        }
		    }
		
		    function isStrictModeReservedWord(id) {
		        switch (id) {
		        case 'implements':
		        case 'interface':
		        case 'package':
		        case 'private':
		        case 'protected':
		        case 'public':
		        case 'static':
		        case 'yield':
		        case 'let':
		            return true;
		        default:
		            return false;
		        }
		    }
		
		    function isRestrictedWord(id) {
		        return id === 'eval' || id === 'arguments';
		    }
		
		    // 7.6.1.1 Keywords
		
		    function isKeyword(id) {
		        if (strict && isStrictModeReservedWord(id)) {
		            return true;
		        }
		
		        // 'const' is specialized as Keyword in V8.
		        // 'yield' and 'let' are for compatibility with SpiderMonkey and ES.next.
		        // Some others are from future reserved words.
		
		        switch (id.length) {
		        case 2:
		            return (id === 'if') || (id === 'in') || (id === 'do');
		        case 3:
		            return (id === 'var') || (id === 'for') || (id === 'new') ||
		                (id === 'try') || (id === 'let');
		        case 4:
		            return (id === 'this') || (id === 'else') || (id === 'case') ||
		                (id === 'void') || (id === 'with') || (id === 'enum');
		        case 5:
		            return (id === 'while') || (id === 'break') || (id === 'catch') ||
		                (id === 'throw') || (id === 'const') || (id === 'yield') ||
		                (id === 'class') || (id === 'super');
		        case 6:
		            return (id === 'return') || (id === 'typeof') || (id === 'delete') ||
		                (id === 'switch') || (id === 'export') || (id === 'import');
		        case 7:
		            return (id === 'default') || (id === 'finally') || (id === 'extends');
		        case 8:
		            return (id === 'function') || (id === 'continue') || (id === 'debugger');
		        case 10:
		            return (id === 'instanceof');
		        default:
		            return false;
		        }
		    }
		
		    // 7.4 Comments
		
		    function addComment(type, value, start, end, loc) {
		        var comment;
		
		        assert(typeof start === 'number', 'Comment must have valid position');
		
		        state.lastCommentStart = start;
		
		        comment = {
		            type: type,
		            value: value
		        };
		        if (extra.range) {
		            comment.range = [start, end];
		        }
		        if (extra.loc) {
		            comment.loc = loc;
		        }
		        extra.comments.push(comment);
		        if (extra.attachComment) {
		            extra.leadingComments.push(comment);
		            extra.trailingComments.push(comment);
		        }
		    }
		
		    function skipSingleLineComment(offset) {
		        var start, loc, ch, comment;
		
		        start = index - offset;
		        loc = {
		            start: {
		                line: lineNumber,
		                column: index - lineStart - offset
		            }
		        };
		
		        while (index < length) {
		            ch = source.charCodeAt(index);
		            ++index;
		            if (isLineTerminator(ch)) {
		                hasLineTerminator = true;
		                if (extra.comments) {
		                    comment = source.slice(start + offset, index - 1);
		                    loc.end = {
		                        line: lineNumber,
		                        column: index - lineStart - 1
		                    };
		                    addComment('Line', comment, start, index - 1, loc);
		                }
		                if (ch === 13 && source.charCodeAt(index) === 10) {
		                    ++index;
		                }
		                ++lineNumber;
		                lineStart = index;
		                return;
		            }
		        }
		
		        if (extra.comments) {
		            comment = source.slice(start + offset, index);
		            loc.end = {
		                line: lineNumber,
		                column: index - lineStart
		            };
		            addComment('Line', comment, start, index, loc);
		        }
		    }
		
		    function skipMultiLineComment() {
		        var start, loc, ch, comment;
		
		        if (extra.comments) {
		            start = index - 2;
		            loc = {
		                start: {
		                    line: lineNumber,
		                    column: index - lineStart - 2
		                }
		            };
		        }
		
		        while (index < length) {
		            ch = source.charCodeAt(index);
		            if (isLineTerminator(ch)) {
		                if (ch === 0x0D && source.charCodeAt(index + 1) === 0x0A) {
		                    ++index;
		                }
		                hasLineTerminator = true;
		                ++lineNumber;
		                ++index;
		                lineStart = index;
		            } else if (ch === 0x2A) {
		                // Block comment ends with '*/'.
		                if (source.charCodeAt(index + 1) === 0x2F) {
		                    ++index;
		                    ++index;
		                    if (extra.comments) {
		                        comment = source.slice(start + 2, index - 2);
		                        loc.end = {
		                            line: lineNumber,
		                            column: index - lineStart
		                        };
		                        addComment('Block', comment, start, index, loc);
		                    }
		                    return;
		                }
		                ++index;
		            } else {
		                ++index;
		            }
		        }
		
		        //ORION
		        if(index >= length && extra.comments) {
		            //ran off the end of the file - the whole thing is a comment
		            loc.end = {
		                line: lineNumber,
		                column: index - lineStart
		            };
		            comment = source.slice(start+2, index);
		            addComment('Block', comment, start, index, loc);
		            tolerateUnexpectedToken();
		        } else {
		            throwUnexpectedToken();
		        }
		    }
		
		    function skipComment() {
		        var ch, start;
		        hasLineTerminator = false;
		
		        start = (index === 0);
		        while (index < length) {
		            ch = source.charCodeAt(index);
		
		            if (isWhiteSpace(ch)) {
		                ++index;
		            } else if (isLineTerminator(ch)) {
		                hasLineTerminator = true;
		                ++index;
		                if (ch === 0x0D && source.charCodeAt(index) === 0x0A) {
		                    ++index;
		                }
		                ++lineNumber;
		                lineStart = index;
		                start = true;
		            } else if (ch === 0x2F) { // U+002F is '/'
		                ch = source.charCodeAt(index + 1);
		                if (ch === 0x2F) {
		                    ++index;
		                    ++index;
		                    skipSingleLineComment(2);
		                    start = true;
		                } else if (ch === 0x2A) {  // U+002A is '*'
		                    ++index;
		                    ++index;
		                    skipMultiLineComment();
		                } else {
		                    break;
		                }
		            } else if (start && ch === 0x2D) { // U+002D is '-'
		                // U+003E is '>'
		                if ((source.charCodeAt(index + 1) === 0x2D) && (source.charCodeAt(index + 2) === 0x3E)) {
		                    // '-->' is a single-line comment
		                    index += 3;
		                    skipSingleLineComment(3);
		                } else {
		                    break;
		                }
		            } else if (ch === 0x3C) { // U+003C is '<'
		                if (source.slice(index + 1, index + 4) === '!--') {
		                    ++index; // `<`
		                    ++index; // `!`
		                    ++index; // `-`
		                    ++index; // `-`
		                    skipSingleLineComment(4);
		                } else {
		                    break;
		                }
		            } else {
		                break;
		            }
		        }
		    }
		
		    function scanHexEscape(prefix) {
		        var i, len, ch, code = 0;
		
		        len = (prefix === 'u') ? 4 : 2;
		        for (i = 0; i < len; ++i) {
		            if (index < length && isHexDigit(source[index])) {
		                ch = source[index++];
		                code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
		            } else {
		                return '';
		            }
		        }
		        return String.fromCharCode(code);
		    }
		
		    function scanUnicodeCodePointEscape() {
		        var ch, code, cu1, cu2;
		
		        ch = source[index];
		        code = 0;
		
		        // At least, one hex digit is required.
		        if (ch === '}') {
		            throwUnexpectedToken();
		        }
		
		        while (index < length) {
		            ch = source[index++];
		            if (!isHexDigit(ch)) {
		                break;
		            }
		            code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
		        }
		
		        if (code > 0x10FFFF || ch !== '}') {
		            throwUnexpectedToken();
		        }
		
		        // UTF-16 Encoding
		        if (code <= 0xFFFF) {
		            return String.fromCharCode(code);
		        }
		        cu1 = ((code - 0x10000) >> 10) + 0xD800;
		        cu2 = ((code - 0x10000) & 1023) + 0xDC00;
		        return String.fromCharCode(cu1, cu2);
		    }
		
		    function getEscapedIdentifier() {
		        var ch, id;
		
		        ch = source.charCodeAt(index++);
		        id = String.fromCharCode(ch);
		
		        // '\u' (U+005C, U+0075) denotes an escaped character.
		        if (ch === 0x5C) {
		            if (source.charCodeAt(index) !== 0x75) {
		                throwUnexpectedToken();
		            }
		            ++index;
		            ch = scanHexEscape('u');
		            if (!ch || ch === '\\' || !isIdentifierStart(ch.charCodeAt(0))) {
		                throwUnexpectedToken();
		            }
		            id = ch;
		        }
		
		        while (index < length) {
		            ch = source.charCodeAt(index);
		            if (!isIdentifierPart(ch)) {
		                break;
		            }
		            ++index;
		            id += String.fromCharCode(ch);
		
		            // '\u' (U+005C, U+0075) denotes an escaped character.
		            if (ch === 0x5C) {
		                id = id.substr(0, id.length - 1);
		                if (source.charCodeAt(index) !== 0x75) {
		                    throwUnexpectedToken();
		                }
		                ++index;
		                ch = scanHexEscape('u');
		                if (!ch || ch === '\\' || !isIdentifierPart(ch.charCodeAt(0))) {
		                    throwUnexpectedToken();
		                }
		                id += ch;
		            }
		        }
		
		        return id;
		    }
		
		    function getIdentifier() {
		        var start, ch;
		
		        start = index++;
		        while (index < length) {
		            ch = source.charCodeAt(index);
		            if (ch === 0x5C) {
		                // Blackslash (U+005C) marks Unicode escape sequence.
		                index = start;
		                return getEscapedIdentifier();
		            }
		            if (isIdentifierPart(ch)) {
		                ++index;
		            } else {
		                break;
		            }
		        }
		
		        return source.slice(start, index);
		    }
		
		    function scanIdentifier() {
		        var start, id, type;
		
		        start = index;
		
		        // Backslash (U+005C) starts an escaped character.
		        id = (source.charCodeAt(index) === 0x5C) ? getEscapedIdentifier() : getIdentifier();
		
		        // There is no keyword or literal with only one character.
		        // Thus, it must be an identifier.
		        if (id.length === 1) {
		            type = Token.Identifier;
		        } else if (isKeyword(id)) {
		            type = Token.Keyword;
		        } else if (id === 'null') {
		            type = Token.NullLiteral;
		        } else if (id === 'true' || id === 'false') {
		            type = Token.BooleanLiteral;
		        } else {
		            type = Token.Identifier;
		        }
		
		        return {
		            type: type,
		            value: id,
		            lineNumber: lineNumber,
		            lineStart: lineStart,
		            start: start,
		            end: index
		        };
		    }
		
		
		    // 7.7 Punctuators
		
		    function scanPunctuator() {
		        var start = index,
		            code = source.charCodeAt(index),
		            code2,
		            ch1 = source[index],
		            ch2,
		            ch3,
		            ch4;
		
		        switch (code) {
		
		        // Check for most common single-character punctuators.
		        case 0x2E:  // . dot
		        case 0x28:  // ( open bracket
		        case 0x29:  // ) close bracket
		        case 0x3B:  // ; semicolon
		        case 0x2C:  // , comma
		        case 0x7B:  // { open curly brace
		        case 0x7D:  // } close curly brace
		        case 0x5B:  // [
		        case 0x5D:  // ]
		        case 0x3A:  // :
		        case 0x3F:  // ?
		        case 0x7E:  // ~
		            ++index;
		            if (extra.tokenize) {
		                if (code === 0x28) {
		                    extra.openParenToken = extra.tokens.length;
		                } else if (code === 0x7B) {
		                    extra.openCurlyToken = extra.tokens.length;
		                }
		            }
		            return {
		                type: Token.Punctuator,
		                value: String.fromCharCode(code),
		                lineNumber: lineNumber,
		                lineStart: lineStart,
		                start: start,
		                end: index
		            };
		
		        default:
		            code2 = source.charCodeAt(index + 1);
		
		            // '=' (U+003D) marks an assignment or comparison operator.
		            if (code2 === 0x3D) {
		                switch (code) {
		                case 0x2B:  // +
		                case 0x2D:  // -
		                case 0x2F:  // /
		                case 0x3C:  // <
		                case 0x3E:  // >
		                case 0x5E:  // ^
		                case 0x7C:  // |
		                case 0x25:  // %
		                case 0x26:  // &
		                case 0x2A:  // *
		                    index += 2;
		                    return {
		                        type: Token.Punctuator,
		                        value: String.fromCharCode(code) + String.fromCharCode(code2),
		                        lineNumber: lineNumber,
		                        lineStart: lineStart,
		                        start: start,
		                        end: index
		                    };
		
		                case 0x21: // !
		                case 0x3D: // =
		                    index += 2;
		
		                    // !== and ===
		                    if (source.charCodeAt(index) === 0x3D) {
		                        ++index;
		                    }
		                    return {
		                        type: Token.Punctuator,
		                        value: source.slice(start, index),
		                        lineNumber: lineNumber,
		                        lineStart: lineStart,
		                        start: start,
		                        end: index
		                    };
		                }
		            }
		        }
		
		        // 4-character punctuator: >>>=
		
		        ch4 = source.substr(index, 4);
		
		        if (ch4 === '>>>=') {
		            index += 4;
		            return {
		                type: Token.Punctuator,
		                value: ch4,
		                lineNumber: lineNumber,
		                lineStart: lineStart,
		                start: start,
		                end: index
		            };
		        }
		
		        // 3-character punctuators: === !== >>> <<= >>=
		
		        ch3 = ch4.substr(0, 3);
		
		        if (ch3 === '>>>' || ch3 === '<<=' || ch3 === '>>=') {
		            index += 3;
		            return {
		                type: Token.Punctuator,
		                value: ch3,
		                lineNumber: lineNumber,
		                lineStart: lineStart,
		                start: start,
		                end: index
		            };
		        }
		
		        // Other 2-character punctuators: ++ -- << >> && ||
		        ch2 = ch3.substr(0, 2);
		
		        if ((ch1 === ch2[1] && ('+-<>&|'.indexOf(ch1) >= 0)) || ch2 === '=>') {
		            index += 2;
		            return {
		                type: Token.Punctuator,
		                value: ch2,
		                lineNumber: lineNumber,
		                lineStart: lineStart,
		                start: start,
		                end: index
		            };
		        }
		
		        // 1-character punctuators: < > = ! + - * % & | ^ /
		
		        if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
		            ++index;
		            return {
		                type: Token.Punctuator,
		                value: ch1,
		                lineNumber: lineNumber,
		                lineStart: lineStart,
		                start: start,
		                end: index
		            };
		        }
		        //ORION 
		        ++index;
		        var tok = {
		            type: Token.Punctuator, 
		            lineNumber: lineNumber,
		            lineStart: lineStart,
		            start: start,
		            end: index,
		            value: source.slice(start, index)
		        };
		        throwUnexpectedToken(tok);
		    }
		
		    // 7.8.3 Numeric Literals
		
		    function scanHexLiteral(start) {
		        var number = '';
		
		        while (index < length) {
		            if (!isHexDigit(source[index])) {
		                break;
		            }
		            number += source[index++];
		        }
		
		        if (number.length === 0) {
		            throwUnexpectedToken();
		        }
		
		        if (isIdentifierStart(source.charCodeAt(index))) {
		            throwUnexpectedToken();
		        }
		
		        return {
		            type: Token.NumericLiteral,
		            value: parseInt('0x' + number, 16),
		            lineNumber: lineNumber,
		            lineStart: lineStart,
		            start: start,
		            end: index
		        };
		    }
		
		    function scanBinaryLiteral(start) {
		        var ch, number;
		
		        number = '';
		
		        while (index < length) {
		            ch = source[index];
		            if (ch !== '0' && ch !== '1') {
		                break;
		            }
		            number += source[index++];
		        }
		
		        if (number.length === 0) {
		            // only 0b or 0B
		            throwUnexpectedToken();
		        }
		
		        if (index < length) {
		            ch = source.charCodeAt(index);
		            /* istanbul ignore else */
		            if (isIdentifierStart(ch) || isDecimalDigit(ch)) {
		                throwUnexpectedToken();
		            }
		        }
		
		        return {
		            type: Token.NumericLiteral,
		            value: parseInt(number, 2),
		            lineNumber: lineNumber,
		            lineStart: lineStart,
		            start: start,
		            end: index
		        };
		    }
		
		    function scanOctalLiteral(prefix, start) {
		        var number, octal;
		
		        if (isOctalDigit(prefix)) {
		            octal = true;
		            number = '0' + source[index++];
		        } else {
		            octal = false;
		            ++index;
		            number = '';
		        }
		
		        while (index < length) {
		            if (!isOctalDigit(source[index])) {
		                break;
		            }
		            number += source[index++];
		        }
		
		        if (!octal && number.length === 0) {
		            // only 0o or 0O
		            throwUnexpectedToken();
		        }
		
		        if (isIdentifierStart(source.charCodeAt(index)) || isDecimalDigit(source.charCodeAt(index))) {
		            throwUnexpectedToken();
		        }
		
		        return {
		            type: Token.NumericLiteral,
		            value: parseInt(number, 8),
		            octal: octal,
		            lineNumber: lineNumber,
		            lineStart: lineStart,
		            start: start,
		            end: index
		        };
		    }
		
		    function isImplicitOctalLiteral() {
		        var i, ch;
		
		        // Implicit octal, unless there is a non-octal digit.
		        // (Annex B.1.1 on Numeric Literals)
		        for (i = index + 1; i < length; ++i) {
		            ch = source[i];
		            if (ch === '8' || ch === '9') {
		                return false;
		            }
		            if (!isOctalDigit(ch)) {
		                return true;
		            }
		        }
		
		        return true;
		    }
		
		    function scanNumericLiteral() {
		        var number, start, ch;
		
		        ch = source[index];
		        assert(isDecimalDigit(ch.charCodeAt(0)) || (ch === '.'),
		            'Numeric literal must start with a decimal digit or a decimal point');
		
		        start = index;
		        number = '';
		        if (ch !== '.') {
		            number = source[index++];
		            ch = source[index];
		
		            // Hex number starts with '0x'.
		            // Octal number starts with '0'.
		            // Octal number in ES6 starts with '0o'.
		            // Binary number in ES6 starts with '0b'.
		            if (number === '0') {
		                if (ch === 'x' || ch === 'X') {
		                    ++index;
		                    return scanHexLiteral(start);
		                }
		                if (ch === 'b' || ch === 'B') {
		                    ++index;
		                    return scanBinaryLiteral(start);
		                }
		                if (ch === 'o' || ch === 'O') {
		                    return scanOctalLiteral(ch, start);
		                }
		
		                if (isOctalDigit(ch)) {
		                    if (isImplicitOctalLiteral()) {
		                        return scanOctalLiteral(ch, start);
		                }
		            }
		            }
		
		            while (isDecimalDigit(source.charCodeAt(index))) {
		                number += source[index++];
		            }
		            ch = source[index];
		        }
		
		        if (ch === '.') {
		            number += source[index++];
		            while (isDecimalDigit(source.charCodeAt(index))) {
		                number += source[index++];
		            }
		            ch = source[index];
		        }
		
		        if (ch === 'e' || ch === 'E') {
		            number += source[index++];
		
		            ch = source[index];
		            if (ch === '+' || ch === '-') {
		                number += source[index++];
		            }
		            if (isDecimalDigit(source.charCodeAt(index))) {
		                while (isDecimalDigit(source.charCodeAt(index))) {
		                    number += source[index++];
		                }
		            } else {
		                throwUnexpectedToken();
		            }
		        }
		
		        if (isIdentifierStart(source.charCodeAt(index))) {
		            throwUnexpectedToken();
		        }
		
		        return {
		            type: Token.NumericLiteral,
		            value: parseFloat(number),
		            lineNumber: lineNumber,
		            lineStart: lineStart,
		            start: start,
		            end: index
		        };
		    }
		
		    // 7.8.4 String Literals
		
		    function scanStringLiteral() {
		        var str = '', quote, start, ch, code, unescaped, restore, octal = false;
		
		        quote = source[index];
		        assert((quote === '\'' || quote === '"'),
		            'String literal must starts with a quote');
		
		        start = index;
		        ++index;
		
		        while (index < length) {
		            ch = source[index++];
		
		            if (ch === quote) {
		                quote = '';
		                break;
		            } else if (ch === '\\') {
		                ch = source[index++];
		                if (!ch || !isLineTerminator(ch.charCodeAt(0))) {
		                    switch (ch) {
		                    case 'u':
		                    case 'x':
		                        if (source[index] === '{') {
		                            ++index;
		                            str += scanUnicodeCodePointEscape();
		                        } else {
		                            restore = index;
		                            unescaped = scanHexEscape(ch);
		                            if (unescaped) {
		                                str += unescaped;
		                            } else {
		                                index = restore;
		                                str += ch;
		                            }
		                        }
		                        break;
		                    case 'n':
		                        str += '\n';
		                        break;
		                    case 'r':
		                        str += '\r';
		                        break;
		                    case 't':
		                        str += '\t';
		                        break;
		                    case 'b':
		                        str += '\b';
		                        break;
		                    case 'f':
		                        str += '\f';
		                        break;
		                    case 'v':
		                        str += '\x0B';
		                        break;
		
		                    default:
		                        if (isOctalDigit(ch)) {
		                            code = '01234567'.indexOf(ch);
		
		                            // \0 is not octal escape sequence
		                            if (code !== 0) {
		                                octal = true;
		                            }
		
		                            if (index < length && isOctalDigit(source[index])) {
		                                octal = true;
		                                code = code * 8 + '01234567'.indexOf(source[index++]);
		
		                                // 3 digits are only allowed when string starts
		                                // with 0, 1, 2, 3
		                                if ('0123'.indexOf(ch) >= 0 &&
		                                        index < length &&
		                                        isOctalDigit(source[index])) {
		                                    code = code * 8 + '01234567'.indexOf(source[index++]);
		                                }
		                            }
		                            str += String.fromCharCode(code);
		                        } else {
		                            str += ch;
		                        }
		                        break;
		                    }
		                } else {
		                    ++lineNumber;
		                    if (ch ===  '\r' && source[index] === '\n') {
		                        ++index;
		                    }
		                    lineStart = index;
		                }
		            } else if (isLineTerminator(ch.charCodeAt(0))) {
		                break;
		            } else {
		                str += ch;
		            }
		        }
		        
		        var tok = {
		            type: Token.StringLiteral,
		            value: str,
		            octal: octal,
		            lineNumber: startLineNumber,
		            lineStart: startLineStart,
		            start: start,
		            end: index
		        };
		        
		        //ORION
		        if (quote !== '') {
		            tolerateUnexpectedToken(tok);
		        }
		
		        return tok;
		    }
		
		    function testRegExp(pattern, flags) {
		        var tmp = pattern;
		
		        if (flags.indexOf('u') >= 0) {
		            // Replace each astral symbol and every Unicode code point
		            // escape sequence with a single ASCII symbol to avoid throwing on
		            // regular expressions that are only valid in combination with the
		            // `/u` flag.
		            // Note: replacing with the ASCII symbol `x` might cause false
		            // negatives in unlikely scenarios. For example, `[\u{61}-b]` is a
		            // perfectly valid pattern that is equivalent to `[a-b]`, but it
		            // would be replaced by `[x-b]` which throws an error.
		            tmp = tmp
		                .replace(/\\u\{([0-9a-fA-F]+)\}/g, function ($0, $1) {
		                    if (parseInt($1, 16) <= 0x10FFFF) {
		                        return 'x';
		                    }
		                    throwUnexpectedToken(null, Messages.InvalidRegExp);
		                })
		                .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, 'x');
		        }
		
		        // First, detect invalid regular expressions.
		        try {
		            RegExp(tmp);
		        } catch (e) {
		            throwUnexpectedToken(null, Messages.InvalidRegExp);
		        }
		
		        // Return a regular expression object for this pattern-flag pair, or
		        // `null` in case the current environment doesn't support the flags it
		        // uses.
		        try {
		            return new RegExp(pattern, flags);
		        } catch (exception) {
		            return null;
		    }
		    }
		
		    function scanRegExpBody() {
		        var ch, str, classMarker, terminated, body;
		
		        ch = source[index];
		        assert(ch === '/', 'Regular expression literal must start with a slash');
		        str = source[index++];
		
		        classMarker = false;
		        terminated = false;
		        while (index < length) {
		            ch = source[index++];
		            str += ch;
		            if (ch === '\\') {
		                ch = source[index++];
		                // ECMA-262 7.8.5
		                if (isLineTerminator(ch.charCodeAt(0))) {
		                    throwUnexpectedToken(null, Messages.UnterminatedRegExp);
		                }
		                str += ch;
		            } else if (isLineTerminator(ch.charCodeAt(0))) {
		                throwUnexpectedToken(null, Messages.UnterminatedRegExp);
		            } else if (classMarker) {
		                if (ch === ']') {
		                    classMarker = false;
		                }
		            } else {
		                if (ch === '/') {
		                    terminated = true;
		                    break;
		                } else if (ch === '[') {
		                    classMarker = true;
		                }
		            }
		        }
		
		        if (!terminated) {
		            throwUnexpectedToken(lookahead, Messages.UnterminatedRegExp);
		        }
		
		        // Exclude leading and trailing slash.
		        body = str.substr(1, str.length - 2);
		        return {
		            value: body,
		            literal: str
		        };
		    }
		
		    function scanRegExpFlags() {
		        var ch, str, flags, restore;
		
		        str = '';
		        flags = '';
		        while (index < length) {
		            ch = source[index];
		            if (!isIdentifierPart(ch.charCodeAt(0))) {
		                break;
		            }
		
		            ++index;
		            if (ch === '\\' && index < length) {
		                ch = source[index];
		                if (ch === 'u') {
		                    ++index;
		                    restore = index;
		                    ch = scanHexEscape('u');
		                    if (ch) {
		                        flags += ch;
		                        for (str += '\\u'; restore < index; ++restore) {
		                            str += source[restore];
		                        }
		                    } else {
		                        index = restore;
		                        flags += 'u';
		                        str += '\\u';
		                    }
		                    tolerateUnexpectedToken();
		                } else {
		                    str += '\\';
		                    tolerateUnexpectedToken();
		                }
		            } else {
		                flags += ch;
		                str += ch;
		            }
		        }
		
		        return {
		            value: flags,
		            literal: str
		        };
		    }
		
		    function scanRegExp() {
		        scanning = true;
		        var start, body, flags, value;
		
		        //ORION do not null out the lookahead
		        //lookahead = null;
		        skipComment();
		        start = index;
		
		        body = scanRegExpBody();
		        flags = scanRegExpFlags();
		        value = testRegExp(body.value, flags.value);
		        scanning = false;
		        if (extra.tokenize) {
		            return {
		                type: Token.RegularExpression,
		                value: value,
		                regex: {
		                    pattern: body.value,
		                    flags: flags.value
		                },
		                lineNumber: lineNumber,
		                lineStart: lineStart,
		                start: start,
		                end: index
		            };
		        }
		
		        return {
		            literal: body.literal + flags.literal,
		            value: value,
		            regex: {
		                pattern: body.value,
		                flags: flags.value
		            },
		            start: start,
		            end: index
		        };
		    }
		
		    function collectRegex() {
		        var pos, loc, regex, token;
		
		        skipComment();
		
		        pos = index;
		        loc = {
		            start: {
		                line: lineNumber,
		                column: index - lineStart
		            }
		        };
		
		        regex = scanRegExp();
		        loc.end = {
		            line: lineNumber,
		            column: index - lineStart
		        };
		
		        /* istanbul ignore next */
		        if (!extra.tokenize) {
		            // Pop the previous token, which is likely '/' or '/='
		            if (extra.tokens.length > 0) {
		                token = extra.tokens[extra.tokens.length - 1];
		                if (token.range[0] === pos && token.type === 'Punctuator') {
		                    if (token.value === '/' || token.value === '/=') {
		                        extra.tokens.pop();
		                    }
		                }
		            }
		
		            extra.tokens.push({
		                type: 'RegularExpression',
		                value: regex.literal,
		                regex: regex.regex,
		                range: [pos, index],
		                loc: loc
		            });
		        }
		
		        return regex;
		    }
		
		    function isIdentifierName(token) {
		        return token.type === Token.Identifier ||
		            token.type === Token.Keyword ||
		            token.type === Token.BooleanLiteral ||
		            token.type === Token.NullLiteral;
		    }
		
		    function advanceSlash() {
		        var prevToken,
		            checkToken;
		        // Using the following algorithm:
		        // https://github.com/mozilla/sweet.js/wiki/design
		        prevToken = extra.tokens[extra.tokens.length - 1];
		        if (!prevToken) {
		            // Nothing before that: it cannot be a division.
		            return collectRegex();
		        }
		        if (prevToken.type === 'Punctuator') {
		            if (prevToken.value === ']') {
		                return scanPunctuator();
		            }
		            if (prevToken.value === ')') {
		                checkToken = extra.tokens[extra.openParenToken - 1];
		                if (checkToken &&
		                        checkToken.type === 'Keyword' &&
		                        (checkToken.value === 'if' ||
		                         checkToken.value === 'while' ||
		                         checkToken.value === 'for' ||
		                         checkToken.value === 'with')) {
		                    return collectRegex();
		                }
		                return scanPunctuator();
		            }
		            if (prevToken.value === '}') {
		                // Dividing a function by anything makes little sense,
		                // but we have to check for that.
		                if (extra.tokens[extra.openCurlyToken - 3] &&
		                        extra.tokens[extra.openCurlyToken - 3].type === 'Keyword') {
		                    // Anonymous function.
		                    checkToken = extra.tokens[extra.openCurlyToken - 4];
		                    if (!checkToken) {
		                        return scanPunctuator();
		                    }
		                } else if (extra.tokens[extra.openCurlyToken - 4] &&
		                        extra.tokens[extra.openCurlyToken - 4].type === 'Keyword') {
		                    // Named function.
		                    checkToken = extra.tokens[extra.openCurlyToken - 5];
		                    if (!checkToken) {
		                        return collectRegex();
		                    }
		                } else {
		                    return scanPunctuator();
		                }
		                // checkToken determines whether the function is
		                // a declaration or an expression.
		                if (FnExprTokens.indexOf(checkToken.value) >= 0) {
		                    // It is an expression.
		                    return scanPunctuator();
		                }
		                // It is a declaration.
		                return collectRegex();
		            }
		            return collectRegex();
		        }
		        if (prevToken.type === 'Keyword' && prevToken.value !== 'this') {
		            return collectRegex();
		        }
		        return scanPunctuator();
		    }
		
		    function advance() {
		        var ch;
		
		        if (index >= length) {
		            return {
		                type: Token.EOF,
		                lineNumber: lineNumber,
		                lineStart: lineStart,
		                start: index,
		                end: index,
		                range: [index, index] //ORION
		            };
		        }
		
		        ch = source.charCodeAt(index);
		
		        if (isIdentifierStart(ch)) {
		            return scanIdentifier();
		        }
		
		        // Very common: ( and ) and ;
		        if (ch === 0x28 || ch === 0x29 || ch === 0x3B) {
		            return scanPunctuator();
		        }
		
		        // String literal starts with single quote (U+0027) or double quote (U+0022).
		        if (ch === 0x27 || ch === 0x22) {
		            return scanStringLiteral();
		        }
		
		
		        // Dot (.) U+002E can also start a floating-point number, hence the need
		        // to check the next character.
		        if (ch === 0x2E) {
		            if (isDecimalDigit(source.charCodeAt(index + 1))) {
		                return scanNumericLiteral();
		            }
		            return scanPunctuator();
		        }
		
		        if (isDecimalDigit(ch)) {
		            return scanNumericLiteral();
		        }
		
		        // Slash (/) U+002F can also start a regex.
		        if (extra.tokenize && ch === 0x2F) {
		            return advanceSlash();
		        }
		
		        return scanPunctuator();
		    }
		
		    function collectToken() {
		        var loc, token, value, entry;
		
		        loc = {
		            start: {
		                line: lineNumber,
		                column: index - lineStart
		            }
		        };
		
		        token = advance();
		        loc.end = {
		            line: lineNumber,
		            column: index - lineStart
		        };
		
		        if (token.type !== Token.EOF) {
		            value = source.slice(token.start, token.end);
		            entry = {
		                type: TokenName[token.type],
		                value: value,
		                range: [token.start, token.end],
		                loc: loc
		            };
		            if (token.regex) {
		                entry.regex = {
		                    pattern: token.regex.pattern,
		                    flags: token.regex.flags
		                };
		            }
		            extra.tokens.push(entry);
		        }
		
		        return token;
		    }
		
		    function lex() {
		        var token;
		        scanning = true;
		
		        lastIndex = index;
		        lastLineNumber = lineNumber;
		        lastLineStart = lineStart;
		
		        skipComment();
		
		        token = lookahead;
		
		        startIndex = index;
		        startLineNumber = lineNumber;
		        startLineStart = lineStart;
		
		        lookahead = (typeof extra.tokens !== 'undefined') ? collectToken() : advance();
		        scanning = false;
		        return token;
		    }
		
		    function peek() {
		        scanning = true;
		
		        skipComment();
		
		        lastIndex = index;
		        lastLineNumber = lineNumber;
		        lastLineStart = lineStart;
		
		        startIndex = index;
		        startLineNumber = lineNumber;
		        startLineStart = lineStart;
		
		        lookahead = (typeof extra.tokens !== 'undefined') ? collectToken() : advance();
		        scanning = false;
		    }
		
			/**
			 * @description Adds all of the entries from the array of deps to the global state
			 * @param {Array} array The array of deps to add
			 * ORION
			 */
			function addArrayDeps(array) {
				if(extra.deps) {
					var len = array.length;
					for(var i = 0; i < len; i++) {
						addDep(array[i]);
					}
				}
			}
			
			/**
			 * @description Adds a dependency if it has not already been added
			 * @param {Object} node The AST node
			 */
			function addDep(node) {
				if(extra.deps && node.type === Syntax.Literal) {
					for(var i = 0; i < extra.deps.length; i++) {
						if(extra.deps[i].value === node.value) {
							return;
						}
					}
					extra.deps.push(node);
				}
			}
			
			/**
			 * @description Collects the dependencies from call expressions and new expressions
			 * @param {Node} callee The named callee node 
			 * @param {Array.<Node>} args The list of arguments for the expression
			 * ORION
			 */
			function collectDeps(callee, args) {
				if(extra.deps) {
		        	var len = args.length;
		    		if(callee.name === 'importScripts') {
		    			addArrayDeps(args); //importScripts('foo', 'bar'...)
		    		} else if(callee.name === 'Worker') {
		    			addDep(args[0]);
		    		} else if(callee.name === 'require') {
		    			var _a = args[0];
		    			if(_a.type === Syntax.ArrayExpression) {
		    				extra.envs.node = true;
		    				addArrayDeps(_a.elements); //require([foo])
		    			} else if(_a.type === Syntax.Literal) {
		    				extra.envs.node = true;
		    				addDep(_a); // require('foo')
		    			}
		    			if(len > 1) {
		    				_a = args[1];
		    				if(_a.type === Syntax.ArrayExpression) {
		    					extra.envs.node = true;
		    					addArrayDeps(_a.elements);
		    				}
		    			}
		    		} else if(callee.name === 'requirejs') {
		    			_a = args[0];
		    			if(_a.type === Syntax.ArrayExpression) {
		    				extra.envs.amd = true;
		    				addArrayDeps(_a.elements); //requirejs([foo])
		    			}
		    		} else if(callee.name === 'define' && len > 1) {//second arg must be array
		    			_a = args[0];
		    			if(_a.type === Syntax.Literal) {
		    				_a = args[1];
		    			}
		    			if(_a.type === Syntax.ArrayExpression) {
		    				extra.envs.amd = true;
		    				addArrayDeps(_a.elements);
		    			}
		    		}
		    	}
			}
			
		    function Position() {
		        this.line = startLineNumber;
		        this.column = startIndex - startLineStart;
		    }
		
		    function SourceLocation() {
		        this.start = new Position();
		        this.end = null;
		    }
		
		    function WrappingSourceLocation(startToken) {
		            this.start = {
		                line: startToken.lineNumber,
		                column: startToken.start - startToken.lineStart
		            };
		        this.end = null;
		    }
		
		    function Node() {
		        if (extra.loc) {
		            this.loc = new SourceLocation();
		        }
		        if (extra.range) {
		            this.range = [startIndex, 0];
		        }
		        if(extra.directSourceFile) {
		        	this.sourceFile = extra.directSourceFile; //ORION for Tern
		        }
		    }
		
		    function WrappingNode(startToken) {
		        if (extra.loc) {
		            this.loc = new WrappingSourceLocation(startToken);
		        }
		        if (extra.range) {
		            this.range = [startToken.start, 0];
		        }
		        if(extra.directSourceFile) {
		        	this.sourceFile = extra.directSourceFile; //ORION for Tern
		        }
		    }
		
		    WrappingNode.prototype = Node.prototype = {
		
		        processComment: function () {
		            var lastChild,
		                leadingComments,
		                trailingComments,
		                bottomRight = extra.bottomRightStack,
		                i,
		                comment,
		                last = bottomRight[bottomRight.length - 1];
		
		            if (this.type === Syntax.Program) {
		                if (this.body.length > 0) {
		                    return;
		                }
		            }
		
		            if (extra.trailingComments.length > 0) {
		                trailingComments = [];
		                for (i = extra.trailingComments.length - 1; i >= 0; --i) {
		                    comment = extra.trailingComments[i];
		                    if (comment.range[0] >= this.range[1]) {
		                        trailingComments.unshift(comment);
		                        extra.trailingComments.splice(i, 1);
		                }
		                }
		                extra.trailingComments = [];
		            } else {
		                if (last && last.trailingComments && last.trailingComments[0].range[0] >= this.range[1]) {
		                    trailingComments = last.trailingComments;
		                    delete last.trailingComments;
		                }
		            }
		
		            // Eating the stack.
		            if (last) {
		                while (last && last.range[0] >= this.range[0]) {
		                    lastChild = last;
		                    last = bottomRight.pop();
		                }
		            }
		
		            if (lastChild) {
		                if (lastChild.leadingComments && lastChild.leadingComments[lastChild.leadingComments.length - 1].range[1] <= this.range[0]) {
		                    this.leadingComments = lastChild.leadingComments;
		                    lastChild.leadingComments = undefined;
		                }
		            } else if (extra.leadingComments.length > 0) {
		                leadingComments = [];
		                for (i = extra.leadingComments.length - 1; i >= 0; --i) {
		                    comment = extra.leadingComments[i];
		                    if (comment.range[1] <= this.range[0]) {
		                        leadingComments.unshift(comment);
		                        extra.leadingComments.splice(i, 1);
		            }
		                }
		            }
		
		            if (leadingComments && leadingComments.length > 0) {
		                this.leadingComments = leadingComments;
		            }
		            if (trailingComments && trailingComments.length > 0) {
		                this.trailingComments = trailingComments;
		            }
		
		            bottomRight.push(this);
		        },
		
		        finish: function () {
		            if (extra.loc) {
		                this.loc.end = {
		                    line: lastLineNumber,
		                    column: lastIndex - lastLineStart
		                };
		                if (extra.source) {
		                    this.loc.source = extra.source;
		                }
		            }
		            if (extra.range) {
		                this.range[1] = lastIndex;
		                this.start = this.range[0]; //ORION for Tern
		            	this.end = lastIndex; //ORION for Tern
		            }
		            if (extra.attachComment) {
		                this.processComment();
		            }
		        },
		
		        finishArrayExpression: function (elements) {
		            this.type = Syntax.ArrayExpression;
		            this.elements = elements;
		            this.finish();
		            return this;
		        },
		
		        finishArrowFunctionExpression: function (params, defaults, body, expression) {
		            this.type = Syntax.ArrowFunctionExpression;
		            this.id = null;
		            this.params = params;
		            this.defaults = defaults;
		            this.body = body;
		            this.rest = null;
		            this.generator = false;
		            this.expression = expression;
		            this.finish();
		            return this;
		        },
		
		        finishAssignmentExpression: function (operator, left, right) {
		            this.type = Syntax.AssignmentExpression;
		            this.operator = operator;
		            this.left = left;
		            this.right = right;
		            this.finish();
		            return this;
		        },
		
		        finishBinaryExpression: function (operator, left, right) {
		            this.type = (operator === '||' || operator === '&&') ? Syntax.LogicalExpression : Syntax.BinaryExpression;
		            this.operator = operator;
		            this.left = left;
		            this.right = right;
		            this.finish();
		            return this;
		        },
		
		        finishBlockStatement: function (body) {
		            this.type = Syntax.BlockStatement;
		            this.body = body;
		            this.finish();
		            return this;
		        },
		
		        finishBreakStatement: function (label) {
		            this.type = Syntax.BreakStatement;
		            this.label = label;
		            this.finish();
		            return this;
		        },
		
		        finishCallExpression: function (callee, args) {
		            this.type = Syntax.CallExpression;
		            this.callee = callee;
		            this.arguments = args;
		            collectDeps(callee, args);
		            this.finish();
		            return this;
		        },
		
		        finishCatchClause: function (param, body) {
		            this.type = Syntax.CatchClause;
		            this.param = param;
		            this.body = body;
		            this.finish();
		            return this;
		        },
		
		        finishConditionalExpression: function (test, consequent, alternate) {
		            this.type = Syntax.ConditionalExpression;
		            this.test = test;
		            this.consequent = consequent;
		            this.alternate = alternate;
		            this.finish();
		            return this;
		        },
		
		        finishContinueStatement: function (label) {
		            this.type = Syntax.ContinueStatement;
		            this.label = label;
		            this.finish();
		            return this;
		        },
		
		        finishDebuggerStatement: function () {
		            this.type = Syntax.DebuggerStatement;
		            this.finish();
		            return this;
		        },
		
		        finishDoWhileStatement: function (body, test) {
		            this.type = Syntax.DoWhileStatement;
		            this.body = body;
		            this.test = test;
		            this.finish();
		            return this;
		        },
		
		        finishEmptyStatement: function () {
		            this.type = Syntax.EmptyStatement;
		            this.finish();
		            return this;
		        },
		
		        finishExpressionStatement: function (expression) {
		            this.type = Syntax.ExpressionStatement;
		            this.expression = expression;
		            this.finish();
		            return this;
		        },
		
		        finishForStatement: function (init, test, update, body) {
		            this.type = Syntax.ForStatement;
		            this.init = init;
		            this.test = test;
		            this.update = update;
		            this.body = body;
		            this.finish();
		            return this;
		        },
		
		        finishForInStatement: function (left, right, body) {
		            this.type = Syntax.ForInStatement;
		            this.left = left;
		            this.right = right;
		            this.body = body ? body : recoveredNode(this, 'Statement'); //ORION
		            this.each = false;
		            this.finish();
		            return this;
		        },
		
		        finishFunctionDeclaration: function (id, params, defaults, body) {
		            this.type = Syntax.FunctionDeclaration;
		            this.id = id;
		            this.params = params;
		            this.defaults = defaults;
		            this.body = body;
		            this.rest = null;
		            this.generator = false;
		            this.expression = false;
		            this.finish();
		            return this;
		        },
		
		        finishFunctionExpression: function (id, params, defaults, body) {
		            this.type = Syntax.FunctionExpression;
		            this.id = id;
		            this.params = params;
		            this.defaults = defaults;
		            this.body = body;
		            this.rest = null;
		            this.generator = false;
		            this.expression = false;
		            this.finish();
		            return this;
		        },
		
		        finishIdentifier: function (name) {
		            this.type = Syntax.Identifier;
		            this.name = name;
		            this.finish();
		            return this;
		        },
		
		        finishIfStatement: function (test, consequent, alternate) {
		            this.type = Syntax.IfStatement;
		            this.test = test;
		            this.consequent = consequent ? consequent : recoveredNode(this, 'Statement'); //ORION
		            this.alternate = alternate;
		            this.finish();
		            return this;
		        },
		
		        finishLabeledStatement: function (label, body) {
		            this.type = Syntax.LabeledStatement;
		            this.label = label;
		            this.body = body;
		            this.finish();
		            return this;
		        },
		
		        finishLiteral: function (token) {
		            this.type = Syntax.Literal;
		            this.value = token.value;
		            this.raw = source.slice(token.start, token.end);
		            if (token.regex) {
		                this.regex = token.regex;
		            }
		            this.finish();
		            return this;
		        },
		
		        finishMemberExpression: function (accessor, object, property) {
		            this.type = Syntax.MemberExpression;
		            this.computed = accessor === '[';
		            this.object = object;
		            this.property = property;
		            this.finish();
		            return this;
		        },
		
		        finishNewExpression: function (callee, args) {
		            this.type = Syntax.NewExpression;
		            this.callee = callee;
		            this.arguments = args;
		            collectDeps(callee, args);
		            this.finish();
		            return this;
		        },
		
		        finishObjectExpression: function (properties) {
		            this.type = Syntax.ObjectExpression;
		            this.properties = properties;
		            this.finish();
		            return this;
		        },
		
		        finishPostfixExpression: function (operator, argument) {
		            this.type = Syntax.UpdateExpression;
		            this.operator = operator;
		            this.argument = argument;
		            this.prefix = false;
		            this.finish();
		            return this;
		        },
		
		        finishProgram: function (body) {
		            this.type = Syntax.Program;
		            this.body = body;
		            this.finish();
		            return this;
		        },
		
		        //ORION be able to recover
		        finishProperty: function (kind, key, value, method, shorthand) {
		            this.type = Syntax.Property;
		            this.key = key;
		            this.value = value;
		            this.kind = kind;
		            this.method = method;
		            this.shorthand = shorthand;
		            this.finish();
		            return this;
		        },
		
		        finishReturnStatement: function (argument) {
		            this.type = Syntax.ReturnStatement;
		            this.argument = argument;
		            this.finish();
		            return this;
		        },
		
		        finishSequenceExpression: function (expressions) {
		            this.type = Syntax.SequenceExpression;
		            this.expressions = expressions;
		            this.finish();
		            return this;
		        },
		
		        finishSwitchCase: function (test, consequent) {
		            this.type = Syntax.SwitchCase;
		            this.test = test;
		            this.consequent = consequent;
		            this.finish();
		            return this;
		        },
		
		        finishSwitchStatement: function (discriminant, cases) {
		            this.type = Syntax.SwitchStatement;
		            this.discriminant = discriminant;
		            this.cases = cases;
		            this.finish();
		            return this;
		        },
		
		        finishThisExpression: function () {
		            this.type = Syntax.ThisExpression;
		            this.finish();
		            return this;
		        },
		
		        finishThrowStatement: function (argument) {
		            this.type = Syntax.ThrowStatement;
		            this.argument = argument;
		            this.finish();
		            return this;
		        },
		
		        finishTryStatement: function (block, guardedHandlers, handlers, finalizer) {
		            this.type = Syntax.TryStatement;
		            this.block = block;
		            this.guardedHandlers = guardedHandlers;
		            this.handlers = handlers;
		            //ORION see https://bugs.eclipse.org/bugs/show_bug.cgi?id=482317
		            if(Array.isArray(handlers) && handlers.length > 0) {
		            	this.handler = handlers[0];
		            }
		            this.finalizer = finalizer;
		            this.finish();
		            return this;
		        },
		
		        finishUnaryExpression: function (operator, argument) {
		            this.type = (operator === '++' || operator === '--') ? Syntax.UpdateExpression : Syntax.UnaryExpression;
		            this.operator = operator;
		            this.argument = argument;
		            this.prefix = true;
		            this.finish();
		            return this;
		        },
		
		        finishVariableDeclaration: function (declarations, kind) {
		            this.type = Syntax.VariableDeclaration;
		            this.declarations = declarations;
		            this.kind = kind;
		            this.finish();
		            return this;
		        },
		
		        finishVariableDeclarator: function (id, init) {
		            this.type = Syntax.VariableDeclarator;
		            this.id = id;
		            this.init = init;
		            this.finish();
		            return this;
		        },
		
		        finishWhileStatement: function (test, body) {
		            this.type = Syntax.WhileStatement;
		            this.test = test;
		            this.body = body ? body : recoveredNode(this, 'Statement'); //ORION
		            this.finish();
		            return this;
		        },
		
		        finishWithStatement: function (object, body) {
		            this.type = Syntax.WithStatement;
		            this.object = object;
		            this.body = body ? body : recoveredNode(this, 'Statement'); //ORION
		            this.finish();
		            return this;
		        }
		    };
		
		    function createError(line, pos, description, token) {
		        var error = new Error('Line ' + line + ': ' + description);
		        error.index = pos;
		        error.lineNumber = line;
		        error.column = pos - (scanning ? lineStart : lastLineStart) + 1;
		        error.description = description;
		        //ORION 
		        if(token) {
		        	var tok = token;
		        	if(token.type === 2 && extra && Array.isArray(extra.tokens) && extra.tokens.length > 0) {
		        		tok = extra.tokens[extra.tokens.length-1]; //grab the previous token
		        	}
		            error.index = typeof(tok.start) === 'number' ? tok.start : tok.range[0];
		            error.token = tok.value;
		            error.end = typeof(tok.end) === 'number' ? tok.end : tok.range[1];
		        }
		        return error;
		    }
		
		    // Throw an exception
		
		    function throwError(messageFormat) {
		        var args, msg;
		
		        args = Array.prototype.slice.call(arguments, 1);
		        msg = messageFormat.replace(/%(\d)/g,
		            function (whole, idx) {
		                assert(idx < args.length, 'Message reference must be in range');
		                return args[idx];
		                }
		            );
		
		        throw createError(lastLineNumber, lastIndex, msg);
		        }
		
		    function tolerateError(messageFormat) {
		        var args, msg, error;
		
		        args = Array.prototype.slice.call(arguments, 1);
		        /* istanbul ignore next */
		        msg = messageFormat.replace(/%(\d)/g,
		            function (whole, idx) {
		                assert(idx < args.length, 'Message reference must be in range');
		                return args[idx];
		    }
		        );
		
		        error = createError(lineNumber, lastIndex, msg);
		            if (extra.errors) {
		                extra.errors.push(error);
		            } else {
		            throw error;
		        }
		    }
		
		
		    // Throw an exception because of the token.
		
		    function unexpectedTokenError(token, message, value) {
		        var msg = message || Messages.UnexpectedToken;
		
		        if (token && !message) {
		            msg = (token.type === Token.EOF) ? Messages.UnexpectedEOS :
		                (token.type === Token.Identifier) ? Messages.UnexpectedIdentifier :
		                (token.type === Token.NumericLiteral) ? Messages.UnexpectedNumber :
		                (token.type === Token.StringLiteral) ? Messages.UnexpectedString :
		                Messages.UnexpectedToken;
		
		            if (token.type === Token.Keyword) {
		                if (isFutureReservedWord(token.value)) {
		                        msg = Messages.UnexpectedReserved;
		                } else if (strict && isStrictModeReservedWord(token.value)) {
		                        msg = Messages.StrictReservedWord;
		                }
		            }
		        }
		        //ORION
		        var val = value != null ? value : ( token ? token.value : 'ILLEGAL');
		        msg = msg.replace('%0', val);
		
		        return (token && typeof token.lineNumber === 'number') ?
		            createError(token.lineNumber, token.start, msg, token) :
		            createError(scanning ? lineNumber : lastLineNumber, scanning ? index : lastIndex, msg, token);
		    }
		
		    function throwUnexpectedToken(token, message) {
		        throw unexpectedTokenError(token, message);
		    }
		
		    function tolerateUnexpectedToken(token, message, value) {
		        var error = unexpectedTokenError(token, message, value);
		        if (extra.errors) {
		            extra.errors.push(error);
		        } else {
		            throw error;
		        }
		    }
		
		    // Expect the next token to match the specified punctuator.
		    // If not, an exception will be thrown.
		
		    function expect(value) {
		        var token = lex();
		        if (token.type !== Token.Punctuator || token.value !== value) {
		            throwUnexpectedToken(token);
		        }
		    }
		
		    /**
		     * @name expectCommaSeparator
		     * @description Quietly expect a comma when in tolerant mode, otherwise delegates
		     * to <code>expect(value)</code>
		     * @since 2.0
		     */
		    function expectCommaSeparator(closing) {
		        var token;
		
		        if(extra.errors) {
		            token = lookahead;
		            if (token.type === Token.Punctuator && token.value === ',') {
		        		lex();
		            } else if (token.type === Token.Punctuator && token.value === ';') {
		                lex();
		                if(lookahead.value === closing) {
		                	tolerateUnexpectedToken(token, Messages.UnexpectedToken, ';');
		                } else {
			                var value = (closing && closing !== token.value) ? closing : ';';
			                //ORION we want the previous token
			                if(extra.tokens && extra.tokens.length > 0) {
			        			token = extra.tokens[extra.tokens.length-2];
			        		}
			                tolerateUnexpectedToken(token, Messages.MissingToken, value);
		                }
		            } else if(token.type !== Token.EOF){
		                //ORION we want the previous token and don't report missing on EOF
		                if(extra.tokens && extra.tokens.length > 0) {
		        			token = extra.tokens[extra.tokens.length-2];
		        		}
		                tolerateUnexpectedToken(token, Messages.MissingToken, ',');
		        	}
		        } else {
		            expect(',');
				}
		    }
		
		    // Expect the next token to match the specified keyword.
		    // If not, an exception will be thrown.
		
		    function expectKeyword(keyword) {
		        var token = lex();
		        if (token.type !== Token.Keyword || token.value !== keyword) {
		            throwUnexpectedToken(token);
		        }
		    }
		
		    // Return true if the next token matches the specified punctuator.
		
		    function match(value) {
		        return lookahead.type === Token.Punctuator && lookahead.value === value;
		    }
		
		    // Return true if the next token matches the specified keyword
		
		    function matchKeyword(keyword) {
		        return lookahead.type === Token.Keyword && lookahead.value === keyword;
		    }
		
		    // Return true if the next token is an assignment operator
		
		    function matchAssign() {
		        var op;
		
		        if (lookahead.type !== Token.Punctuator) {
		            return false;
		        }
		        op = lookahead.value;
		        return op === '=' ||
		            op === '*=' ||
		            op === '/=' ||
		            op === '%=' ||
		            op === '+=' ||
		            op === '-=' ||
		            op === '<<=' ||
		            op === '>>=' ||
		            op === '>>>=' ||
		            op === '&=' ||
		            op === '^=' ||
		            op === '|=';
		    }
		    
		    //ORION
		    function consumeSemicolon() {
		        try {
		            // Catch the very common case first: immediately a semicolon (U+003B).
		            if (source.charCodeAt(startIndex) === 0x3B || match(';')) {
		                lex();
		                return;
		            }
		    
		            if (hasLineTerminator) {
		                return;
		            }
		    
		            // FIXME(ikarienator): this is seemingly an issue in the previous location info convention.
		            lastIndex = startIndex;
		            lastLineNumber = startLineNumber;
		            lastLineStart = startLineStart;
		    
		            if (lookahead.type !== Token.EOF && !match('}')) {
		                var badToken = lookahead;
		                if (extra.errors) {
		                    rewind(startLineStart); // ORION mutates lookahead
		                }
		                //tolerateUnexpectedToken(badToken);
		                throwUnexpectedToken(badToken);
		            }
		        }
		        catch(e) {
		            if(extra.errors) {
		                recordError(e);
		                return;
		            } else {
		                throw e;
		            }
		        }
		    }
		
		    // Return true if provided expression is LeftHandSideExpression
		
		    function isLeftHandSide(expr) {
		        return expr.type === Syntax.Identifier || expr.type === Syntax.MemberExpression;
		    }
		
		    // 11.1.4 Array Initialiser
		
		    function parseArrayInitialiser() {
		        var elements = [], node = new Node();
		
		        expect('[');
		
		        while (!match(']')) {
		            if (match(',')) {
		                lex();
		                elements.push(null);
		            } else {
		                elements.push(parseAssignmentExpression());
		
		                if (!match(']')) {
		                    expect(',');
		                }
		            }
		        }
		
		        lex();
		
		        return node.finishArrayExpression(elements);
		    }
		
		    // 11.1.5 Object Initialiser
		
		    function parsePropertyFunction(param, first) {
		        var previousStrict, body, node = new Node();
		
		        previousStrict = strict;
		        body = parseFunctionSourceElements();
		        if (first && strict && isRestrictedWord(param[0].name)) {
		            tolerateUnexpectedToken(first, Messages.StrictParamName);
		        }
		        strict = previousStrict;
		        return node.finishFunctionExpression(null, param, [], body);
		    }
		
		    function parsePropertyMethodFunction() {
		        var previousStrict, param, method;
		
		        previousStrict = strict;
		        strict = true;
		        param = parseParams();
		        method = parsePropertyFunction(param.params);
		        strict = previousStrict;
		
		        return method;
		    }
		
		    function parseObjectPropertyKey() {
		        var token, node = new Node();
		
		        token = lex();
		
		        // Note: This function is called only from parseObjectProperty(), where
		        // EOF and Punctuator tokens are already filtered out.
		
		        if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
		            if (strict && token.octal) {
		                tolerateUnexpectedToken(token, Messages.StrictOctalLiteral);
		            }
		            return node.finishLiteral(token);
		        }
		
		        return node.finishIdentifier(token.value);
		    }
		    
		    //ORION
		    function parseObjectProperty() {
		        var token, key, id, value, param, node = new Node();
		
		        token = lookahead;
		
		        if (token.type === Token.Identifier) {
		
		            id = parseObjectPropertyKey();
		
		            // Property Assignment: Getter and Setter.
		
		            if (token.value === 'get' && !(match(':') || match('('))) {
		                key = parseObjectPropertyKey();
		                expect('(');
		                expect(')');
		                value = parsePropertyFunction([]);
		                return node.finishProperty('get', key, value, false, false);
		            }
		            if (token.value === 'set' && !(match(':') || match('('))) {
		                key = parseObjectPropertyKey();
		                expect('(');
		                token = lookahead;
		                if (token.type !== Token.Identifier) {
		                    expect(')');
		                    tolerateUnexpectedToken(token);
		                    value = parsePropertyFunction([]);
		                } else {
		                    param = [ parseVariableIdentifier() ];
		                    expect(')');
		                    value = parsePropertyFunction(param, token);
		                }
		                return node.finishProperty('set', key, value, false, false);
		            }
		            return recoverProperty(token, id, node);
		        }
		        if (token.type === Token.EOF || token.type === Token.Punctuator) {
		            throwUnexpectedToken(token);
		        } else {
		            return recoverProperty(token, parseObjectPropertyKey(), node);
		        }
		    }
		
		    function parseObjectInitialiser() {
		        var properties = [], property, name, key, kind, map = {}, toString = String, node = new Node();
		
		        expect('{');
		
		        while (!match('}')) {
		            property = parseObjectProperty();
		            if(property == null || typeof property === 'undefined') {
		                continue;
		            }
		            if (property.key.type === Syntax.Identifier) {
		                name = property.key.name;
		            } else {
		                name = toString(property.key.value);
		            }
		            kind = (property.kind === 'init') ? PropertyKind.Data : (property.kind === 'get') ? PropertyKind.Get : PropertyKind.Set;
		
		            key = '$' + name;
		            if (Object.prototype.hasOwnProperty.call(map, key)) {
		                if (map[key] === PropertyKind.Data) {
		                    if (strict && kind === PropertyKind.Data) {
		                        tolerateError(Messages.StrictDuplicateProperty);
		                    } else if (kind !== PropertyKind.Data) {
		                        tolerateError(Messages.AccessorDataProperty);
		                    }
		                } else {
		                    if (kind === PropertyKind.Data) {
		                        tolerateError(Messages.AccessorDataProperty);
		                    } else if (map[key] & kind) {
		                        tolerateError(Messages.AccessorGetSet);
		                    }
		                }
		                map[key] |= kind;
		            } else {
		                map[key] = kind;
		            }
		
		            properties.push(property);
		
		            if (!match('}')) {
		                expectCommaSeparator('}');
		            }
		        }
		
		        expect('}');
		
		        return node.finishObjectExpression(properties);
		    }
		
		    // 11.1.6 The Grouping Operator
		
		    function parseGroupExpression() {
		        var expr;
		
		        expect('(');
		
		        if (match(')')) {
		            lex();
		            return PlaceHolders.ArrowParameterPlaceHolder;
		        }
		
		        ++state.parenthesisCount;
		
		        expr = parseExpression();
		
		        expect(')');
		
		        return expr;
		    }
		
		
		    // 11.1 Primary Expressions
		
		    function parsePrimaryExpression() {
		        var type, token, expr, node;
		
		        if (match('(')) {
		            return parseGroupExpression();
		        }
		
		        if (match('[')) {
		            return parseArrayInitialiser();
		        }
		
		        if (match('{')) {
		            return parseObjectInitialiser();
		        }
		
		        type = lookahead.type;
		        node = new Node();
		
		        if (type === Token.Identifier) {
		            expr =  node.finishIdentifier(lex().value);
		        } else if (type === Token.StringLiteral || type === Token.NumericLiteral) {
		            if (strict && lookahead.octal) {
		                tolerateUnexpectedToken(lookahead, Messages.StrictOctalLiteral);
		            }
		            expr = node.finishLiteral(lex());
		        } else if (type === Token.Keyword) {
		            if (matchKeyword('function')) {
		                return parseFunctionExpression();
		            }
		            if (matchKeyword('this')) {
		                lex();
		                expr = node.finishThisExpression();
		            } else {
		                throwUnexpectedToken(lex());
		            }
		        } else if (type === Token.BooleanLiteral) {
		            token = lex();
		            token.value = (token.value === 'true');
		            expr = node.finishLiteral(token);
		        } else if (type === Token.NullLiteral) {
		            token = lex();
		            token.value = null;
		            expr = node.finishLiteral(token);
		        } else if (match('/') || match('/=')) {
		            index = startIndex;
		
		            if (typeof extra.tokens !== 'undefined') {
		                token = collectRegex();
		            } else {
		                token = scanRegExp();
		            }
		            lex();
		            expr = node.finishLiteral(token);
		        } else {
		            throwUnexpectedToken(lex());
		        }
		
		        return expr;
		    }
		
		    // 11.2 Left-Hand-Side Expressions
		
		    function parseArguments() {
		        var args = [];
		
		        expect('(');
		
		        if (!match(')')) {
		            while (startIndex < length) {
		                args.push(parseAssignmentExpression());
		                if (match(')')) {
		                    break;
		                }
		                expectCommaSeparator(')');
		            }
		        }
		
		        expectSkipTo(')');
		
		        return args;
		    }
		
		    //ORION
		    function parseNonComputedProperty() {
		        var token, node = new Node();
		        try {
		            token = lex();
		            if (!isIdentifierName(token)) {
		                if (extra.errors) {
		                    recoverNonComputedProperty(token);
		                }
		                throwUnexpectedToken(token);
		            }
		        }
		        catch(e) {
		            if (extra.errors) {
		                recordError(e);
		                return recoveredNode(node, Syntax.Identifier);
		            } else {
		                throw e;
		            }
		        }
		        return node.finishIdentifier(token.value);
		    }
		
		    function parseNonComputedMember() {
		        expect('.');
		
		        return parseNonComputedProperty();
		    }
		
		    function parseComputedMember() {
		        var expr;
		
		        expect('[');
		
		        expr = parseExpression();
		
		        expect(']');
		
		        return expr;
		    }
		
		    function parseNewExpression() {
		        var callee, args, node = new Node();
		
		        expectKeyword('new');
		        callee = parseLeftHandSideExpression();
		        args = match('(') ? parseArguments() : [];
		
		        return node.finishNewExpression(callee, args);
		    }
		
		    function parseLeftHandSideExpressionAllowCall() {
		        var expr, args, property, startToken, previousAllowIn = state.allowIn;
		
		        startToken = lookahead;
		        state.allowIn = true;
		        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();
		
		        for (;;) {
		            if (match('.')) {
		                property = parseNonComputedMember();
		                expr = new WrappingNode(startToken).finishMemberExpression('.', expr, property);
		            } else if (match('(')) {
		                args = parseArguments();
		                expr = new WrappingNode(startToken).finishCallExpression(expr, args);
		            } else if (match('[')) {
		                property = parseComputedMember();
		                expr = new WrappingNode(startToken).finishMemberExpression('[', expr, property);
		            } else {
		                break;
		            }
		        }
		        state.allowIn = previousAllowIn;
		
		        return expr;
		    }
		
		    function parseLeftHandSideExpression() {
		        var expr, property, startToken;
		        assert(state.allowIn, 'callee of new expression always allow in keyword.');
		
		        startToken = lookahead;
		
		        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();
		
		        for (;;) {
		            if (match('[')) {
		                property = parseComputedMember();
		                expr = new WrappingNode(startToken).finishMemberExpression('[', expr, property);
		            } else if (match('.')) {
		                property = parseNonComputedMember();
		                expr = new WrappingNode(startToken).finishMemberExpression('.', expr, property);
		            } else {
		                break;
		            }
		        }
		
		        return expr;
		    }
		
		    // 11.3 Postfix Expressions
		
		    function parsePostfixExpression() {
		        var expr, token, startToken = lookahead;
		        expr = parseLeftHandSideExpressionAllowCall();
		
		        if (!hasLineTerminator && lookahead.type === Token.Punctuator) {
		            if (match('++') || match('--')) {
		                // 11.3.1, 11.3.2
		                if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
		                    tolerateError(Messages.StrictLHSPostfix);
		                }
		
		                if (!isLeftHandSide(expr)) {
		                    tolerateError(Messages.InvalidLHSInAssignment);
		                }
		
		                token = lex();
		                expr = new WrappingNode(startToken).finishPostfixExpression(token.value, expr);
		            }
		        }
		        return expr;
		    }
		
		    // 11.4 Unary Operators
		
		    function parseUnaryExpression() {
		        var token, expr, startToken;
		
		        if (lookahead.type !== Token.Punctuator && lookahead.type !== Token.Keyword) {
		            expr = parsePostfixExpression();
		        } else if (match('++') || match('--')) {
		            startToken = lookahead;
		            token = lex();
		            expr = parseUnaryExpression();
		            // 11.4.4, 11.4.5
		            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
		                tolerateError(Messages.StrictLHSPrefix);
		            }
		
		            if (!isLeftHandSide(expr)) {
		                tolerateError(Messages.InvalidLHSInAssignment);
		            }
		
		            expr = new WrappingNode(startToken).finishUnaryExpression(token.value, expr);
		        } else if (match('+') || match('-') || match('~') || match('!')) {
		            startToken = lookahead;
		            token = lex();
		            expr = parseUnaryExpression();
		            expr = new WrappingNode(startToken).finishUnaryExpression(token.value, expr);
		        } else if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
		            startToken = lookahead;
		            token = lex();
		            expr = parseUnaryExpression();
		            expr = new WrappingNode(startToken).finishUnaryExpression(token.value, expr);
		            if (strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
		                tolerateError(Messages.StrictDelete);
		            }
		        } else {
		            expr = parsePostfixExpression();
		        }
		
		        return expr;
		    }
		
		    function binaryPrecedence(token, allowIn) {
		        var prec = 0;
		
		        if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
		            return 0;
		        }
		
		        switch (token.value) {
		        case '||':
		            prec = 1;
		            break;
		
		        case '&&':
		            prec = 2;
		            break;
		
		        case '|':
		            prec = 3;
		            break;
		
		        case '^':
		            prec = 4;
		            break;
		
		        case '&':
		            prec = 5;
		            break;
		
		        case '==':
		        case '!=':
		        case '===':
		        case '!==':
		            prec = 6;
		            break;
		
		        case '<':
		        case '>':
		        case '<=':
		        case '>=':
		        case 'instanceof':
		            prec = 7;
		            break;
		
		        case 'in':
		            prec = allowIn ? 7 : 0;
		            break;
		
		        case '<<':
		        case '>>':
		        case '>>>':
		            prec = 8;
		            break;
		
		        case '+':
		        case '-':
		            prec = 9;
		            break;
		
		        case '*':
		        case '/':
		        case '%':
		            prec = 11;
		            break;
		
		        default:
		            break;
		        }
		
		        return prec;
		    }
		
		    // 11.5 Multiplicative Operators
		    // 11.6 Additive Operators
		    // 11.7 Bitwise Shift Operators
		    // 11.8 Relational Operators
		    // 11.9 Equality Operators
		    // 11.10 Binary Bitwise Operators
		    // 11.11 Binary Logical Operators
		
		    function parseBinaryExpression() {
		        var marker, markers, expr, token, prec, stack, right, operator, left, i;
		
		        marker = lookahead;
		        left = parseUnaryExpression();
		        if (left === PlaceHolders.ArrowParameterPlaceHolder) {
		            return left;
		        }
		
		        token = lookahead;
		        prec = binaryPrecedence(token, state.allowIn);
		        if (prec === 0) {
		            return left;
		        }
		        token.prec = prec;
		        lex();
		
		        markers = [marker, lookahead];
		        right = parseUnaryExpression();
		
		        stack = [left, token, right];
		
		        while ((prec = binaryPrecedence(lookahead, state.allowIn)) > 0) {
		
		            // Reduce: make a binary expression from the three topmost entries.
		            while ((stack.length > 2) && (prec <= stack[stack.length - 2].prec)) {
		                right = stack.pop();
		                operator = stack.pop().value;
		                left = stack.pop();
		                markers.pop();
		                expr = new WrappingNode(markers[markers.length - 1]).finishBinaryExpression(operator, left, right);
		                stack.push(expr);
		            }
		
		            // Shift.
		            token = lex();
		            token.prec = prec;
		            stack.push(token);
		            markers.push(lookahead);
		            expr = parseUnaryExpression();
		            stack.push(expr);
		        }
		
		        // Final reduce to clean-up the stack.
		        i = stack.length - 1;
		        expr = stack[i];
		        markers.pop();
		        while (i > 1) {
		            expr = new WrappingNode(markers.pop()).finishBinaryExpression(stack[i - 1].value, stack[i - 2], expr);
		            i -= 2;
		        }
		
		        return expr;
		    }
		
		
		    // 11.12 Conditional Operator
		
		    function parseConditionalExpression() {
		        var expr, previousAllowIn, consequent, alternate, startToken;
		
		        startToken = lookahead;
		
		        expr = parseBinaryExpression();
		        if (expr === PlaceHolders.ArrowParameterPlaceHolder) {
		            return expr;
		        }
		        if (match('?')) {
		            lex();
		            previousAllowIn = state.allowIn;
		            state.allowIn = true;
		            consequent = parseAssignmentExpression();
		            state.allowIn = previousAllowIn;
		            expect(':');
		            alternate = parseAssignmentExpression();
		
		            expr = new WrappingNode(startToken).finishConditionalExpression(expr, consequent, alternate);
		        }
		
		        return expr;
		    }
		
		    // [ES6] 14.2 Arrow Function
		
		    function parseConciseBody() {
		        if (match('{')) {
		            return parseFunctionSourceElements();
		        }
		        return parseAssignmentExpression();
		    }
		
		    function reinterpretAsCoverFormalsList(expressions) {
		        var i, len, param, params, defaults, defaultCount, options, rest, token;
		
		        params = [];
		        defaults = [];
		        defaultCount = 0;
		        rest = null;
		        options = {
		            paramSet: {}
		        };
		
		        for (i = 0, len = expressions.length; i < len; i += 1) {
		            param = expressions[i];
		            if (param.type === Syntax.Identifier) {
		                params.push(param);
		                defaults.push(null);
		                validateParam(options, param, param.name);
		            } else if (param.type === Syntax.AssignmentExpression) {
		                params.push(param.left);
		                defaults.push(param.right);
		                ++defaultCount;
		                validateParam(options, param.left, param.left.name);
		            } else {
		                return null;
		            }
		        }
		
		        if (options.message === Messages.StrictParamDupe) {
		            token = strict ? options.stricted : options.firstRestricted;
		            throwUnexpectedToken(token, options.message);
		        }
		
		        if (defaultCount === 0) {
		            defaults = [];
		        }
		
		        return {
		            params: params,
		            defaults: defaults,
		            rest: rest,
		            stricted: options.stricted,
		            firstRestricted: options.firstRestricted,
		            message: options.message
		        };
		    }
		
		    function parseArrowFunctionExpression(options, node) {
		        var previousStrict, body;
		
		        expect('=>');
		        previousStrict = strict;
		
		        body = parseConciseBody();
		
		        if (strict && options.firstRestricted) {
		            throwUnexpectedToken(options.firstRestricted, options.message);
		        }
		        if (strict && options.stricted) {
		            tolerateUnexpectedToken(options.stricted, options.message);
		        }
		
		        strict = previousStrict;
		
		        return node.finishArrowFunctionExpression(options.params, options.defaults, body, body.type !== Syntax.BlockStatement);
		    }
		
		    // 11.13 Assignment Operators
		
		    function parseAssignmentExpression() {
		        var oldParenthesisCount, token, expr, right, list, startToken;
		
		        oldParenthesisCount = state.parenthesisCount;
		
		        startToken = lookahead;
		        token = lookahead;
		
		        expr = parseConditionalExpression();
		
		        if (expr === PlaceHolders.ArrowParameterPlaceHolder || match('=>')) {
		            if (state.parenthesisCount === oldParenthesisCount ||
		                    state.parenthesisCount === (oldParenthesisCount + 1)) {
		                if (expr.type === Syntax.Identifier) {
		                    list = reinterpretAsCoverFormalsList([ expr ]);
		                } else if (expr.type === Syntax.AssignmentExpression) {
		                    list = reinterpretAsCoverFormalsList([ expr ]);
		                } else if (expr.type === Syntax.SequenceExpression) {
		                    list = reinterpretAsCoverFormalsList(expr.expressions);
		                } else if (expr === PlaceHolders.ArrowParameterPlaceHolder) {
		                    list = reinterpretAsCoverFormalsList([]);
		                }
		                if (list) {
		                    return parseArrowFunctionExpression(list, new WrappingNode(startToken));
		                }
		            }
		        }
		
		        if (matchAssign()) {
		            // LeftHandSideExpression
		            if (!isLeftHandSide(expr)) {
		                tolerateError(Messages.InvalidLHSInAssignment);
		            }
		
		            // 11.13.1
		            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
		                tolerateUnexpectedToken(token, Messages.StrictLHSAssignment);
		            }
		
		            token = lex();
		            right = parseAssignmentExpression();
		            expr = new WrappingNode(startToken).finishAssignmentExpression(token.value, expr, right);
		        }
		
		        return expr;
		    }
		
		    // 11.14 Comma Operator
		
		    function parseExpression() {
		        var expr, startToken = lookahead, expressions;
		
		        expr = parseAssignmentExpression();
		
		        if (match(',')) {
		            expressions = [expr];
		
		            while (startIndex < length) {
		                if (!match(',')) {
		                    break;
		                }
		                lex();
		                expressions.push(parseAssignmentExpression());
		            }
		
		            expr = new WrappingNode(startToken).finishSequenceExpression(expressions);
		        }
		
		        return expr;
		    }
		
		    // 12.1 Block
		
		    function parseStatementList() {
		        var element, list = [];
		        var strt = index;
		         while (startIndex < length) {
		             if (match('}')) {
		                 break;
		             }
		             //ORION
		             element = parseSourceElement();
		            if (typeof element === 'undefined' || strt === index) {
		                break;
		             }
		            list.push(element);
		            strt = index;
		        }
		
		        return list;
		    }
		
		    function parseBlock() {
		        var block, node = new Node();
		
		        expect('{');
		
		        block = parseStatementList();
		
		        expectSkipTo('}');
		
		        return node.finishBlockStatement(block);
		    }
		
		    // 12.2 Variable Statement
		
		    function parseVariableIdentifier() {
		        var token, node = new Node();
		
		        token = lex();
		
		        if (token.type !== Token.Identifier) {
		            if (strict && token.type === Token.Keyword && isStrictModeReservedWord(token.value)) {
		                tolerateUnexpectedToken(token, Messages.StrictReservedWord);
		            } else {
		                throwUnexpectedToken(token);
		            }
		        }
		
		        return node.finishIdentifier(token.value);
		    }
		
		    function parseVariableDeclaration(kind) {
		        var init = null, id, node = new Node();
		
		        id = parseVariableIdentifier();
		
		        // 12.2.1
		        if (strict && isRestrictedWord(id.name)) {
		            tolerateError(Messages.StrictVarName);
		        }
		
		        if (kind === 'const') {
		            expect('=');
		            init = parseAssignmentExpression();
		        } else if (match('=')) {
		            lex();
		            init = parseAssignmentExpression();
		        }
		
		        return node.finishVariableDeclarator(id, init);
		    }
		
		    function parseVariableDeclarationList(kind) {
		        var list = [];
		
		        do {
		            list.push(parseVariableDeclaration(kind));
		            if (!match(',')) {
		                break;
		            }
		            lex();
		        } while (startIndex < length);
		
		        return list;
		    }
		
		    function parseVariableStatement(node) {
		        var declarations;
		
		        expectKeyword('var');
		
		        declarations = parseVariableDeclarationList();
		
		        consumeSemicolon();
		
		        return node.finishVariableDeclaration(declarations, 'var');
		    }
		
		    // kind may be `const` or `let`
		    // Both are experimental and not in the specification yet.
		    // see http://wiki.ecmascript.org/doku.php?id=harmony:const
		    // and http://wiki.ecmascript.org/doku.php?id=harmony:let
		    function parseConstLetDeclaration(kind) {
		        var declarations, node = new Node();
		
		        expectKeyword(kind);
		
		        declarations = parseVariableDeclarationList(kind);
		
		        consumeSemicolon();
		
		        return node.finishVariableDeclaration(declarations, kind);
		    }
		
		    // 12.3 Empty Statement
		
		    function parseEmptyStatement() {
		        var node = new Node();
		        expect(';');
		        return node.finishEmptyStatement();
		    }
		
		    // 12.4 Expression Statement
		
		    function parseExpressionStatement(node) {
		        var expr = parseExpression();
		        consumeSemicolon();
		        if(!expr) {
		        	expr = recoveredNode(node);  //ORION don't insert null expressions
		        }
		        return node.finishExpressionStatement(expr);
		    }
		
		    // 12.5 If statement
		
		    function parseIfStatement(node) {
		        var test, consequent, alternate;
		
		        expectKeyword('if');
		
		        expect('(');
		
		        test = parseExpression();
		
		        expectSkipTo(')', '{');
		
		        consequent = parseStatement();
				
		        if (matchKeyword('else')) {
		            lex();
		            alternate = parseStatement();
		        } else {
		            alternate = null;
		        }
		
		        return node.finishIfStatement(test, consequent, alternate);
		    }
		
		    // 12.6 Iteration Statements
		
		    function parseDoWhileStatement(node) {
		        var body, test, oldInIteration;
		
		        expectKeyword('do');
		
		        oldInIteration = state.inIteration;
		        state.inIteration = true;
		
		        body = parseStatement();
		
		        state.inIteration = oldInIteration;
		
		        expectKeyword('while');
		
		        expect('(');
		
		        test = parseExpression();
		
		        expectSkipTo(')', '{');
		
		        if (match(';')) {
		            lex();
		        }
		
		        return node.finishDoWhileStatement(body, test);
		    }
		
		    function parseWhileStatement(node) {
		        var test, body, oldInIteration;
		
		        expectKeyword('while');
		
		        expect('(');
		
		        test = parseExpression();
		
		        expectSkipTo(')', '{');
		
		        oldInIteration = state.inIteration;
		        state.inIteration = true;
		
		        body = parseStatement();
		
		        state.inIteration = oldInIteration;
		
		        return node.finishWhileStatement(test, body);
		    }
		
		    function parseForVariableDeclaration() {
		        var token, declarations, node = new Node();
		
		        token = lex();
		        declarations = parseVariableDeclarationList();
		
		        return node.finishVariableDeclaration(declarations, token.value);
		    }
		
		    function parseForStatement(node) {
		        var init, test, update, left, right, body, oldInIteration, previousAllowIn = state.allowIn;
		
		        init = test = update = null;
		
		        expectKeyword('for');
		
		        expect('(');
		
		        if (match(';')) {
		            lex();
		        } else {
		            if (matchKeyword('var') || matchKeyword('let')) {
		                state.allowIn = false;
		                init = parseForVariableDeclaration();
		                state.allowIn = previousAllowIn;
		
		                if (init.declarations.length === 1 && matchKeyword('in')) {
		                    lex();
		                    left = init;
		                    right = parseExpression();
		                    init = null;
		                }
		            } else {
		                state.allowIn = false;
		                init = parseExpression();
		                state.allowIn = previousAllowIn;
		
		                if (matchKeyword('in')) {
		                    // LeftHandSideExpression
		                    if (!isLeftHandSide(init)) {
		                        tolerateError(Messages.InvalidLHSInForIn);
		                    }
		
		                    lex();
		                    left = init;
		                    right = parseExpression();
		                    init = null;
		                }
		            }
		
		            if (typeof left === 'undefined') {
		                expect(';');
		            }
		        }
		
		        if (typeof left === 'undefined') {
		
		            if (!match(';')) {
		                test = parseExpression();
		            }
		            expect(';');
		
		            if (!match(')')) {
		                update = parseExpression();
		            }
		        }
		
		        expectSkipTo(')', '{');
		
		        oldInIteration = state.inIteration;
		        state.inIteration = true;
		
		        body = parseStatement();
		
		        state.inIteration = oldInIteration;
		
		        return (typeof left === 'undefined') ?
		                node.finishForStatement(init, test, update, body) :
		                node.finishForInStatement(left, right, body);
		    }
		
		    // 12.7 The continue statement
		
		    function parseContinueStatement(node) {
		        var label = null, key;
		
		        expectKeyword('continue');
		
		        // Optimize the most common form: 'continue;'.
		        if (source.charCodeAt(startIndex) === 0x3B) {
		            lex();
		
		            if (!state.inIteration) {
		                throwError(Messages.IllegalContinue);
		            }
		
		            return node.finishContinueStatement(null);
		        }
		
		        if (hasLineTerminator) {
		            if (!state.inIteration) {
		                throwError(Messages.IllegalContinue);
		            }
		
		            return node.finishContinueStatement(null);
		        }
		
		        if (lookahead.type === Token.Identifier) {
		        	var token = lookahead;
		            label = parseVariableIdentifier();
		
		            key = '$' + label.name;
		            if (!Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
		            	tolerateUnexpectedToken(token, Messages.UnknownLabel, label.name); //ORION
		            }
		        }
		
		        consumeSemicolon();
		
		        if (label === null && !state.inIteration) {
		            throwError(Messages.IllegalContinue);
		        }
		
		        return node.finishContinueStatement(label);
		    }
		
		    // 12.8 The break statement
		
		    function parseBreakStatement(node) {
		        var label = null, key;
		
		        expectKeyword('break');
		
		        // Catch the very common case first: immediately a semicolon (U+003B).
		        if (source.charCodeAt(lastIndex) === 0x3B) {
		            lex();
		
		            if (!(state.inIteration || state.inSwitch)) {
		                throwError(Messages.IllegalBreak);
		            }
		
		            return node.finishBreakStatement(null);
		        }
		
		        if (hasLineTerminator) {
		            if (!(state.inIteration || state.inSwitch)) {
		                throwError(Messages.IllegalBreak);
		            }
		
		            return node.finishBreakStatement(null);
		        }
		
		        if (lookahead.type === Token.Identifier) {
		            label = parseVariableIdentifier();
		
		            key = '$' + label.name;
		            if (!Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
		                throwError(Messages.UnknownLabel, label.name);
		            }
		        }
		
		        consumeSemicolon();
		
		        if (label === null && !(state.inIteration || state.inSwitch)) {
		            throwError(Messages.IllegalBreak);
		        }
		
		        return node.finishBreakStatement(label);
		    }
		
		    // 12.9 The return statement
		
		    function parseReturnStatement(node) {
		        var argument = null, token = lookahead;
				
		        expectKeyword('return');
		
		        if (!state.inFunctionBody) {
		        	//ORION
		        	tolerateUnexpectedToken(token, Messages.IllegalReturn, token.value);
		            //tolerateError();
		        }
		
		        // 'return' followed by a space and an identifier is very common.
		        if (source.charCodeAt(lastIndex) === 0x20) {
		            if (isIdentifierStart(source.charCodeAt(lastIndex + 1))) {
		                argument = parseExpression();
		                consumeSemicolon();
		                return node.finishReturnStatement(argument);
		            }
		        }
		
		        if (hasLineTerminator) {
		            // HACK
		            return node.finishReturnStatement(null);
		        }
		
		        if (!match(';')) {
		            if (!match('}') && lookahead.type !== Token.EOF) {
		                argument = parseExpression();
		            }
		        }
		
		        consumeSemicolon();
		
		        return node.finishReturnStatement(argument);
		    }
		
		    // 12.10 The with statement
		
		    function parseWithStatement(node) {
		        var object, body;
		
		        if (strict) {
		            tolerateError(Messages.StrictModeWith);
		        }
		
		        expectKeyword('with');
		
		        expect('(');
		
		        object = parseExpression();
		
		        expectSkipTo(')', '{');
		
		        body = parseStatement();
		
		        return node.finishWithStatement(object, body);
		    }
		
		    // 12.10 The swith statement
		
		    function parseSwitchCase() {
		        var test, consequent = [], statement, node = new Node();
		
		        if (matchKeyword('default')) {
		            lex();
		            test = null;
		        } else {
		            expectKeyword('case');
		            test = parseExpression();
		        }
		        //ORION
		        if(match(':')) {
		        	lex();
		        }
		    	var start = index; //ORION prevent infinite loops by checking if the index moved
		        while (startIndex < length) {
		            if (match('}') || matchKeyword('default') || matchKeyword('case')) {
		                break;
		            }
		            statement = parseStatement();
		            if(typeof statement === 'undefined' || statement === null) {
		                break;
		            }
		            consequent.push(statement);
		            if(start === index) {
		                break;
		            }
		            start = index;
		        }
		
		        return node.finishSwitchCase(test, consequent);
		    }
		
		    function parseSwitchStatement(node) {
		        var discriminant, cases, clause, oldInSwitch, defaultFound;
		
		        expectKeyword('switch');
		
		        expect('(');
		
		        discriminant = parseExpression();
		
		        expect(')');
		
		        expect('{');
		
		        cases = [];
		
		        if (match('}')) {
		            lex();
		            return node.finishSwitchStatement(discriminant, cases);
		        }
		
		        oldInSwitch = state.inSwitch;
		        state.inSwitch = true;
		        defaultFound = false;
		
		        while (startIndex < length) {
		            if (match('}')) {
		                break;
		            }
		            clause = parseSwitchCase();
		            if (clause.test === null) {
		                if (defaultFound) {
		                    throwError(Messages.MultipleDefaultsInSwitch);
		                }
		                defaultFound = true;
		            }
		            cases.push(clause);
		        }
		
		        state.inSwitch = oldInSwitch;
		
		        expect('}');
		
		        return node.finishSwitchStatement(discriminant, cases);
		    }
		
		    // 12.13 The throw statement
		
		    function parseThrowStatement(node) {
		        var argument;
		
		        expectKeyword('throw');
		
		        if (hasLineTerminator) {
		            throwError(Messages.NewlineAfterThrow);
		        }
		
		        argument = parseExpression();
		
		        consumeSemicolon();
		
		        return node.finishThrowStatement(argument);
		    }
		
		    // 12.14 The try statement
		
		    function parseCatchClause() {
		        var param, body, node = new Node();
		
		        expectKeyword('catch');
		
		        expect('(');
		        if (match(')')) {
		            throwUnexpectedToken(lookahead);
		        }
		
		        param = parseVariableIdentifier();
		        // 12.14.1
		        if (strict && isRestrictedWord(param.name)) {
		            tolerateError(Messages.StrictCatchVariable);
		        }
		
		        expect(')');
		        body = parseBlock();
		        return node.finishCatchClause(param, body);
		    }
		
		    function parseTryStatement(node) {
		        var block, handlers = [], finalizer = null;
		
		        expectKeyword('try');
		
		        block = parseBlock();
		
		        if (matchKeyword('catch')) {
		            handlers.push(parseCatchClause());
		        }
		
		        if (matchKeyword('finally')) {
		            lex();
		            finalizer = parseBlock();
		        }
		
		        if (handlers.length === 0 && !finalizer) {
		            throwError(Messages.NoCatchOrFinally);
		        }
		
		        return node.finishTryStatement(block, [], handlers, finalizer);
		    }
		
		    // 12.15 The debugger statement
		
		    function parseDebuggerStatement(node) {
		        expectKeyword('debugger');
		
		        consumeSemicolon();
		
		        return node.finishDebuggerStatement();
		    }
		
		    // 12 Statements
		
		    function parseStatement() {
		        var type = lookahead.type,
		            expr,
		            labeledBody,
		            key,
		            node;
		
		        if (type === Token.EOF) {
		            throwUnexpectedToken(lookahead);
		        }
		
		        if (type === Token.Punctuator && lookahead.value === '{') {
		            return parseBlock();
		        }
		
		        node = new Node();
		
		        if (type === Token.Punctuator) {
		            switch (lookahead.value) {
		            case ';':
		                return parseEmptyStatement(node);
		            case '(':
		                return parseExpressionStatement(node);
		            default:
		                break;
		            }
		        } else if (type === Token.Keyword) {
		            switch (lookahead.value) {
		            case 'break':
		                return parseBreakStatement(node);
		            case 'continue':
		                return parseContinueStatement(node);
		            case 'debugger':
		                return parseDebuggerStatement(node);
		            case 'do':
		                return parseDoWhileStatement(node);
		            case 'for':
		                return parseForStatement(node);
		            case 'function':
		                return parseFunctionDeclaration(node);
		            case 'if':
		                return parseIfStatement(node);
		            case 'return':
		                return parseReturnStatement(node);
		            case 'switch':
		                return parseSwitchStatement(node);
		            case 'throw':
		                return parseThrowStatement(node);
		            case 'try':
		                return parseTryStatement(node);
		            case 'var':
		                return parseVariableStatement(node);
		            case 'while':
		                return parseWhileStatement(node);
		            case 'with':
		                return parseWithStatement(node);
		            default:
		                break;
		            }
		        }
		
		        expr = parseExpression();
		
		        // 12.12 Labelled Statements
		        //ORION check if the expression failed to parse
		        if (expr && (expr.type === Syntax.Identifier) && match(':')) {
		            lex();
		
		            key = '$' + expr.name;
		            if (Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
		                throwError(Messages.Redeclaration, 'Label', expr.name);
		            }
		
		            state.labelSet[key] = true;
		            labeledBody = parseStatement();
		            delete state.labelSet[key];
		            return node.finishLabeledStatement(expr, labeledBody);
		        }
		
		        consumeSemicolon();
				if(!expr) {
					expr = recoveredNode(node); //ORION do not set a null expression
				}
		        return node.finishExpressionStatement(expr);
		    }
		
		    // 13 Function Definition
		
		    function parseFunctionSourceElements() {
		        var sourceElement, sourceElements = [], token, directive, firstRestricted,
		            oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody, oldParenthesisCount,
		            node = new Node();
		
		        expect('{');
		
		        while (startIndex < length) {
		            if (lookahead.type !== Token.StringLiteral) {
		                break;
		            }
		            token = lookahead;
		
		            sourceElement = parseSourceElement();
		            sourceElements.push(sourceElement);
		            if (sourceElement.expression.type !== Syntax.Literal) {
		                // this is not directive
		                break;
		            }
		            directive = source.slice(token.start + 1, token.end - 1);
		            if (directive === 'use strict') {
		                strict = true;
		                if (firstRestricted) {
		                    tolerateUnexpectedToken(firstRestricted, Messages.StrictOctalLiteral);
		                }
		            } else {
		                if (!firstRestricted && token.octal) {
		                    firstRestricted = token;
		                }
		            }
		        }
		
		        oldLabelSet = state.labelSet;
		        oldInIteration = state.inIteration;
		        oldInSwitch = state.inSwitch;
		        oldInFunctionBody = state.inFunctionBody;
		        oldParenthesisCount = state.parenthesizedCount;
		
		        state.labelSet = {};
		        state.inIteration = false;
		        state.inSwitch = false;
		        state.inFunctionBody = true;
		        state.parenthesizedCount = 0;
		        var start = index; //ORION 8.0 prevent infinite loops by checking for index movement
		        while (index < length) {
		            if (match('}')) {
		                break;
		            }
		            sourceElement = parseSourceElement();
		            if (typeof sourceElement === 'undefined' || sourceElement == null) {
		                break;
		            }
		            sourceElements.push(sourceElement);
		            if(start === index) {
		                break;
		            }
		            start = index;
		        }
		
		        expectSkipTo('}');
		
		        state.labelSet = oldLabelSet;
		        state.inIteration = oldInIteration;
		        state.inSwitch = oldInSwitch;
		        state.inFunctionBody = oldInFunctionBody;
		        state.parenthesizedCount = oldParenthesisCount;
		
		        return node.finishBlockStatement(sourceElements);
		    }
		
		    function validateParam(options, param, name) {
		        var key = '$' + name;
		        if (strict) {
		            if (isRestrictedWord(name)) {
		                options.stricted = param;
		                options.message = Messages.StrictParamName;
		            }
		            if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
		                options.stricted = param;
		                options.message = Messages.StrictParamDupe;
		            }
		        } else if (!options.firstRestricted) {
		            if (isRestrictedWord(name)) {
		                options.firstRestricted = param;
		                options.message = Messages.StrictParamName;
		            } else if (isStrictModeReservedWord(name)) {
		                options.firstRestricted = param;
		                options.message = Messages.StrictReservedWord;
		            } else if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
		                options.firstRestricted = param;
		                options.message = Messages.StrictParamDupe;
		            }
		        }
		        options.paramSet[key] = true;
		    }
		
		    function parseParam(options) {
		        var token, param, def;
		
		        token = lookahead;
		        param = parseVariableIdentifier();
		        validateParam(options, token, token.value);
		        if (match('=')) {
		            lex();
		            def = parseAssignmentExpression();
		            ++options.defaultCount;
		        }
		
		        options.params.push(param);
		        options.defaults.push(def);
		
		        return !match(')');
		    }
		
		    function parseParams(firstRestricted) {
		        var options;
		
		        options = {
		            params: [],
		            defaultCount: 0,
		            defaults: [],
		            firstRestricted: firstRestricted
		        };
		
		        expect('(');
		
		        if (!match(')')) {
		            options.paramSet = {};
		            while (startIndex < length) {
		                if (!parseParam(options)) {
		                    break;
		                }
		                expect(',');
		            }
		        }
		
		        expect(')');
		
		        if (options.defaultCount === 0) {
		            options.defaults = [];
		        }
		
		        return {
		            params: options.params,
		            defaults: options.defaults,
		            stricted: options.stricted,
		            firstRestricted: options.firstRestricted,
		            message: options.message
		        };
		    }
		
		    function parseFunctionDeclaration() {
		        var id, params = [], defaults = [], body, token, stricted, tmp, firstRestricted, message, previousStrict, node = new Node();
		
		        expectKeyword('function');
		        token = lookahead;
		        id = parseVariableIdentifier();
		        if (strict) {
		            if (isRestrictedWord(token.value)) {
		                tolerateUnexpectedToken(token, Messages.StrictFunctionName);
		            }
		        } else {
		            if (isRestrictedWord(token.value)) {
		                firstRestricted = token;
		                message = Messages.StrictFunctionName;
		            } else if (isStrictModeReservedWord(token.value)) {
		                firstRestricted = token;
		                message = Messages.StrictReservedWord;
		            }
		        }
		
		        tmp = parseParams(firstRestricted);
		        params = tmp.params;
		        defaults = tmp.defaults;
		        stricted = tmp.stricted;
		        firstRestricted = tmp.firstRestricted;
		        if (tmp.message) {
		            message = tmp.message;
		        }
		
		        previousStrict = strict;
		        body = parseFunctionSourceElements();
		        if (strict && firstRestricted) {
		            throwUnexpectedToken(firstRestricted, message);
		        }
		        if (strict && stricted) {
		            tolerateUnexpectedToken(stricted, message);
		        }
		        strict = previousStrict;
		
		        return node.finishFunctionDeclaration(id, params, defaults, body);
		    }
		
		    function parseFunctionExpression() {
		        var token, id = null, stricted, firstRestricted, message, tmp,
		            params = [], defaults = [], body, previousStrict, node = new Node();
		
		        expectKeyword('function');
		
		        if (!match('(')) {
		            token = lookahead;
		            id = parseVariableIdentifier();
		            if (strict) {
		                if (isRestrictedWord(token.value)) {
		                    tolerateUnexpectedToken(token, Messages.StrictFunctionName);
		                }
		            } else {
		                if (isRestrictedWord(token.value)) {
		                    firstRestricted = token;
		                    message = Messages.StrictFunctionName;
		                } else if (isStrictModeReservedWord(token.value)) {
		                    firstRestricted = token;
		                    message = Messages.StrictReservedWord;
		                }
		            }
		        }
		
		        tmp = parseParams(firstRestricted);
		        params = tmp.params;
		        defaults = tmp.defaults;
		        stricted = tmp.stricted;
		        firstRestricted = tmp.firstRestricted;
		        if (tmp.message) {
		            message = tmp.message;
		        }
		
		        previousStrict = strict;
		        body = parseFunctionSourceElements();
		        if (strict && firstRestricted) {
		            throwUnexpectedToken(firstRestricted, message);
		        }
		        if (strict && stricted) {
		            tolerateUnexpectedToken(stricted, message);
		        }
		        strict = previousStrict;
		
		        return node.finishFunctionExpression(id, params, defaults, body);
		    }
		
		    // 14 Program
		
		    function parseSourceElement() {
		        if (lookahead.type === Token.Keyword) {
		            switch (lookahead.value) {
		            case 'const':
		            case 'let':
		                return parseConstLetDeclaration(lookahead.value);
		            case 'function':
		                return parseFunctionDeclaration();
		            default:
		                return parseStatement(); //ORION if we can't determine the type try a statement
		            }
		        }
		
		        if (lookahead.type !== Token.EOF) {  //ORION if we are not at the end keep trying
		            return parseStatement();
		        }
		    }
		
		    function parseSourceElements() {
		        var sourceElement, sourceElements = [], token, directive, firstRestricted;
		
		        while (startIndex < length) {
		            token = lookahead;
		            if (token.type !== Token.StringLiteral) {
		                break;
		            }
		
		            sourceElement = parseSourceElement();
		            sourceElements.push(sourceElement);
		            if (sourceElement.expression.type !== Syntax.Literal) {
		                // this is not directive
		                break;
		            }
		            directive = source.slice(token.start + 1, token.end - 1);
		            if (directive === 'use strict') {
		                strict = true;
		                if (firstRestricted) {
		                    tolerateUnexpectedToken(firstRestricted, Messages.StrictOctalLiteral);
		                }
		            } else {
		                if (!firstRestricted && token.octal) {
		                    firstRestricted = token;
		                }
		            }
		        }
		        //ORION prevent infinite loops by checking index movement
		        var start = index;  
		        while (startIndex < length) {
		            sourceElement = parseSourceElement();
		            /* istanbul ignore if */
		            if (typeof sourceElement === 'undefined' || sourceElement === null) {
		                break;
		            }
		            sourceElements.push(sourceElement);
		            if(start === index) {
		                break;
		            }
		            start = index;
		        }
		        return sourceElements;
		    }
		
		    function parseProgram() {
		        var body, node;
		
		        peek();
		        node = new Node();
		        strict = false;
		
		        body = parseSourceElements();
		        return node.finishProgram(body);
		    }
		
		    function filterTokenLocation() {
		        var i, entry, token, tokens = [];
		
		        for (i = 0; i < extra.tokens.length; ++i) {
		            entry = extra.tokens[i];
		            token = {
		                type: entry.type,
		                value: entry.value
		            };
		            if (entry.regex) {
		                token.regex = {
		                    pattern: entry.regex.pattern,
		                    flags: entry.regex.flags
		                };
		            }
		            if (extra.range) {
		                token.range = entry.range;
		            }
		            if (extra.loc) {
		                token.loc = entry.loc;
		            }
		            tokens.push(token);
		        }
		
		        extra.tokens = tokens;
		    }
		
		    function tokenize(code, options) {
		        var toString,
		            tokens;
		
		        toString = String;
		        if (typeof code !== 'string' && !(code instanceof String)) {
		            code = toString(code);
		        }
		
		        source = code;
		        index = 0;
		        lineNumber = (source.length > 0) ? 1 : 0;
		        lineStart = 0;
		        startIndex = index;
		        startLineNumber = lineNumber;
		        startLineStart = lineStart;
		        length = source.length;
		        lookahead = null;
		        state = {
		            allowIn: true,
		            labelSet: {},
		            inFunctionBody: false,
		            inIteration: false,
		            inSwitch: false,
		            lastCommentStart: -1
		        };
		
		        extra = {};
		
		        // Options matching.
		        options = options || {};
		
		        // Of course we collect tokens here.
		        options.tokens = true;
		        extra.tokens = [];
		        extra.tokenize = true;
		        // The following two fields are necessary to compute the Regex tokens.
		        extra.openParenToken = -1;
		        extra.openCurlyToken = -1;
		
		        extra.range = (typeof options.range === 'boolean') && options.range;
		        extra.loc = (typeof options.loc === 'boolean') && options.loc;
		
		        if (typeof options.comment === 'boolean' && options.comment) {
		            extra.comments = [];
		        }
		        if (typeof options.tolerant === 'boolean' && options.tolerant) {
		            extra.errors = [];
		        }
		
		        try {
		            peek();
		            if (lookahead.type === Token.EOF) {
		                return extra.tokens;
		            }
		
		            lex();
		            while (lookahead.type !== Token.EOF) {
		                try {
		                    lex();
		                } catch (lexError) {
		                    if (extra.errors) {
		                        extra.errors.push(lexError);
		                        // We have to break on the first error
		                        // to avoid infinite loops.
		                        break;
		                    } else {
		                        throw lexError;
		                    }
		                }
		            }
		
		            filterTokenLocation();
		            tokens = extra.tokens;
		            if (typeof extra.comments !== 'undefined') {
		                tokens.comments = extra.comments;
		            }
		            if (typeof extra.errors !== 'undefined') {
		                tokens.errors = extra.errors;
		            }
		        } catch (e) {
		            throw e;
		        } finally {
		            extra = {};
		        }
		        return tokens;
		    }
		
		    function parse(code, options) {
		        var program, toString;
		
		        toString = String;
		        if (typeof code !== 'string' && !(code instanceof String)) {
		            code = toString(code);
		        }
		
		        source = code;
		        index = 0;
		        lineNumber = (source.length > 0) ? 1 : 0;
		        lineStart = 0;
		        startIndex = index;
		        startLineNumber = lineNumber;
		        startLineStart = lineStart;
		        length = source.length;
		        lookahead = null;
		        state = {
		            allowIn: true,
		            labelSet: {},
		            parenthesisCount: 0,
		            inFunctionBody: false,
		            inIteration: false,
		            inSwitch: false,
		            lastCommentStart: -1
		        };
		
		        extra = {};
		        if (typeof options !== 'undefined') {
		        	if(typeof(options.deps) === 'boolean' && options.deps)  { //ORION dependencies
		        		extra.deps = [];
		        		extra.envs = Object.create(null);
		        	}
		            extra.range = (typeof options.range === 'boolean') && options.range;
		            extra.loc = (typeof options.loc === 'boolean') && options.loc;
		            extra.attachComment = (typeof options.attachComment === 'boolean') && options.attachComment;
		
		            if (extra.loc && options.source !== null && options.source !== undefined) {
		                extra.source = toString(options.source);
		            }
		
		            if (typeof options.tokens === 'boolean' && options.tokens) {
		                extra.tokens = [];
		            }
		            if (typeof options.comment === 'boolean' && options.comment) {
		                extra.comments = [];
		            }
		            if (typeof options.tolerant === 'boolean' && options.tolerant) {
		                extra.errors = [];
		                //ORION hijack the parse statements we want to recover from
		                extra.parseStatement = parseStatement;
		                extra.parseExpression = parseExpression;
						
						parseStatement = parseStatementTolerant(parseStatement); // Note special case
						parseExpression = parseTolerant(parseExpression);
		            }
		            if (extra.attachComment) {
		                extra.range = true;
		                extra.comments = [];
		                extra.bottomRightStack = [];
		                extra.trailingComments = [];
		                extra.leadingComments = [];
		            }
		            
		            extra.directSourceFile = options.directSourceFile; //ORION for Tern
		        }
		
		        try {
		            program = parseProgram();
		            if (typeof extra.comments !== 'undefined') {
		                program.comments = extra.comments;
		            }
		            if (typeof extra.tokens !== 'undefined') {
		                filterTokenLocation();
		                program.tokens = extra.tokens;
		            }
		            if (typeof extra.errors !== 'undefined') {
		                program.errors = extra.errors;
		            }
		            if(typeof(extra.deps) !== 'undefined') {
		            	program.dependencies = extra.deps;
		            	program.environments = extra.envs;
		            }
		        } catch (e) {
		            throw e;
		        } finally {
		        	//ORION release the hostages
		            if (typeof extra.errors !== 'undefined') {
		        		parseStatement = extra.parseStatement;
		        		parseExpression = extra.parseExpression;
		        	}
		            extra = {};
		        }
		
		        return program;
		    }
		
		    /**
			 * @description For statements like if, while, for, etc. check for the ')' on the condition. If
			 * it is not present, catch the error, and backtrack if we see a '{' instead (to continue parsing the block)
			 * @throws The original error from  trying to consume the ')' char if not in tolerant mode
			 * @since 5.0
			 */
			function expectSkipTo(value, skipTo) {
		        try {
		            expect(value);
		        } catch (e) {
		            if (extra.errors) {
			            recordError(e);
			            if (skipTo &&  source[e.index] === skipTo) {
			              index = e.index;
			              peek();
			            }
		            } else {
		                throw e;
		            }
		        }
			}
		
		    /**
			 * @name recordError
		     * @description Add the error if not already reported.
		     * @param {Object} error The error object to record
		     * @since 5.0
		     */
		    function recordError(error) {
		        var len = extra.errors.length;
		        for (var e = 0; e < len; e++) {
		            var existing = extra.errors[e];
		            if (existing.index === error.index && existing.message === error.message) {
		                return; // do not add duplicate
		            }
		        }
		        extra.errors.push(error);
		    }
		
		    /**
		     * @description Wraps the given parse function to handle parse failures
		     * @param {Function} parseFunction The function to wrap
		     * @returns {Object} The wrapped function value or <code>undefined</code>
		     * @since 6.0
		     */
		    function parseTolerant(parseFunction) {
		        return function () {
		            try {
		                return parseFunction.apply(null, arguments);
		            } catch (e) {
						recordError(e);
		            }
		        };
		    }
		    
		    /**
		     * @description Wraps the given parse function to handle parse failures
		     * @param {Function} parseFunction The function to wrap
		     * @returns {Object} The wrapped function value or <code>undefined</code>
		     * @since 6.0
		     */
		    function parseStatementTolerant(parseFunction) {
		        return function () {
		        	extra.statementStart = index;
		            try {
		                return parseFunction.apply(null, arguments);
		            } catch (e) {
						recordError(e);
		            }
		        };
		    }
		
		    /**
		     * @descripton Rewind the lex position to the most recent newline or semicolon.  If that turns out
		     * to be the same position as the most recent parsing of a statement was attempted at, 
		     * don't rewind (because it will fail in the same way).  If it turns out to be the same
		     * position as where we last rewound to, don't do it.  Clears the buffer and sets the
		     * index in order to continue lexing from the new position.
		     * @param {Number} linestart The start of the line to rewind to
		     * @since 5.0
		     */
		    function rewind(linestart) {
		        var idx = linestart;
		        while (idx > -1 && source[idx] !== ';' && source[idx] !== '\n') {
		            idx--;
		        }
		        if (idx <= extra.statementStart) {
		            return;
		        }
		        var doRewind = false;
		        if (extra.lastRewindLocation) {
		            doRewind = true;
		        } else {
		            if (extra.lastRewindLocation !== idx) {
		            	doRewind=true;
		            }
		        }	        
		        if (doRewind) {
			        index = idx;
			        rewindTokenStream(linestart);
			        peek(); // recalculate lookahead
			        extra.lastRewindLocation = index;
		        }
		    }
		    
		    /**
		     * @description Rewinds the state of the token stream to make sure we remove stale
		     * tokens when we are re-parsing
		     * @param {Number} offset The index into the source
		     * @returns {Number} The index we stopped rewinding at 
		     * @since 9.0
		     */
		    function rewindTokenStream(offset, more) {
		        var idx = extra.tokens.length-1;
		    	while(idx > -1) {
		    	    var tok = extra.tokens[idx];
		    		if(tok.range[0] < offset) {
		    		    if(more) {
		    		      extra.tokens.pop();
		    		    }
		    			break;
		    		}
		    		idx--;
		    		extra.tokens.pop();
		    	}
		    	return idx;
		    }
		    
		    /**
		     * @description When a problem occurs in parseNonComputedProperty, attempt to reposition 
		     * the lexer to continue processing.
		     * Example: '(foo.)' we will hit the ')' instead of discovering a property and consuming the ')'
		     * will cause the parse of the paretheses to fail, so 'unconsume' it.
		     * Basically rewind by one token if punctuation (type 7) is hit and the char before it was
		     * a dot.  This will enable the enclosing parse rule to consume the punctuation.
		     * @param {Object} token The token to try and recover from
		     * @since 5.0
		     */
		    function recoverNonComputedProperty(token) {
		        if (token.value && token.type === Token.Punctuator) {
		            var start = token.range ? token.range[0] : token.start;
		            var idx = rewindTokenStream(start);
		        	var prev = extra.tokens[idx];
		        	if(prev.type === TokenName[Token.Punctuator] && prev.value === '.') {
		        		//extra.tokens.pop();
		        		index = prev.range[0]+1;
		                peek(); // recalculate lookahead
		        	}
		        }
		    }
		
		    /**
		     * @description Returns a node to fill in incomplete tree locations while recovering
		     * @param {Node} node The node context we tried to parse. Used to collect range and loc infos
		     * @param {String} expectedType The expected type of node (if known)
		     * @param {String} expectedValue The expected value of the node (if known)
		     * @since 2.0
		     */
		    function recoveredNode(node, expectedType, expectedValue) {
		        var recovered = {
		            type: 'RecoveredNode',
		            name: '',
		            recovered: true,
		            expectedValue: expectedValue,
		            expectedType: expectedType
		        };
		        if (extra.range) {
		            recovered.range = node.range;
		            recovered.range[1] = index;
		            recovered.start = node.range;
		            recovered.end = index;
		        }
		        if (extra.loc) {
		            recovered.loc = node.loc;
		            recovered.loc.end = new Position();
		        }
		        return recovered;
		    }
		
		    /**
			 * @description Recover an object property or ignore it
			 * @private
			 * @param {Object} prev The previous token from the stream
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=432956
			 */
			function recoverProperty(prev, id, node) {
				if(extra.errors) {
					var token = lookahead; //advance();
			        if(token.value === ':') {
			        	try {
			        		token = lex(); // eat the ':' so the assignment parsing starts on the correct index
			            	return node.finishProperty('init', id, parseAssignmentExpression(), false, true);
		            	}
		            	catch(e) {
		            	    token = extra.tokens[extra.tokens.length-1];    
		            	    tolerateUnexpectedToken(token, Messages.UnexpectedToken, token.value);
		            		node.finishProperty('init', id, null, false, true);
		            		return null;
		            	}
			        } else if(token.type === Token.Punctuator && token.value === '}') {
			        	tolerateUnexpectedToken(prev, Messages.UnexpectedToken, prev.value);
			        	node.finishProperty('init', id, false, true, true);
			        	return null;
			        } else {
			        	tolerateUnexpectedToken(prev, Messages.UnexpectedToken, prev.value);
			        	if(token.type === Token.Identifier || token.type === Token.StringLiteral) {
			        		//if the next token is an identifer / literal, start over
			        		node.finishProperty('init', id, false, true);
			        		return null;
			        	}
			        	while(token.type !== Token.EOF) {
			        		if(token.type === Token.Punctuator && (token.value === ',' || token.value === '}')) {
				            	//entering a prop, not complete, return null
			        			node.finishProperty('init', id, false, true);
			        			return null;
				            } else {
			        			token = lex(); // the token if we skipped it
			        		}
			        		token = advance();
			        	}
			        }
			        node.finishProperty('init', id, false, true);
			        return null;
		        }
		        else {
		        	expect(':');
		        	return node.finishProperty('init', id, parseAssignmentExpression(), false, true);
		        }
			}
		
		    // Sync with *.json manifests.
		    exports.version = '2.0.0';
		
		    exports.tokenize = tokenize;
		
		    exports.parse = parse;
		
		  //ORION
		    exports.isIdentifierPart = isIdentifierPart;
		    exports.isIdentifierStart = isIdentifierStart;
		    //for Tern
		    exports.isIdentifierChar = isIdentifierPart;
		
		    // Deep copy.
		   /* istanbul ignore next */
		    exports.Syntax = (function () {
		        var name, types = {};
		
		        if (typeof Object.create === 'function') {
		            types = Object.create(null);
		        }
		
		        for (name in Syntax) {
		            if (Syntax.hasOwnProperty(name)) {
		                types[name] = Syntax[name];
		            }
		        }
		
		        if (typeof Object.freeze === 'function') {
		            Object.freeze(types);
		        }
		
		        return types;
		    }());
		
		}));
		/* vim: set sw=4 ts=4 et tw=80 : */
	},
	/* 2 */
	function(module, exports, __webpack_require__) {

		var require;var require;/* eslint-disable  */
		(function(f){
			if (true) {
				module.exports=f();
			} else if (typeof define ==="function" && define.amd ){
				define([],f)
			} else {
				var g;
				if (typeof window!=="undefined") {
					g = window;
				} else if (typeof global!=="undefined"){
					g = global;
				} else if(typeof self!=="undefined"){
					g = self;
				} else { 
					g = this
				} 
				(g.acorn || (g.acorn = {})).walk = f();
			}
		})(function(){
			var define,module,exports;
			return (function e(t,n,r){
				function s(o,u){
					if (!n[o]) {
						if (!t[o]) {
							var a = typeof require == "function" && require;
							if(!u&&a) return require(o,!0);
							if(i) return i(o,!0);
							var f=new Error("Cannot find module '"+o+"'");
							throw f.code="MODULE_NOT_FOUND",f
						}
						var l=n[o]={exports:{}};
						t[o][0].call(l.exports,
							function(e){
								var n=t[o][1][e];
								return s(n?n:e)
							},l,l.exports,e,t,n,r)
					}
					return n[o].exports
				}
				var i = typeof require=="function"&&require;
				for(var o=0;o<r.length;o++) 
					s(r[o]);
				return s
			})({1:[
				function(_dereq_, module, exports){
					// AST walker module for Mozilla Parser API compatible trees
					
					// A simple walk is one where you simply specify callbacks to be
					// called on specific nodes. The last two arguments are optional. A
					// simple use would be
					//
					//     walk.simple(myTree, {
					//         Expression: function(node) { ... }
					//     });
					//
					// to do something with all expressions. All Parser API node types
					// can be used to identify node types, as well as Expression,
					// Statement, and ScopeBody, which denote categories of nodes.
					//
					// The base argument can be used to pass a custom (recursive)
					// walker, and state can be used to give this walked an initial
					// state.
					
					"use strict";
					
					exports.__esModule = true;
					exports.simple = simple;
					exports.ancestor = ancestor;
					exports.recursive = recursive;
					exports.findNodeAt = findNodeAt;
					exports.findNodeAround = findNodeAround;
					exports.findNodeAfter = findNodeAfter;
					exports.findNodeBefore = findNodeBefore;
					exports.make = make;
					
					function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
					
					function simple(node, visitors, base, state, override) {
					  if (!base) base = exports.base;(function c(node, st, override) {
					    var type = override || node.type,
					        found = visitors[type];
					    base[type](node, st, c);
					    if (found) found(node, st);
					  })(node, state, override);
					}
		
					// An ancestor walk builds up an array of ancestor nodes (including
					// the current node) and passes them to the callback as the state parameter.
					
					function ancestor(node, visitors, base, state) {
					  if (!base) base = exports.base;
					  if (!state) state = [];(function c(node, st, override) {
					    var type = override || node.type,
					        found = visitors[type];
					    if (node != st[st.length - 1]) {
					      st = st.slice();
					      st.push(node);
					    }
					    base[type](node, st, c);
					    if (found) found(node, st);
					  })(node, state);
					}
					
					// A recursive walk is one where your functions override the default
					// walkers. They can modify and replace the state parameter that's
					// threaded through the walk, and can opt how and whether to walk
					// their child nodes (by calling their third argument on these
					// nodes).
					
					function recursive(node, state, funcs, base, override) {
					  var visitor = funcs ? exports.make(funcs, base) : base;

					  (function c(node, st, override) {
					    visitor[override || node.type](node, st, c);
					  })(node, state, override);
					}
		
					function makeTest(test) {
					  if (typeof test == "string") return function (type) {
					    return type == test;
					  };else if (!test) return function () {
					    return true;
					  };else return test;
					}
					
					var Found = function Found(node, state) {
					  _classCallCheck(this, Found);
					
					  this.node = node;this.state = state;
					}
		
					// Find a node with a given start, end, and type (all are optional,
					// null can be used as wildcard). Returns a {node, state} object, or
					// undefined when it doesn't find a matching node.
					;
					
					function findNodeAt(node, start, end, test, base, state) {
					  test = makeTest(test);
					  if (!base) base = exports.base;
					  try {
					    ;(function c(node, st, override) {
					      var type = override || node.type;
					      if ((start == null || node.start <= start) && (end == null || node.end >= end)) base[type](node, st, c);
					      if ((start == null || node.start == start) && (end == null || node.end == end) && test(type, node)) throw new Found(node, st);
					    })(node, state);
					  } catch (e) {
					    if (e instanceof Found) return e;
					    throw e;
					  }
					}
					
					// Find the innermost node of a given type that contains the given
					// position. Interface similar to findNodeAt.
		
					function findNodeAround(node, pos, test, base, state) {
					  test = makeTest(test);
					  if (!base) base = exports.base;
					  try {
					    ;(function c(node, st, override) {
					      var type = override || node.type;
					      if (node.start > pos || node.end < pos) return;
					      base[type](node, st, c);
					      if (test(type, node)) throw new Found(node, st);
					    })(node, state);
					  } catch (e) {
					    if (e instanceof Found) return e;
					    throw e;
					  }
					}
		
					// Find the outermost matching node after a given position.
					
					function findNodeAfter(node, pos, test, base, state) {
					  test = makeTest(test);
					  if (!base) base = exports.base;
					  try {
					    ;(function c(node, st, override) {
					      if (node.end < pos) return;
					      var type = override || node.type;
					      if (node.start >= pos && test(type, node)) throw new Found(node, st);
					      base[type](node, st, c);
					    })(node, state);
					  } catch (e) {
					    if (e instanceof Found) return e;
					    throw e;
					  }
					}
					
					// Find the outermost matching node before a given position.
					
					function findNodeBefore(node, pos, test, base, state) {
					  test = makeTest(test);
					  if (!base) base = exports.base;
					  var max = undefined;(function c(node, st, override) {
					    if (node.start > pos) return;
					    var type = override || node.type;
					    if (node.end <= pos && (!max || max.node.end < node.end) && test(type, node)) max = new Found(node, st);
					    base[type](node, st, c);
					  })(node, state);
					  return max;
					}
					
					// Used to create a custom walker. Will fill in all missing node
					// type properties with the defaults.
					
					function make(funcs, base) {
					  if (!base) base = exports.base;
					  var visitor = {};
					  for (var type in base) visitor[type] = base[type];
					  for (var type in funcs) visitor[type] = funcs[type];
					  return visitor;
					}
					
					function skipThrough(node, st, c) {
					  c(node, st);
					}
					function ignore(_node, _st, _c) {}
					
					// Node walkers.
					
					var base = {};
					
					exports.base = base;
					base.Program = base.BlockStatement = function (node, st, c) {
					  for (var i = 0; i < node.body.length; ++i) {
					    c(node.body[i], st, "Statement");
					  }
					};
					base.Statement = skipThrough;
					base.EmptyStatement = ignore;
					base.ExpressionStatement = base.ParenthesizedExpression = function (node, st, c) {
					  return c(node.expression, st, "Expression");
					};
					base.IfStatement = function (node, st, c) {
					  c(node.test, st, "Expression");
					  c(node.consequent, st, "Statement");
					  if (node.alternate) c(node.alternate, st, "Statement");
					};
					base.LabeledStatement = function (node, st, c) {
					  return c(node.body, st, "Statement");
					};
					base.BreakStatement = base.ContinueStatement = ignore;
					base.WithStatement = function (node, st, c) {
					  c(node.object, st, "Expression");
					  c(node.body, st, "Statement");
					};
					base.SwitchStatement = function (node, st, c) {
					  c(node.discriminant, st, "Expression");
					  for (var i = 0; i < node.cases.length; ++i) {
					    var cs = node.cases[i];
					    if (cs.test) c(cs.test, st, "Expression");
					    for (var j = 0; j < cs.consequent.length; ++j) {
					      c(cs.consequent[j], st, "Statement");
					    }
					  }
					};
					base.ReturnStatement = base.YieldExpression = function (node, st, c) {
					  if (node.argument) c(node.argument, st, "Expression");
					};
					base.ThrowStatement = base.SpreadElement = function (node, st, c) {
					  return c(node.argument, st, "Expression");
					};
					base.TryStatement = function (node, st, c) {
					  c(node.block, st, "Statement");
					  if (node.handler) {
					    c(node.handler.param, st, "Pattern");
					    c(node.handler.body, st, "ScopeBody");
					  }
					  if (node.finalizer) c(node.finalizer, st, "Statement");
					};
					base.WhileStatement = base.DoWhileStatement = function (node, st, c) {
					  c(node.test, st, "Expression");
					  c(node.body, st, "Statement");
					};
					base.ForStatement = function (node, st, c) {
					  if (node.init) c(node.init, st, "ForInit");
					  if (node.test) c(node.test, st, "Expression");
					  if (node.update) c(node.update, st, "Expression");
					  c(node.body, st, "Statement");
					};
					base.ForInStatement = base.ForOfStatement = function (node, st, c) {
					  c(node.left, st, "ForInit");
					  c(node.right, st, "Expression");
					  c(node.body, st, "Statement");
					};
					base.ForInit = function (node, st, c) {
					  if (node.type == "VariableDeclaration") c(node, st);else c(node, st, "Expression");
					};
					base.DebuggerStatement = ignore;
					
					base.FunctionDeclaration = function (node, st, c) {
					  return c(node, st, "Function");
					};
					base.VariableDeclaration = function (node, st, c) {
					  for (var i = 0; i < node.declarations.length; ++i) {
					    c(node.declarations[i], st);
					  }
					};
					base.VariableDeclarator = function (node, st, c) {
					  c(node.id, st, "Pattern");
					  if (node.init) c(node.init, st, "Expression");
					};
					
					base.Function = function (node, st, c) {
					  if (node.id) c(node.id, st, "Pattern");
					  for (var i = 0; i < node.params.length; i++) {
					    c(node.params[i], st, "Pattern");
					  }c(node.body, st, node.expression ? "ScopeExpression" : "ScopeBody");
					};
					// FIXME drop these node types in next major version
					// (They are awkward, and in ES6 every block can be a scope.)
					base.ScopeBody = function (node, st, c) {
					  return c(node, st, "Statement");
					};
					base.ScopeExpression = function (node, st, c) {
					  return c(node, st, "Expression");
					};
					
					base.Pattern = function (node, st, c) {
					  if (node.type == "Identifier") c(node, st, "VariablePattern");else if (node.type == "MemberExpression") c(node, st, "MemberPattern");else c(node, st);
					};
					base.VariablePattern = ignore;
					base.MemberPattern = skipThrough;
					base.RestElement = function (node, st, c) {
					  return c(node.argument, st, "Pattern");
					};
					base.ArrayPattern = function (node, st, c) {
					  for (var i = 0; i < node.elements.length; ++i) {
					    var elt = node.elements[i];
					    if (elt) c(elt, st, "Pattern");
					  }
					};
					base.ObjectPattern = function (node, st, c) {
					  for (var i = 0; i < node.properties.length; ++i) {
					    c(node.properties[i].value, st, "Pattern");
					  }
					};
					
					base.Expression = skipThrough;
					base.ThisExpression = base.Super = base.MetaProperty = ignore;
					base.ArrayExpression = function (node, st, c) {
					  for (var i = 0; i < node.elements.length; ++i) {
					    var elt = node.elements[i];
					    if (elt) c(elt, st, "Expression");
					  }
					};
					base.ObjectExpression = function (node, st, c) {
					  for (var i = 0; i < node.properties.length; ++i) {
					    c(node.properties[i], st);
					  }
					};
					base.FunctionExpression = base.ArrowFunctionExpression = base.FunctionDeclaration;
					base.SequenceExpression = base.TemplateLiteral = function (node, st, c) {
					  for (var i = 0; i < node.expressions.length; ++i) {
					    c(node.expressions[i], st, "Expression");
					  }
					};
					base.UnaryExpression = base.UpdateExpression = function (node, st, c) {
					  c(node.argument, st, "Expression");
					};
					base.BinaryExpression = base.LogicalExpression = function (node, st, c) {
					  c(node.left, st, "Expression");
					  c(node.right, st, "Expression");
					};
					base.AssignmentExpression = base.AssignmentPattern = function (node, st, c) {
					  c(node.left, st, "Pattern");
					  c(node.right, st, "Expression");
					};
					base.ConditionalExpression = function (node, st, c) {
					  c(node.test, st, "Expression");
					  c(node.consequent, st, "Expression");
					  c(node.alternate, st, "Expression");
					};
					base.NewExpression = base.CallExpression = function (node, st, c) {
					  c(node.callee, st, "Expression");
					  if (node.arguments) for (var i = 0; i < node.arguments.length; ++i) {
					    c(node.arguments[i], st, "Expression");
					  }
					};
					base.MemberExpression = function (node, st, c) {
					  c(node.object, st, "Expression");
					  if (node.computed) c(node.property, st, "Expression");
					};
					base.ExportNamedDeclaration = base.ExportDefaultDeclaration = function (node, st, c) {
					  if (node.declaration) c(node.declaration, st, node.type == "ExportNamedDeclaration" || node.declaration.id ? "Statement" : "Expression");
					  if (node.source) c(node.source, st, "Expression");
					};
					base.ExportAllDeclaration = function (node, st, c) {
					  c(node.source, st, "Expression");
					};
					base.ImportDeclaration = function (node, st, c) {
					  for (var i = 0; i < node.specifiers.length; i++) {
					    c(node.specifiers[i], st);
					  }c(node.source, st, "Expression");
					};
					base.ImportSpecifier = base.ImportDefaultSpecifier = base.ImportNamespaceSpecifier = base.Identifier = base.Literal = ignore;
					
					base.TaggedTemplateExpression = function (node, st, c) {
					  c(node.tag, st, "Expression");
					  c(node.quasi, st);
					};
					base.ClassDeclaration = base.ClassExpression = function (node, st, c) {
					  return c(node, st, "Class");
					};
					base.Class = function (node, st, c) {
					  if (node.id) c(node.id, st, "Pattern");
					  if (node.superClass) c(node.superClass, st, "Expression");
					  for (var i = 0; i < node.body.body.length; i++) {
					    c(node.body.body[i], st);
					  }
					};
					base.MethodDefinition = base.Property = function (node, st, c) {
					  if (node.computed) c(node.key, st, "Expression");
					  c(node.value, st, "Expression");
					};
					base.ComprehensionExpression = function (node, st, c) {
					  for (var i = 0; i < node.blocks.length; i++) {
					    c(node.blocks[i].right, st, "Expression");
					  }c(node.body, st, "Expression");
					};
					
					//ORION
					base.RecoveredNode = ignore;
					
					},{}
				]
			},{},[1]
			)(1)
		});
	},
	/* 3 */
	function(module, exports, __webpack_require__) {

		// Type description parser
		//
		// Type description JSON files (such as ecma5.json and browser.json)
		// are used to
		//
		// A) describe types that come from native code
		//
		// B) to cheaply load the types for big libraries, or libraries that
		//    can't be inferred well
		
		(function(mod) {
		  if (true) // CommonJS
		    return exports.init = mod;
		  if (true) // AMD
		    return !(module.exports = {init: mod});
		  tern.def = {init: mod};
		})(function(exports, infer) {
		  "use strict";
		
		  function hop(obj, prop) {
		    return Object.prototype.hasOwnProperty.call(obj, prop);
		  }
		
		  var TypeParser = exports.TypeParser = function(spec, start, base, forceNew) {
		    this.pos = start || 0;
		    this.spec = spec;
		    this.base = base;
		    this.forceNew = forceNew;
		  };
		
		  function unwrapType(type, self, args) {
		    return type.call ? type(self, args) : type;
		  }
		
		  function extractProp(type, prop) {
		    if (prop == "!ret") {
		      if (type.retval) return type.retval;
		      var rv = new infer.AVal;
		      type.propagate(new infer.IsCallee(infer.ANull, [], null, rv));
		      return rv;
		    } else {
		      return type.getProp(prop);
		    }
		  }
		
		  function computedFunc(args, retType) {
		    return function(self, cArgs) {
		      var realArgs = [];
		      for (var i = 0; i < args.length; i++) realArgs.push(unwrapType(args[i], self, cArgs));
		      return new infer.Fn(name, infer.ANull, realArgs, unwrapType(retType, self, cArgs));
		    };
		  }
		  function computedUnion(types) {
		    return function(self, args) {
		      var union = new infer.AVal;
		      for (var i = 0; i < types.length; i++) unwrapType(types[i], self, args).propagate(union);
		      union.maxWeight = 1e5;
		      return union;
		    };
		  }
		  function computedArray(inner) {
		    return function(self, args) {
		      return new infer.Arr(inner(self, args));
		    };
		  }
		
		  TypeParser.prototype = {
		    eat: function(str) {
		      if (str.length == 1 ? this.spec.charAt(this.pos) == str : this.spec.indexOf(str, this.pos) == this.pos) {
		        this.pos += str.length;
		        return true;
		      }
		    },
		    word: function(re) {
		      var word = "", ch, re = re || /[\w$]/;
		      while ((ch = this.spec.charAt(this.pos)) && re.test(ch)) { word += ch; ++this.pos; }
		      return word;
		    },
		    error: function() {
		      throw new Error("Unrecognized type spec: " + this.spec + " (at " + this.pos + ")");
		    },
		    parseFnType: function(comp, name, top) {
		      var args = [], names = [], computed = false;
		      if (!this.eat(")")) for (var i = 0; ; ++i) {
		        var colon = this.spec.indexOf(": ", this.pos), argname;
		        if (colon != -1) {
		          argname = this.spec.slice(this.pos, colon);
		          if (/^[$\w?]+$/.test(argname))
		            this.pos = colon + 2;
		          else
		            argname = null;
		        }
		        names.push(argname);
		        var argType = this.parseType(comp);
		        if (argType.call) computed = true;
		        args.push(argType);
		        if (!this.eat(", ")) {
		          this.eat(")") || this.error();
		          break;
		        }
		      }
		      var retType, computeRet, computeRetStart, fn;
		      if (this.eat(" -> ")) {
		        var retStart = this.pos;
		        retType = this.parseType(true);
		        if (retType.call) {
		          if (top) {
		            computeRet = retType;
		            retType = infer.ANull;
		            computeRetStart = retStart;
		          } else {
		            computed = true;
		          }
		        }
		      } else {
		        retType = infer.ANull;
		      }
		      if (computed) return computedFunc(args, retType);
		
		      if (top && (fn = this.base))
		        infer.Fn.call(this.base, name, infer.ANull, args, names, retType);
		      else
		        fn = new infer.Fn(name, infer.ANull, args, names, retType);
		      if (computeRet) fn.computeRet = computeRet;
		      if (computeRetStart != null) fn.computeRetSource = this.spec.slice(computeRetStart, this.pos);
		      return fn;
		    },
		    parseType: function(comp, name, top) {
		      var main = this.parseTypeMaybeProp(comp, name, top);
		      if (!this.eat("|")) return main;
		      var types = [main], computed = main.call;
		      for (;;) {
		        var next = this.parseTypeMaybeProp(comp, name, top);
		        types.push(next);
		        if (next.call) computed = true;
		        if (!this.eat("|")) break;
		      }
		      if (computed) return computedUnion(types);
		      var union = new infer.AVal;
		      for (var i = 0; i < types.length; i++) types[i].propagate(union);
		      union.maxWeight = 1e5;
		      return union;
		    },
		    parseTypeMaybeProp: function(comp, name, top) {
		      var result = this.parseTypeInner(comp, name, top);
		      while (comp && this.eat(".")) result = this.extendWithProp(result);
		      return result;
		    },
		    extendWithProp: function(base) {
		      var propName = this.word(/[\w<>$!]/) || this.error();
		      if (base.apply) return function(self, args) {
		        return extractProp(base(self, args), propName);
		      };
		      return extractProp(base, propName);
		    },
		    parseTypeInner: function(comp, name, top) {
		      if (this.eat("fn(")) {
		        return this.parseFnType(comp, name, top);
		      } else if (this.eat("[")) {
		        var inner = this.parseType(comp);
		        this.eat("]") || this.error();
		        if (inner.call) return computedArray(inner);
		        if (top && this.base) {
		          infer.Arr.call(this.base, inner);
		          return this.base;
		        }
		        return new infer.Arr(inner);
		      } else if (this.eat("+")) {
		        var path = this.word(/[\w$<>\.!]/);
		        var base = parsePath(path + ".prototype");
		        var type;
		        if (!(base instanceof infer.Obj)) base = parsePath(path);
		        if (!(base instanceof infer.Obj)) return base;
		        if (comp && this.eat("[")) return this.parsePoly(base);
		        if (top && this.forceNew) return new infer.Obj(base);
		        return infer.getInstance(base);
		      } else if (comp && this.eat("!")) {
		        var arg = this.word(/\d/);
		        if (arg) {
		          arg = Number(arg);
		          return function(_self, args) {return args[arg] || infer.ANull;};
		        } else if (this.eat("this")) {
		          return function(self) {return self;};
		        } else if (this.eat("custom:")) {
		          var fname = this.word(/[\w$]/);
		          return customFunctions[fname] || function() { return infer.ANull; };
		        } else {
		          return this.fromWord("!" + this.word(/[\w$<>\.!]/));
		        }
		      } else if (this.eat("?")) {
		        return infer.ANull;
		      } else {
		        return this.fromWord(this.word(/[\w$<>\.!`]/));
		      }
		    },
		    fromWord: function(spec) {
		      var cx = infer.cx();
		      switch (spec) {
		      case "number": return cx.num;
		      case "string": return cx.str;
		      case "bool": return cx.bool;
		      case "<top>": return cx.topScope;
		      }
		      if (cx.localDefs && spec in cx.localDefs) return cx.localDefs[spec];
		      return parsePath(spec);
		    },
		    parsePoly: function(base) {
		      var propName = "<i>", match;
		      if (match = this.spec.slice(this.pos).match(/^\s*(\w+)\s*=\s*/)) {
		        propName = match[1];
		        this.pos += match[0].length;
		      }
		      var value = this.parseType(true);
		      if (!this.eat("]")) this.error();
		      if (value.call) return function(self, args) {
		        var instance = infer.getInstance(base);
		        value(self, args).propagate(instance.defProp(propName));
		        return instance;
		      };
		      var instance = infer.getInstance(base);
		      value.propagate(instance.defProp(propName));
		      return instance;
		    }
		  };
		
		  function parseType(spec, name, base, forceNew) {
		    var type = new TypeParser(spec, null, base, forceNew).parseType(false, name, true);
		    if (/^fn\(/.test(spec)) for (var i = 0; i < type.args.length; ++i) (function(i) {
		      var arg = type.args[i];
		      if (arg instanceof infer.Fn && arg.args && arg.args.length) addEffect(type, function(_self, fArgs) {
		        var fArg = fArgs[i];
		        if (fArg) fArg.propagate(new infer.IsCallee(infer.cx().topScope, arg.args, null, infer.ANull));
		      });
		    })(i);
		    return type;
		  }
		
		  function addEffect(fn, handler, replaceRet) {
		    var oldCmp = fn.computeRet, rv = fn.retval;
		    fn.computeRet = function(self, args, argNodes) {
		      var handled = handler(self, args, argNodes);
		      var old = oldCmp ? oldCmp(self, args, argNodes) : rv;
		      return replaceRet ? handled : old;
		    };
		  }
		
		  var parseEffect = exports.parseEffect = function(effect, fn) {
		    var m;
		    if (effect.indexOf("propagate ") == 0) {
		      var p = new TypeParser(effect, 10);
		      var origin = p.parseType(true);
		      if (!p.eat(" ")) p.error();
		      var target = p.parseType(true);
		      addEffect(fn, function(self, args) {
		        unwrapType(origin, self, args).propagate(unwrapType(target, self, args));
		      });
		    } else if (effect.indexOf("call ") == 0) {
		      var andRet = effect.indexOf("and return ", 5) == 5;
		      var p = new TypeParser(effect, andRet ? 16 : 5);
		      var getCallee = p.parseType(true), getSelf = null, getArgs = [];
		      if (p.eat(" this=")) getSelf = p.parseType(true);
		      while (p.eat(" ")) getArgs.push(p.parseType(true));
		      addEffect(fn, function(self, args) {
		        var callee = unwrapType(getCallee, self, args);
		        var slf = getSelf ? unwrapType(getSelf, self, args) : infer.ANull, as = [];
		        for (var i = 0; i < getArgs.length; ++i) as.push(unwrapType(getArgs[i], self, args));
		        var result = andRet ? new infer.AVal : infer.ANull;
		        callee.propagate(new infer.IsCallee(slf, as, null, result));
		        return result;
		      }, andRet);
		    } else if (m = effect.match(/^custom (\S+)\s*(.*)/)) {
		      var customFunc = customFunctions[m[1]];
		      if (customFunc) addEffect(fn, m[2] ? customFunc(m[2]) : customFunc);
		    } else if (effect.indexOf("copy ") == 0) {
		      var p = new TypeParser(effect, 5);
		      var getFrom = p.parseType(true);
		      p.eat(" ");
		      var getTo = p.parseType(true);
		      addEffect(fn, function(self, args) {
		        var from = unwrapType(getFrom, self, args), to = unwrapType(getTo, self, args);
		        from.forAllProps(function(prop, val, local) {
		          if (local && prop != "<i>")
		            to.propagate(new infer.PropHasSubset(prop, val));
		        });
		      });
		    } else {
		      throw new Error("Unknown effect type: " + effect);
		    }
		  };
		
		  var currentTopScope;
		
		  var parsePath = exports.parsePath = function(path, scope) {
		    var cx = infer.cx(), cached = cx.paths[path], origPath = path;
		    if (cached != null) return cached;
		    cx.paths[path] = infer.ANull;
		
		    var base = scope || currentTopScope || cx.topScope;
		
		    if (cx.localDefs) for (var name in cx.localDefs) {
		      if (path.indexOf(name) == 0) {
		        if (path == name) return cx.paths[path] = cx.localDefs[path];
		        if (path.charAt(name.length) == ".") {
		          base = cx.localDefs[name];
		          path = path.slice(name.length + 1);
		          break;
		        }
		      }
		    }
		
		    var parts = path.split(".");
		    for (var i = 0; i < parts.length && base != infer.ANull; ++i) {
		      var prop = parts[i];
		      if (prop.charAt(0) == "!") {
		        if (prop == "!proto") {
		          base = (base instanceof infer.Obj && base.proto) || infer.ANull;
		        } else {
		          var fn = base.getFunctionType();
		          if (!fn) {
		            base = infer.ANull;
		          } else if (prop == "!ret") {
		            base = fn.retval && fn.retval.getType(false) || infer.ANull;
		          } else {
		            var arg = fn.args && fn.args[Number(prop.slice(1))];
		            base = (arg && arg.getType(false)) || infer.ANull;
		          }
		        }
		      } else if (base instanceof infer.Obj) {
		        var propVal = (prop == "prototype" && base instanceof infer.Fn) ? base.getProp(prop) : base.props[prop];
		        if (!propVal || propVal.isEmpty())
		          base = infer.ANull;
		        else
		          base = propVal.types[0];
		      }
		    }
		    // Uncomment this to get feedback on your poorly written .json files
		    // if (base == infer.ANull) console.error("bad path: " + origPath + " (" + cx.curOrigin + ")");
		    cx.paths[origPath] = base == infer.ANull ? null : base;
		    return base;
		  };
		
		  function emptyObj(ctor) {
		    var empty = Object.create(ctor.prototype);
		    empty.props = Object.create(null);
		    empty.isShell = true;
		    return empty;
		  }
		
		  function isSimpleAnnotation(spec) {
		    if (!spec["!type"] || /^(fn\(|\[)/.test(spec["!type"])) return false;
		    for (var prop in spec)
		      if (prop != "!type" && prop != "!doc" && prop != "!url" && prop != "!span" && prop != "!data")
		        return false;
		    return true;
		  }
		
		  function passOne(base, spec, path) {
		    if (!base) {
		      var tp = spec["!type"];
		      if (tp) {
		        if (/^fn\(/.test(tp)) base = emptyObj(infer.Fn);
		        else if (tp.charAt(0) == "[") base = emptyObj(infer.Arr);
		        else throw new Error("Invalid !type spec: " + tp);
		      } else if (spec["!stdProto"]) {
		        base = infer.cx().protos[spec["!stdProto"]];
		      } else {
		        base = emptyObj(infer.Obj);
		      }
		      base.name = path;
		    }
		
		    for (var name in spec) if (hop(spec, name) && name.charCodeAt(0) != 33) {
		      var inner = spec[name];
		      if (typeof inner == "string" || isSimpleAnnotation(inner)) continue;
		      var prop = base.defProp(name);
		      passOne(prop.getObjType(), inner, path ? path + "." + name : name).propagate(prop);
		    }
		    return base;
		  }
		
		  function passTwo(base, spec, path) {
		    if (base.isShell) {
		      delete base.isShell;
		      var tp = spec["!type"];
		      if (tp) {
		        parseType(tp, path, base);
		      } else {
		        var proto = spec["!proto"] && parseType(spec["!proto"]);
		        infer.Obj.call(base, proto instanceof infer.Obj ? proto : true, path);
		      }
		    }
		
		    var effects = spec["!effects"];
		    if (effects && base instanceof infer.Fn) for (var i = 0; i < effects.length; ++i)
		      parseEffect(effects[i], base);
		    copyInfo(spec, base);
		
		    for (var name in spec) if (hop(spec, name) && name.charCodeAt(0) != 33) {
		      var inner = spec[name], known = base.defProp(name), innerPath = path ? path + "." + name : name;
		      if (typeof inner == "string") {
		        if (known.isEmpty()) parseType(inner, innerPath).propagate(known);
		      } else {
		        if (!isSimpleAnnotation(inner))
		          passTwo(known.getObjType(), inner, innerPath);
		        else if (known.isEmpty())
		          parseType(inner["!type"], innerPath, null, true).propagate(known);
		        else
		          continue;
		        if (inner["!doc"]) known.doc = inner["!doc"];
		        if (inner["!url"]) known.url = inner["!url"];
		        if (inner["!span"]) known.span = inner["!span"];
		      }
		    }
		    return base;
		  }
		
		  function copyInfo(spec, type) {
		    if (spec["!doc"]) type.doc = spec["!doc"];
		    if (spec["!url"]) type.url = spec["!url"];
		    if (spec["!span"]) type.span = spec["!span"];
		    if (spec["!data"]) type.metaData = spec["!data"];
		  }
		
		  function runPasses(type, arg) {
		    var parent = infer.cx().parent, pass = parent && parent.passes && parent.passes[type];
		    if (pass) for (var i = 0; i < pass.length; i++) pass[i](arg);
		  }
		
		  function doLoadEnvironment(data, scope) {
		    var cx = infer.cx();
		
		    infer.addOrigin(cx.curOrigin = data["!name"] || "env#" + cx.origins.length);
		    cx.localDefs = cx.definitions[cx.curOrigin] = Object.create(null);
		
		    runPasses("preLoadDef", data);
		
		    passOne(scope, data);
		
		    var def = data["!define"];
		    if (def) {
		      for (var name in def) {
		        var spec = def[name];
		        cx.localDefs[name] = typeof spec == "string" ? parsePath(spec) : passOne(null, spec, name);
		      }
		      for (var name in def) {
		        var spec = def[name];
		        if (typeof spec != "string") passTwo(cx.localDefs[name], def[name], name);
		      }
		    }
		
		    passTwo(scope, data);
		
		    runPasses("postLoadDef", data);
		
		    cx.curOrigin = cx.localDefs = null;
		  }
		
		  exports.load = function(data, scope) {
		    if (!scope) scope = infer.cx().topScope;
		    var oldScope = currentTopScope;
		    currentTopScope = scope;
		    try {
		      doLoadEnvironment(data, scope);
		    } finally {
		      currentTopScope = oldScope;
		    }
		  };
		
		  exports.parse = function(data, origin, path) {
		    var cx = infer.cx();
		    if (origin) {
		      cx.origin = origin;
		      cx.localDefs = cx.definitions[origin];
		    }
		
		    try {
		      if (typeof data == "string")
		        return parseType(data, path);
		      else
		        return passTwo(passOne(null, data, path), data, path);
		    } finally {
		      if (origin) cx.origin = cx.localDefs = null;
		    }
		  };
		
		  // Used to register custom logic for more involved effect or type
		  // computation.
		  var customFunctions = Object.create(null);
		  infer.registerFunction = function(name, f) { customFunctions[name] = f; };
		
		  var IsCreated = infer.constraint({
		    construct: function(created, target, spec) {
		      this.created = created;
		      this.target = target;
		      this.spec = spec;
		    },
		    addType: function(tp) {
		      if (tp instanceof infer.Obj && this.created++ < 5) {
		        var derived = new infer.Obj(tp), spec = this.spec;
		        if (spec instanceof infer.AVal) spec = spec.getObjType(false);
		        if (spec instanceof infer.Obj) for (var prop in spec.props) {
		          var cur = spec.props[prop].types[0];
		          var p = derived.defProp(prop);
		          if (cur && cur instanceof infer.Obj && cur.props.value) {
		            var vtp = cur.props.value.getType(false);
		            if (vtp) p.addType(vtp);
		          }
		        }
		        this.target.addType(derived);
		      }
		    }
		  });
		
		  infer.registerFunction("Object_create", function(_self, args, argNodes) {
		    if (argNodes && argNodes.length && argNodes[0].type == "Literal" && argNodes[0].value == null)
		      return new infer.Obj();
		
		    var result = new infer.AVal;
		    if (args[0]) args[0].propagate(new IsCreated(0, result, args[1]));
		    return result;
		  });
		
		  var PropSpec = infer.constraint({
		    construct: function(target) { this.target = target; },
		    addType: function(tp) {
		      if (!(tp instanceof infer.Obj)) return;
		      if (tp.hasProp("value"))
		        tp.getProp("value").propagate(this.target);
		      else if (tp.hasProp("get"))
		        tp.getProp("get").propagate(new infer.IsCallee(infer.ANull, [], null, this.target));
		    }
		  });
		
		  infer.registerFunction("Object_defineProperty", function(_self, args, argNodes) {
		    if (argNodes && argNodes.length >= 3 && argNodes[1].type == "Literal" &&
		        typeof argNodes[1].value == "string") {
		      var obj = args[0], connect = new infer.AVal;
		      obj.propagate(new infer.PropHasSubset(argNodes[1].value, connect, argNodes[1]));
		      args[2].propagate(new PropSpec(connect));
		    }
		    return infer.ANull;
		  });
		
		  infer.registerFunction("Object_defineProperties", function(_self, args, argNodes) {
		    if (args.length >= 2) {
		      var obj = args[0];
		      args[1].forAllProps(function(prop, val, local) {
		        if (!local) return;
		        var connect = new infer.AVal;
		        obj.propagate(new infer.PropHasSubset(prop, connect, argNodes && argNodes[1]));
		        val.propagate(new PropSpec(connect));
		      });
		    }
		    return infer.ANull;
		  });
		
		  var IsBound = infer.constraint({
		    construct: function(self, args, target) {
		      this.self = self; this.args = args; this.target = target;
		    },
		    addType: function(tp) {
		      if (!(tp instanceof infer.Fn)) return;
		      this.target.addType(new infer.Fn(tp.name, infer.ANull, tp.args.slice(this.args.length),
		                                       tp.argNames.slice(this.args.length), tp.retval));
		      this.self.propagate(tp.self);
		      for (var i = 0; i < Math.min(tp.args.length, this.args.length); ++i)
		        this.args[i].propagate(tp.args[i]);
		    }
		  });
		
		  infer.registerFunction("Function_bind", function(self, args) {
		    if (!args.length) return infer.ANull;
		    var result = new infer.AVal;
		    self.propagate(new IsBound(args[0], args.slice(1), result));
		    return result;
		  });
		
		  infer.registerFunction("Array_ctor", function(_self, args) {
		    var arr = new infer.Arr;
		    if (args.length != 1 || !args[0].hasType(infer.cx().num)) {
		      var content = arr.getProp("<i>");
		      for (var i = 0; i < args.length; ++i) args[i].propagate(content);
		    }
		    return arr;
		  });
		
		  infer.registerFunction("Promise_ctor", function(_self, args, argNodes) {
		    if (args.length < 1) return infer.ANull;
		    var self = new infer.Obj(infer.cx().definitions.ecma6["Promise.prototype"]);
		    var valProp = self.defProp("value", argNodes && argNodes[0]);
		    var valArg = new infer.AVal;
		    valArg.propagate(valProp);
		    var exec = new infer.Fn("execute", infer.ANull, [valArg], ["value"], infer.ANull);
		    var reject = infer.cx().definitions.ecma6.promiseReject;
		    args[0].propagate(new infer.IsCallee(infer.ANull, [exec, reject], null, infer.ANull));
		    return self;
		  });
		
		  return exports;
		});
	},
	/* 4 */
	function(module, exports, __webpack_require__) {

		var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function(root, mod) {
		  if (true) // CommonJS
		    return mod(exports);
		  if (true) // AMD
		    return !(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports], __WEBPACK_AMD_DEFINE_FACTORY__ = (mod), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
		  mod((root.tern || (root.tern = {})).signal = {}); // Plain browser env
		})(this, function(exports) {
		  function on(type, f) {
		    var handlers = this._handlers || (this._handlers = Object.create(null));
		    (handlers[type] || (handlers[type] = [])).push(f);
		  }
		  function off(type, f) {
		    var arr = this._handlers && this._handlers[type];
		    if (arr) for (var i = 0; i < arr.length; ++i)
		      if (arr[i] == f) { arr.splice(i, 1); break; }
		  }
		  function signal(type, a1, a2, a3, a4) {
		    var arr = this._handlers && this._handlers[type];
		    if (arr) for (var i = 0; i < arr.length; ++i) arr[i].call(this, a1, a2, a3, a4);
		  }
		
		  exports.mixin = function(obj) {
		    obj.on = on; obj.off = off; obj.signal = signal;
		    return obj;
		  };
		});
	},
	/* 5 */
	function(module, exports, __webpack_require__) {

		var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*******************************************************************************
		 * @license
		 * Copyright (c) 2015 IBM Corporation and others.
		 * All rights reserved. This program and the accompanying materials are made 
		 * available under the terms of the Eclipse Public License v1.0 
		 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
		 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
		 *
		 * Contributors:
		 *     IBM Corporation - initial API and implementation
		 *******************************************************************************/
		/*eslint-env amd*/
		!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
		], __WEBPACK_AMD_DEFINE_RESULT__ = function() {
			
			/**
			 * @description Returns if the given character is upper case or not considering the locale
			 * @param {String} string A string of at least one char14acter
			 * @return {Boolean} True iff the first character of the given string is uppercase
			 */
			 function isUpperCase(string) {
				if (string.length < 1) {
				return false;
				}
				if (isNaN(string.charCodeAt(0))) {
					return false;
				}
				return string.toLocaleUpperCase().charAt(0) === string.charAt(0);
			}
			
			/**
			 * @description Match ignoring case and checking camel case.
			 * @param {String} prefix
			 * @param {String} target
			 * @returns {Boolean} If the two strings match
			 */
			function looselyMatches(prefix, target) {
				if (typeof prefix !== "string" || typeof target !== "string") {
					return false;
				}
		
				// Zero length string matches everything.
				if (prefix.length === 0) {
					return true;
				}
		
				// Exclude a bunch right away
				if (prefix.charAt(0).toLowerCase() !== target.charAt(0).toLowerCase()) {
					return false;
				}
		
				if (startsWith(target, prefix)) {
					return true;
				}
		
				var lowerCase = target.toLowerCase();
				if (startsWith(lowerCase, prefix)) {
					return true;
				}
				
				var _prefix = prefix.toLowerCase();
		
				var equalIndex = prefix.indexOf("=");
				if (equalIndex !== -1) {
					if (startsWith(target, prefix.substring(0, equalIndex))) {
						return true;
					}
				}
				// Test for camel characters in the prefix.
				if (prefix === _prefix) {
					return false;
				}
				//https://bugs.eclipse.org/bugs/show_bug.cgi?id=473777
				if(startsWith(lowerCase, _prefix)) {
					return true;
				}
				var prefixParts = toCamelCaseParts(prefix);
				var targetParts = toCamelCaseParts(target);
		
				if (prefixParts.length > targetParts.length) {
					return false;
				}
		
				for (var i = 0; i < prefixParts.length; ++i) {
					if (!startsWith(targetParts[i], prefixParts[i])) {
						return false;
					}
				}
		
				return true;
			}
			
			/**
			 * @description Returns if the string starts with the given prefix
			 * @param {String} s The string to check
			 * @param {String} pre The prefix 
			 * @returns {Boolean} True if the string starts with the prefix
			 */
			function startsWith(s, pre) {
				return s.slice(0, pre.length) === pre;
			}
			
			/**
			 * @description Convert an input string into parts delimited by upper case characters. Used for camel case matches.
			 * e.g. GroClaL = ['Gro','Cla','L'] to match say 'GroovyClassLoader'.
			 * e.g. mA = ['m','A']
			 * @function
			 * @public
			 * @param {String} str
			 * @return Array.<String>
			 */
			function toCamelCaseParts(str) {
				var parts = [];
				for (var i = str.length - 1; i >= 0; --i) {
					if (isUpperCase(str.charAt(i))) {
						parts.push(str.substring(i));
						str = str.substring(0, i);
					}
				}
				if (str.length !== 0) {
					parts.push(str);
				}
				return parts.reverse();
			}
			
			var emptyAST = {
				type: "Program", //$NON-NLS-0$
				body: [],
				comments: [],
				tokens: [],
				range: [0, 0],
				loc: {
					start: {},
					end: {}
				}
			};
			
			/**
			 * @description Creates a new empty AST for the fatal thrown error case
			 * @param {Object} error The fatal error thrown while trying to parse
			 * @param {String} name The name of the file we tried to parse
			 * @param {String} text The text we tried to parse
			 * @returns {Object} An empty AST with the fatal error attached in the errors array
			 * @since 11.0
			 */
			function errorAST(error, name, text) {
				var ast = emptyAST;
				ast.range[1] = typeof(text) === 'string' ? text.length : 0;
				ast.loc.start.line = error.lineNumber;
				ast.loc.start.column = 0;
				ast.loc.end.line = error.lineNumber;
				ast.loc.end.column = error.column;
				ast.errors = [error];
		        ast.sourceFile  = Object.create(null);
		        ast.sourceFile.text = text;
		        ast.sourceFile.name = name;
		        return ast;
			}
			
			/**
			 * @description Makes the errors from the given AST safe to transport (using postMessage for example)
			 * @param {Object} ast The AST to serialize errors for
			 * @returns {Array.<Object>} The searialized errors
			 * @since 11.0
			 */
			function serializeAstErrors(ast) {
				var errors = [];
				if(ast && ast.errors) {
					ast.errors.forEach(function(error) {
						var result = error ? JSON.parse(JSON.stringify(error)) : error; // sanitizing Error object
						if (error instanceof Error) {
							result.__isError = true;
							result.lineNumber = typeof(result.lineNumber) === 'number' ? result.lineNumber : error.lineNumber; //FF fails to include the line number from JSON.stringify
							result.message = result.message || error.message;
							result.name = result.name || error.name;
							result.stack = result.stack || error.stack;
						}
						var msg = error.message;
						result.message = msg = msg.replace(/^Line \d+: /, '');
						if(/^Unexpected/.test(msg)) {
							result.type = 1;
							if(/end of input$/.test(msg)) {
								result.type = 2;
							}
						}
						errors.push(result);
					});
				}
				return errors;
			}
		
			return {
				isUpperCase: isUpperCase,
				looselyMatches: looselyMatches,
				startsWith: startsWith,
				toCamelCaseParts: toCamelCaseParts,
				errorAST: errorAST,
				serializeAstErrors: serializeAstErrors
			};
		}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}
	]);
});