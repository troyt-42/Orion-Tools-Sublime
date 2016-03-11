/*eslint-env node */
var orionSearchClient = require("./orionSearchClient.js");

orionSearchClient.search("C:\\Users\\IBM_ADMIN\\git\\org.eclipse.orion.client", "_findRefs", function(err, ress){ console.log(res, err);});