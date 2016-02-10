// var orion = require("./OrionJavaScript.js");
// var ternHttpServer = require("./node_modules/tern/bin/tern");
var request = require("request");
// console.log(orion.infer.findExpressionAround);
// console.log(ternHttpServer);
request
	.post("http://localhost:60356")
	.on("response", function(response){
		console.log("test");
		console.log(response.statusCode);
	})
