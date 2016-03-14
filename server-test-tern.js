/*eslint-env node */
var scriptResolver = require("./scriptResolver.js");
var orionJSLib = require("./orionJavaScript.js");
var orionJS = new orionJSLib(new scriptResolver(), false);
var orionSearchClient = require("./orionSearchClient.js");
var request = require("request");
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
		if (path.indexOf("C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client\\") !== -1){
			console.log(path);
			files.push({
				"name": path,
				"text": data,
				"type" : "full"
			});
		}
		done(null, { "file" : path, "positions" : positions});
	});
}

var file =  "C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client\\bundles\\org.eclipse.orion.client.javascript\\web\\javascript\\commands\\refsCommand.js";


// orionJS.Tern.installedPlugins(function(res, err){console.log(res, err);});
search("C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client", "_findRefs", function(err, res){ 
	// console.log(res.length);
	// orionJS.Tern.type(file, 7990, files, function(response, err){
	// 	console.log(response, err);
	// });
	var temp = '';
	requestObj = {
		"query" : {
			"type" : "type",
			"file" : file,
			"end" : 8406
		},
	};
	request
		.post({url:"http://localhost:60356/", body: JSON.stringify(requestObj)})
		.on("response", function(response){
			response.on('data', function(data) {
		      // compressed data as it is received
		      console.log(JSON.parse(data.toString("utf8")));
		    })
		});


});