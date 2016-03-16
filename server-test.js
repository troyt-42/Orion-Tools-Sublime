/*eslint-env node */
var scriptResolver = require("./scriptResolver.js");
var orionJSLib = require("./orionJavaScript.js");
var orionJS = new orionJSLib(new scriptResolver(), false);
var orionSearchClient = require("./orionSearchClient.js");
var fs = require("fs");
var readline = require("readline");
var path = require('path');
var Messages = require("./Messages.js");

var search = function(dir, originStr, done) {
  var jsResults = [];
  fs.readdir(dir, function(err, list) {
    if (err) {  return done(err);  }
    var pending = list.length;
    if (!pending) { return done(null, jsResults);  }
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      if (path.extname(file) === ".js") {
      	checkFileContent(file, originStr, function(err, results){
      		if (!err){
      			if(results["positions"].length){
      				jsResults = jsResults.concat(results);
	      		}
	      		if (!--pending) { done(null, jsResults); }
      		} else {
      			done(err, null);
      		}

      	});
      } else {
      	fs.stat(file, function(err, stat) {
      		if (err === null){
      			if (stat && stat.isDirectory()) {
  					search(file,originStr, /* @callback */ function(err, results) {
  						jsResults = jsResults.concat(results);
		            	if (!--pending) { done(null, jsResults);  }
		          	});
		        } else {
		          if (!--pending) {  done(null, jsResults);  }
		        }
      		}
	    });
      }
    });
  });
};

var files = [];
var relativePathes = [
	"C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client\\bundles\\org.eclipse.orion.client.javascript\\web\\javascript\\commands\\refsCommand.js",
	"C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client\\bundles\\org.eclipse.orion.client.core\\web\\orion\\objects.js",
	"C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client\\bundles\\org.eclipse.orion.client.core\\web\\orion\\Deferred.js",
	"C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client\\bundles\\org.eclipse.orion.client.javascript\\web\\javascript\\finder.js",
	"C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client\\bundles\\org.eclipse.orion.client.core\\web\\orion\\i18nUtil.js",
	"C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client\\bundles\\org.eclipse.orion.client.javascript\\web\\javascript\\nls\\messages.js",
	"C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client\\bundles\\org.eclipse.orion.client.javascript\\web\\eslint\\conf\\environments.js",
	"C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client\\bundles\\org.eclipse.orion.client.javascript\\web\\estraverse\\estraverse.js"
	];
function checkFileContent(path, originStr, done){
	var positions = [];
	var posTemp = 0;
	var data = '';
	readline.createInterface({
		input: fs.createReadStream(path),
		terminal: false
	}).on('line', function(line){
		data += line + "\n";
		var idx = line.indexOf(originStr);
		while (idx !== -1){
			positions.push(posTemp + idx);
			idx = line.indexOf(originStr, idx+1);
		}
		posTemp += line.length + 1;
	}).on("close", function(){
		if (relativePathes.indexOf(path) !== -1){
			// console.log(path);
			// orionJS.Tern.addFile(path, data);
			files.push({
				"name": path,
				"text": data,
				"type" : "full"
			});
		}
		done(null, { "file" : path, "positions" : positions});
	});
}

var categories = {
	functionDecls: {
		name: Messages['functionDecls'],
		category: 'funcdecls', //$NON-NLS-1$
		sort: 1
	},
	functionCalls: {
		name: Messages['functionCalls'],
		category: 'funccalls', //$NON-NLS-1$
		sort: 2
	},
	propAccess: {
		name: Messages['propAccess'],
		category: 'propaccess', //$NON-NLS-1$
		sort: 3
	},
	propWrite: {
		name: Messages['propWrite'],
		category: 'propwrite', //$NON-NLS-1$
		sort: 4
	},
	varDecls: {
		name: Messages['varDecls'],
		category: 'vardecls', //$NON-NLS-1$
		sort: 5
	},
	varAccess: {
		name: Messages['varAccess'],
		category: 'varaccess', //$NON-NLS-1$
		sort: 6
	},
	varWrite: {
		name: Messages['varWrite'],
		category: 'varwrite', //$NON-NLS-1$
		sort: 7
	},
	regex: {
		name: Messages['regex'],
		category: 'regex', //$NON-NLS-1$
		sort: 8
	},
	strings: {
		name: Messages['strings'],
		category: 'strings', //$NON-NLS-1$
		sort: 9
	},
	blockComments: {
		name: Messages['blockComments'],
		category: 'blockcomments', //$NON-NLS-1$
		sort: 10
	},
	lineComments: {
		name: Messages['lineComments'],
		category: 'linecomments', //$NON-NLS-1$
		sort: 11
	},
	partial: {
		name: Messages['partial'],
		category: 'partial', //$NON-NLS-1$
		sort: 12
	},
	uncategorized: {
		name: Messages['uncategorized'],
		category: 'uncategorized', //$NON-NLS-1$
		sort: 13
	},
	syntax: {
		name: Messages['parseErrors'],
		category: 'parseerrors', //$NON-NLS-1$
		sort: 14
	}
};

var file =  "C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client\\bundles\\org.eclipse.orion.client.javascript\\web\\javascript\\commands\\refsCommand.js";

function _sameOrigin(o1, o2) {
	if(o1 === o2) {
		return true;
	}
	var u1 = decodeURIComponent(o1);
	var u2 = decodeURIComponent(o2);
	console.log(u1, u2);
	if(u1 === u2) {
		return true;
	}
	//last try, in case we have re-encoded URIs
	return decodeURIComponent(u1) === decodeURIComponent(u2);
}
// orionJS.Tern.installedPlugins(function(res, err){console.log(res, err);});
search("C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client", "_findRefs", function(err, res){ 
	var expected = [];
	orionJS.Tern.type(file, 4845, files, function(response, err){
		for (var i = res.length - 1; i >= 0; i--) {
			var positions = res[i]["positions"];
			var fileLoc = res[i]["file"];
			for (var p = positions.length - 1; p >= 0; p--) {
				var match = { position : positions[p]};
				orionJS.Tern.checkRef(fileLoc, positions[p], response, [], function(result, err){
					if(result && result.type) {
						var _t = result, _ot = response;
						if(_t.name === _ot.name && _t.type === _ot.type && _sameOrigin(_t.origin, _ot.origin)) {
							if(_t.guess) {
								//we took a stab at it, not 100% sure
								match.confidence = 50;
							} else {
								match.confidence = 100;
							}
						} else if(_t.staticCheck) {
							match.confidence = _t.staticCheck.confidence;
						} else if(_t.category === categories.strings.category ||	_t.category === categories.regex.category) {
							match.confidence = 0;
						} else {
							match.confidence = -1;
						}
						match.category = _t.category;
					} else if(err) {
						match.category = categories.uncategorized.category;
						match.confidence = -1;
					}
					expected.push(match);
					if (i === 0 && p === 0) console.log(expected);
				})
			}
		}
	});
	// orionJS.Tern.type(file, 4845, files, function(response, err){
	// 	console.log(response, err);
	// });
	
});