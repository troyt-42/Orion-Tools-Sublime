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
define(function (require) {
    "use strict";
    
    var defaults = {
		"accessor-pairs" : 1,
		"curly" : 0,
		"eqeqeq": 1,
		"missing-doc" : 0, 
		"missing-nls" : 0,
		"new-parens" : 1,
		"no-caller": 1,
		"no-comma-dangle" : 0, 
		"no-cond-assign" : 2,
		"no-console" : 0, 
		"no-constant-condition" : 2,
		"no-control-regex" : 2,
		"no-debugger" : 1,
		"no-dupe-keys" : 2,
		"no-duplicate-case": 2,
		"no-else-return" : 1,
		"no-empty-block" : 0,
		"no-empty-character-class" : 2,
		"no-empty-label" : 2,
		"no-eq-null" : 1,
		"no-eval" : 0,
		"no-extra-boolean-cast" : 2,
		"no-extra-parens" : 1,
		"no-extra-semi": 1,
		"no-fallthrough" : 2, 
		"no-implied-eval" : 0,
		"no-invalid-regexp": 2,
		"no-irregular-whitespace" : 0,
		"no-iterator": 2, 
		"no-jslint" : 1, 
		"no-mixed-spaces-and-tabs" : 0,
		"no-negated-in-lhs" : 2,
		"no-new-array": 1,
		"no-new-func" : 1,
		"no-new-object" : 1,
		"no-new-wrappers" : 1,
		"no-obj-calls" : 2,
		"no-proto" : 2, 
		"no-redeclare" : 1,
		"no-regex-spaces" : 2,
		"no-reserved-keys" : 2,
		"no-self-compare" : 2,
		"no-self-assign" : 2,
		"no-shadow" : 1,
		"no-shadow-global" : 1,
		"no-sparse-arrays" : 1, 
		"no-throw-literal" : 1,
		"no-undef" : 2,
		"no-undef-init" : 1,
		"no-unreachable" : 2, 
		"no-unused-params" : 1,
		"no-unused-vars" : 1,
		"no-use-before-define" : 1,
		"no-with" : 1,
		"radix" : 1,
		"semi" : 1,
		"type-checked-consistent-return" : 0,
		"unnecessary-nls" : 0,
		"use-isnan" : 2,
		"valid-typeof" : 2
	};
    
    var CodeInspection  = brackets.getModule("language/CodeInspection");
    var orionJS,
        impl = {
            name: "Orion ESLint Problems",
            /**
             * API hooks for Brackets CodeInspection.
             * @since 0.0.1
             */
            scanFileAsync: function scanFileAsync(source, path) {
            	console.log("Doing some Orion linting...");
            	var promise = new $.Deferred();
            	var results = Object.create(null);
            	results.errors = [];
                if(orionJS && typeof orionJS.Tern.lint === 'function') {
                	orionJS.Tern.lint(path, defaults, null, [{type: 'full', name: path, text: source}], function(result, err){
                		if (err){
                			results.errors = [err];
                		} else {
                			results.errors = result.map(function(problem){
                				var message = problem.message;
                				var lineNum = problem.line;
                				lineNum--;
                				var type = CodeInspection.Type.WARNING;
                				if (problem.severity === 2){
                					type = CodeInspection.Type.ERROR;
                				}
                				return {
                					pos: {
                						line: lineNum,
                						ch: problem.column-1
                					},
                					type: type,
                					message: message
                				};
                			});
                		}
                		promise.resolve(results);
                	});
                } else {
                	promise.resolve(results);
                }
                return promise.promise();
            }
        };
    
   /**
    * Provides the hooks for Orion's ESLint integration and Brackets CodeInspection 
    * @constructs
    * @public
    */
   function Linter(orionJSObject) {
       orionJS = orionJSObject;
       CodeInspection.register('javascript', impl);
   }
   
   return Linter;
  
});