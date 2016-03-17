/*eslint-env node */
var scriptResolver = require("./scriptResolver.js");
var orionJSLib = require("./orionJavaScript.js");
var orionJS = new orionJSLib(new scriptResolver(), false);
var categories = require("./Categories.js").categories;
var searchClient = require("./orionSearchClient.js");
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var fs = require("fs");
var readline = require("readline");
var data = "";
app.use(bodyParser.json());
//The ouput of bodyParser.urlencoded is wrong and cannot be parsed as a JSON object
//Current make-up for this is using the verify function to intercept the buf and parse it 
//to the global variable data.
app.use(bodyParser.urlencoded({extended:false, /**
 * @callback
 */
verify: function(req, res, buf, encoding){ 
	var body = buf.toString(encoding);
	req.body = body;
	var bodyObj = JSON.parse(body);
	data = bodyObj;
}}));
app.set("port", process.env.PORT || 0);


app.post("/References", /* @callback */ function(req, httpRes){
	// res.send(JSON.stringify(data));
	var searchLoc = data.searchLoc;
	var start = data.start;
	var length = data.end - data.start;
	var textToSearch = data.textToSearch;
	var files = data.files;
	var fileName = data.fileName;
	var totalFiles = files.length;
	for (var p = files.length - 1; p >= 0; p--) {
		uploadFileContent(files[p], function() {
			if (!--totalFiles){ // execute search after files are uploaded
				searchClient.search(searchLoc, textToSearch, /* @callback */ function(err, res){ 

					var expected = [];
					var pending = 0;
					var pendingFiles = res.length;
					orionJS.Tern.type(fileName, start, /* @callback */ function(response, err){
						for (var i2 = res.length - 1; i2 >= 0; i2--) {
							var positions = res[i2]["positions"];
							var fileLoc = res[i2]["file"];
							pending += positions.length;
							// if(i2 === 0 ) { httpRes.send(JSON.stringify(pendingFiles)); }
							for (var p2 = positions.length - 1; p2 >= 0; p2--) {
								var match = { position : positions[p2], length : length, "path":fileLoc};
								orionJS.Tern.checkRef(fileLoc, positions[p2], response, [], function(result, err){
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
									pending--;
									if (!pending && pendingFiles === 1) {  
										httpRes.set({"content-type" : "application/json;charset=utf-8"});
										httpRes.send(JSON.stringify(expected));
									} else if (!pending) {
										pendingFiles--;
									}
								});
							}
						}
					});
				});
			}
		});
	}
});

function _sameOrigin(o1, o2) {
	if(o1 === o2) {
		return true;
	}
	var u1 = decodeURIComponent(o1);
	var u2 = decodeURIComponent(o2);
	if(u1 === u2) {
		return true;
	}
	//last try, in case we have re-encoded URIs
	return decodeURIComponent(u1) === decodeURIComponent(u2);
}

function uploadFileContent(path, done){
	var content = '';
  readline.createInterface({
    input: fs.createReadStream(path),
    terminal: false
  }).on('line', function(line){
  	content += line + "\n";
  }).on("close", function(){
    orionJS.Tern.addFile(path, content);
    done();
  });
}

process.stdin.on("end", function() { process.exit(); });

var listener = app.listen(app.get("port"), function(){
	console.log("Listening on port " + listener.address().port);
	process.on("SIGINT", function() { process.exit(); });
	process.on("SIGTERM", function() { process.exit(); });
});
// orionJS.Tern.installedPlugins(function(res, err){console.log(res, err);});