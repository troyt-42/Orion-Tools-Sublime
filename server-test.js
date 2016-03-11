/*eslint-env node */
// var scriptResolver = require("./scriptResolver.js");
// var orionJSLib = require("./orionJavaScript.js");
// var orionJS = new orionJSLib(new scriptResolver(), false);
var fs = require("fs");
// var readline = require("readline");
var path = require('path');

var walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) {  return done(err);  }
    var pending = list.length;
    if (!pending) {  return done(null, results);  }
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      if (path.extname(file) === ".js") {
      	results.push(file);
      	if (!--pending) {  done(null, results);  }
      } else {
      	fs.stat(file, function(err, stat) {
      		if (err === null){
      			if (stat && stat.isDirectory()) {
  					walk(file, /* @callback */ function(err, res) {
  						results = results.concat(res);
		            	if (!--pending) { done(null, results);  }
		          	});
		        } else {
		          if (!--pending) {  done(null, results);  }
		        }
      		}
	    });
      }
    });
  });
};

walk("C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client", function(err, res){ console.log(res, err);});

// fs.readdir("C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client", function(err, files){
// 	if (err === null){
// 		console.log(files);
// 	} else {
// 		console.log(err);
// 	}
// });

// function checkFileContent(path){
// 	var positions = [];
// 	var posTemp = 0;
// 	var output = { "text" : "" };
// 	readline.createInterface({
// 		input: fs.createReadStream("./test.js"),
// 		terminal: false
// 	}).on('line', function(line){
// 		var idx = line.indexOf("test");
// 		output += line + "\n";
// 		if (idx !== -1){
// 			positions.push(posTemp + idx);
// 		}

// 		posTemp += line.length + 1;
// 	}).on("close", function(){
// 		console.log(positions);
// 	});
// }
// var searchIndex = require("search-index");
// var data = require("./test.js");
// var options = {};

// searchIndex(options, function(err, si){
// 	si.add(data, options, function(err){
// 		if (err) {  console.log("oops!" + err);  }
// 		else {  console.log("success!");  }
// 	});

// 	// var q = {};
// 	// q.query = {"*" : ["test"]};
// 	// si.search(q, function(err, searchResults){
// 	// 	console.log(searchResults);
// 	// });

// 	var options = {
// 		beginsWith : "test",
// 		field: "*",
// 		threshold: 4,
// 		limit: 10,
// 		type: "simple"
// 	};
// 	si.match(options, function(err, matches){
// 		console.log(matches, err);
// 	})
// });

// var file =  [{
// 	"text" : "var c = 12;\nvar a = 89;\nfunction test(a, b){\n\ta = 12;\n\tb = 321;\n}\n\ntest(c, c);\ntest(a, c);\ntest(c, a);\ntest(a, a);",
// 	"name" : "test.js",
// 	"type" : "full"
//  }];
// orionJS.Tern.type(file, 67, function(response, err){
// 	if (typeof err === "undefined") {
// 		console.log(response);
// 		orionJS.Tern.checkRef("test.js", 33, response, file, function(res, err){if (typeof err === "undefined") {  console.log(res);  }});
// 	}
// });