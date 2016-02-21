/*******************************************************************************
 * @license
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*globals brackets, define*/
"use strict";
var fs = require("fs");
var path = require("path");

var fileClient = {
    /**
     * Returns the root URL for this file service
     * @public
     * @function
     * @returns {String} The file root URL (in this case a local filesystem URL)
     */
    fileServiceRootURL: function fileServiceRootURL() {
        return '/';
    },
    /**
     * @public
     * @function
     * @param {Object} options The map of options to use to find 
     * @returns {Promise} A promise to resolve the search
     */
    search: function search(options) {
        
    },
    /**
     * @public
     * @function
     * @param {String} filename The name of the file to read
     */
    read: function read(filename) {
        var deferred = new $.Deferred();
        fs.readFile(filename,'utf-8', function(err, data){
            if (!err) {
                deferred.resolve(data);
            }
        })
        return deferred;
    }
};

/**
 * @public
 * @constructs
 * @since 0.0.1
 */
function ScriptResolver() {}

/**
 * Returns the backing file client - in this case a shim for what would normally be the Orion 
 * file client class
 * @function
 * @public
 * @returns {OrionFileClientShim}
 */
ScriptResolver.prototype.getFileClient = function getFileClient() {
    return fileClient;
};

/**
* Returns an array of workspace file that match the given logical name and options
* @param {String} logicalName The name of the file to look up, for example, 'orion/objects'
* @param {Object} options The map of search options.
*
* >Supported options include:
* >  * ext - the file extension type to look for, for example 'js'
* >  * icon - the URL or relative path to the icon to describe found files
* >  * type - the name to use for the content type of any found files
* 
* @returns {File | null} Array of found files or ```null```
*/
ScriptResolver.prototype.getWorkspaceFile = function getWorkspaceFile(logicalName, options) {
    if(path.isAbsolute(logicalName)) {
        fs.readFile(logicalName,'utf-8', function(err, data){
            if (!err) {
                //TODO do caching
                return _newFileObj(file.name, logicalName, logicalName, null, 'application/javascript');
            }
        });
    }
};
    
/**
* @description Resolves the files that match the given location
* @function
* @param {String} path The path to resolve against
* @param {Array} files The array of files
* @param {Object} metadata The file metadata from the workspace
* @returns {Array} The filtered list of files for the relative path or an empty array, never null
* @since 8.0
*/
ScriptResolver.prototype.resolveRelativeFiles = function resolveRelativeFiles(path, files, metadata) {
};

function _newFileObj(name, location, path, icon, type) {
       var meta = Object.create(null);
       meta.name = name;
       meta.location = location;
       meta.path = path;
       meta.contentType = Object.create(null);
       if(icon) {
            meta.contentType.icon = icon;
       }
       if(type) {
            meta.contentType.name = type;
       }
       return meta;
   }

module.exports = ScriptResolver;