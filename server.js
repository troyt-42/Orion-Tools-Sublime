// var orion = require("./OrionJavaScript.js");
// var ternHttpServer = require("./node_modules/tern/bin/tern");
var request = require("request");
// console.log(orion.infer.findExpressionAround);
// console.log(ternHttpServer);

var requestObj = {
					'files': [
						{
							'text': '// var orion = require("./OrionJavaScript.js");\n// var ternHttpServer = require("./node_modules/tern/bin/tern");\nvar request = require("request");\n// console.log(orion.infer.findExpressionAround);\n// console.log(ternHttpServer);\n\nvar requestObj = {\n\t"files": [\n\t\t{\t"text": "functoin test(a, b){console.log(a,b)}",\n\t\t\t"name": "test.js", \n\t\t\t"type": "part"\n\t\t}\n\t]\n};\n\n\n\nrequest\n\t.post("http://localhost:60356", requestObj)\n\t.on("response", function(response){\n\t\tconsole.log("test");\n\t\tconsole.log(response.statusCode);\n\t});\n', 
							'name': 'server.js', 
							'type': 'full'
						}
	]
};



request
	.post({url:"http://localhost:60356/", body: JSON.stringify(requestObj)})
	.on("response", function(response){
		console.log("test");
		console.log(response.statusCode);
	});
