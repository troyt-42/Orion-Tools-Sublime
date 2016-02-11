// var orion = require("./OrionJavaScript.js");
// var ternHttpServer = require("./node_modules/tern/bin/tern");
var request = require("request");
// console.log(orion.infer.findExpressionAround);
// console.log(ternHttpServer);

var requestObj = {
	'files': [
		{	'text': '\t\t], __WEBPACK_AMD_DEFINE_RESULT__ = function() {\n\t\t\t\n\t\t\t/**\n\t\t\t * @description Returns if the given character is upper case or not considering the locale\n\t\t\t * @param {String} string A string of at least one char14acter\n\t\t\t * @return {Boolean} True iff the first character of the given string is uppercase\n\t\t\t */\n\t\t\t function isUpperCase(string) {\n\t\t\t\tif (string.length < 1) {\n\t\t\t\treturn false;\n\t\t\t\t}\n\t\t\t\tif (isNaN(string.charCodeAt(0))) {\n\t\t\t\t\treturn false;\n\t\t\t\t}\n\t\t\t\treturn string.toLocaleUpperCase().charAt(0) === string.charAt(0);\n\t\t\t}\n\t\t\t\n\t\t\t/**\n\t\t\t * @description Match ignoring case and checking camel case.\n\t\t\t * @param {String} prefix\n\t\t\t * @param {String} target\n\t\t\t * @returns {Boolean} If the two strings match\n\t\t\t */\n\t\t\tfunction looselyMatches(prefix, target) {\n\t\t\t\tif (typeof prefix !== "string" || typeof target !== "string") {\n\t\t\t\t\treturn false;\n\t\t\t\t}\n\t', 
			'name': 'OrionJavaScript.js', 'type': 'part', 'offset': 263533
		}
	], 
	'query': {
		'file': '#0', 
		'lineCharPositions': true, 
		'type': 'definition', 
		'end': 370
	}
};



request
	.post({url:"http://localhost:60356/", body: JSON.stringify(requestObj)})
	.on("response", function(response){
		console.log("test");
		var resObj = '';
	    response.on('data', function(data) {
	      resObj += data;
	    });
	    response.on('end', function(){
	    	console.log(JSON.parse(resObj));
	    });
	});
