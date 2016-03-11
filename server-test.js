/*eslint-env node */
var scriptResolver = require("./scriptResolver.js");
var orionJSLib = require("./orionJavaScript.js");
var orionJS = new orionJSLib(new scriptResolver(), false);
var orionSearchClient = require("./orionSearchClient.js");
var fs = require("fs");
var readline = require("readline");
var path = require('path');

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
		if (path.indexOf("C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client\\bundles\\org.eclipse.orion.client.javascript\\web") !== -1){
			orionJS.Tern.addFile(path, data);
		}
		done(null, { "file" : path, "positions" : positions});
	});
}

var file =  "C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client\\bundles\\org.eclipse.orion.client.javascript\\web\\javascript\\commands\\refsCommand.js";


// orionJS.Tern.installedPlugins(function(res, err){console.log(res, err);});
search("C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client", "_findRefs", function(err, res){ 
	console.log(res.length);
	orionJS.Tern.type(file, 4820, files, function(response, err){
		console.log(response, err);
	});
});