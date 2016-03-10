/*eslint-env node */
var scriptResolver = require("./scriptResolver.js");
var orionJSLib = require("./orionJavaScript.js");
var orionJS = new orionJSLib(new scriptResolver(), false);
var searchIndex = require("search-index");

var file =  [{
	"text" : "var c = 12;\nvar a = 89;\nfunction test(a, b){\n\ta = 12;\n\tb = 321;\n}\n\ntest(c, c);\ntest(a, c);\ntest(c, a);\ntest(a, a);",
	"name" : "test.js",
	"type" : "full"
 }];
orionJS.Tern.type(file, 67, function(response, err){
	if (typeof err === "undefined") {
		console.log(response);
		orionJS.Tern.checkRef("test.js", 33, response, file, function(res, err){if (typeof err === "undefined") {  console.log(res);  }});
	}
});