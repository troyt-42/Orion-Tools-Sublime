import sublime, sublime_plugin
import os, sys, platform, subprocess, signal, webbrowser, json, re, time, atexit
sys.path.append(os.path.join(os.path.dirname(__file__)))
windows = platform.system() == "Windows"
env = None
pluginDir = os.path.abspath(os.path.dirname(__file__))

if platform.system() == "Darwin": 
	env = os.environ.copy()
	env["PATH"] += ":/usr/local/bin"

def kill_server(instance):
	if instance.orionServer is None: return
	instance.orionServer.stdin.close()
	instance.orionServer.kill()
	instance.orionServer = None
	instance.orionServerStarted = False

class orionInstance(object):
	def __init__(self):
		self.orionServerStarted = False
		self.orionServer = None
		self.port = None
		self.last_failed = None
		self.files = {}
	def start_server(self):
		if self.orionServerStarted == False:
			startupinfo = None
			if windows:
				startupinfo = subprocess.STARTUPINFO()
				startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
			orionServer = subprocess.Popen(
						["node", pluginDir+"/server.js"],
						cwd=None,
						env=env,
                        stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        startupinfo=startupinfo)
			output = ""
			self.orionServerStarted = True
			while True:
				line = orionServer.stdout.readline().decode("utf-8")
				if not line:
					sublime.error_message("Failed to start orion server" + (output and ":\n" + output))
					self.last_failed = time.time()
					return None
				match = re.match("Listening on port (\\d+)", line)
				if match:
					self.orionServer = orionServer
					port = int(match.group(1))
					print(port)
					self.port = port
					return port
				else:
					output += line
	def send_request(self, doc, url="/"):
		import urllib.request,  urllib.error
		opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
		try:
			req = opener.open("http://localhost:" + str(self.port) + url, json.dumps(doc).encode("utf-8"), 1)
			return json.loads(req.read().decode("utf-8"))
		except urllib.error.URLError as error:
			raise Req_Error(error.read().decode("utf-8"))
	def __del__(self):
		kill_server(self)

class Req_Error(Exception):
  def __init__(self, message):
    self.message = message
  def __str__(self):
    return self.message

class quickFixesLib():
	def __init__(self):
		self.defaultFixes = {
			"curly" : [{
				"des" : "Enclose statements in braces",
				"fix" : self.curlyFix
			}],
			"eqeqeq" : [{
				"des" : "Update operator",
				"fix" : self.eqeqeqFix
			}],
			"missing-doc" : [{
				"des" : "Generate element JSDoc",
				"fix" : self.fixActionHelper,
				"options" : {
					"id" : "missing-doc",
					"insert" : True
				}
			}],
			"missing-nls" : [{
				"des" : "Add missing $NON-NLS$ tag",
				"fix" : self.missingNlsFix
			}],			
			"new-parens" : [{
				"des" : "Add parentheses",
				"fix" : self.fixActionHelper,
				"options" : {
					"id" : "new-parens",
					"insert" : True
				}
			}],
			"no-comma-dangle" : [{
				"des" : "Remove extra comma",
				"fix" : self.noCommaDangleFix
			}],
			"no-debugger" : [{
				"des" : "Remove statement",
				"fix" : self.fixActionHelper,
				"options" : {
					"id" : "no-debugger",
					"erase" : True
				}
			}],
			"no-duplicate-case" : [{
				"des" : "Rename case",
				"fix" : self.noDuplicateCaseFix
			}],
			"no-dupe-keys" : [{
				"des" : "Rename key",
				"fix" : self.noDupeKeysFix
			}],
			"no-empty-block" : [{
				"des" : "Comment empty block",
				"fix" : self.fixActionHelper,
				"options" : {
					"id" : "no-empty-block",
					"insert" : True
				}
			}],
			"no-eq-null" : [{
				"des" : "Update operator",
				"fix" : self.eqeqeqFix
			}],
			"no-extra-parens" : [{
				"des" : "Remove gratuitous parentheses",
				"fix" : self.fixActionHelper,
				"options" : {
					"id" : "no-extra-parens",
					"erase" : True
				}
			}],
			"no-extra-semi" : [{
				"des" : "Remove extra semicolon",
				"fix" : self.noExtraSemiFix
			}],
			"no-fallthrough" : [{
				"des" : "Add $FALLTRHOUGH$ comment",
				"fix" : self.fixActionHelper,
				"options" : {
					"id" : "no-fallthrough",
					"insert" : True
				}
			}, {
				"des" : "Add break statement",
				"fix" : self.fixActionHelper,
				"options" : {
					"id" : "no-fallthrough-break",
					"insert" : True
				}
			}],
			"no-new-array" : [{
 				"des" : "Convert to name literal",
 				"fix" : self.fixActionHelper,
 				"options" : {
 					"id" : "no-new-array",
 					"insert" : True,
 					"erase" : True
 				}
 			}],
 			"no-new-wrappers" : [{
 				"des" : "Remove 'new' keyword",
 				"fix" : self.fixActionHelper,
 				"options" : {
 					"id" : "no-new-wrappers",
 					"insert" : True,
 					"erase" : True
 				}
 			}, {
 				"des" : "Convert to literal",
 				"fix" : self.fixActionHelper,
 				"options" : {
 					"id" : "no-new-wrappers-literal",
 					"insert" : True,
 					"erase" : True
 				}
 			}],
			"no-reserved-keys" : [{
				"des" : "Surround key with quotes",
				"fix" : self.fixActionHelper,
				"options" : {
 					"id" : "no-reserved-keys",
 					"insert" : True,
 					"erase" : True
 				}
			}],
			"no-self-assign":[{
				"des" : "Remove assignment",
				"fix" : self.fixActionHelper,
				"options" : {
 					"id" : "no-self-assign",
 					"erase" : True
 				}
 			}, {
 				"des" : "Rename right hand variable",
 				"fix" : self.noSelfAssignRenameFix
 			}],
 			"no-sparse-arrays" : [{
 				"des" : "Convert to normal array",
 				"fix" : self.fixActionHelper,
 				"options" : {
 					"id" : "no-sparse-arrays",
 					"insert" : True,
 					"erase" : True
 				}
 			}],
 			"no-throw-literal" : [{
 				"des" : "Change to Error",
 				"fix" : self.fixActionHelper,
 				"options" : {
 					"id" : "no-throw-literal",
 					"insert" : True,
 					"erase" : True
 				}
 			}],
			"no-undef" : [{
				"des" : "Add to Global Directive",
				"fix" : self.noUndefFix
			}, {
				"des" : "Add eslint-env Directive",
				"fix" : self.noUndefDefinedInenvFix,
				"pid" : "no-undef-defined-inenv"
			}],
			"no-undef-init" : [{
				"des" : "Remove assignment",
				"fix" : self.noUndefInitFix
			}],
			"no-unreachable" : [{
				"des" : "Remove unreachable code",
				"fix" : self.noUnreachableFix
			}],
			"no-unused-params" : [{
				"des" : "Remove parameter",
				"fix" : self.fixActionHelper,
				"options" : {
					"id" : "no-unused-params",
					"erase" : True
				}
			}, {
				"des" : "Add @callback to function",
				"fix" : self.fixActionHelper,
				"options" : {
					"id" : "no-unused-params-expr",
					"insert" : True
				},
				"pid" : "no-unused-params-expr"
			}],
			"no-unused-vars" : [{
				"des" : "Remove the unused variable",
				"fix" : self.fixActionHelper,
				"options" : {
					"id" : "no-unused-vars-unused",
					"erase" : True
				},
				"pid" : "no-unused-vars-unused"
			},{
				"des" : "Remove the unread variable",
				"fix" : self.fixActionHelper,
				"options" : {
					"id" : "no-unused-vars-unread",
					"erase" : True
				},
				"pid" : "no-unused-vars-unread"
			},{
				"des" : "Remove the unused function",
				"fix" : self.fixActionHelper,
				"options" : {
					"id" : "no-unused-vars-unused-funcdecl",
					"erase" : True
				},
				"pid" : "no-unused-vars-unused-funcdecl"
			}],
			"radix" : [{
				"des" : "Add default radix",
				"fix" : self.fixActionHelper,
				"options" : {
					"id" : "radix",
					"insert" : True
				}
			}],
			"semi" : [{
				"des" : "Add missing ';'",
				"fix" : self.semiFix
			}],
			"use-isnan" : [{
				"des" : "Use isNaN()",
				"fix" : self.fixActionHelper,
				"options" : {
					"id" : "use-isnan",
					"erase" : True,
					"insert" : True
				}
			}],
			"unnecessary-nls" : [{
				"des" : "Remove Unnecessary $NON-NLS$ tag",
				"fix" : self.unnecessaryNlsFix
			}]
		}
	@staticmethod
	def fixRequest(view, edit, index, errStart, errEnd, docKeysToChange):
		def update(a, b):
			for k, v in b.items():
				if type(v) != dict:
					a[k] = v
				elif a.get(k) == None:
					a[k] = v
				else:
					a[k] = update(a[k], b[k])
			return a
		allRegion = sublime.Region(0, view.size())
		allText = view.substr(allRegion)
		data = None

		docTemplate = {
	    	"text" : allText,
	    	"annotation" : {
	    		"start" : errStart,
	    		"end" : errEnd
	    	},
	    	"id":None
	    }
		doc = update(docTemplate, docKeysToChange)
		# print(doc)
		try:
			data = orionInstance.send_request(doc, "/quickFixes")
		except Req_Error as e:
			print("Error:" + e.message)
			return None
		except:
			pass
		# print(data)
		return data
	def fixActionHelper(self, view, edit,index, errStart, errEnd, options):
		# options includes fields: insert(Boolean), erase(Boolean), id(String), special(Dict)
		docKeysToChange = options.get("special");
		if docKeysToChange == None:
			docKeysToChange = {
				"id" : options.get("id")
			}
		data = self.fixRequest(view, edit, index, errStart, errEnd, docKeysToChange)
		if data != None:
			if options.get("erase", False) == True:
				if type(data) == list:
					regions = []
					for fix in data:
						regionTup = (fix["start"], fix["end"])
						regions.append(regionTup)
					regions.sort(key=lambda tup:tup[0], reverse=True)
					for re in regions:
						view.erase(edit, sublime.Region(re[0], re[1]))
				else:
					view.erase(edit, sublime.Region(data["start"], data["end"]))
			if options.get("insert", False) == True:
				view.insert(edit, data["start"], data["text"])
	def curlyFix(self, view, edit,index, errStart, errEnd):
		view.insert(edit, errStart, "{  ")
		view.insert(edit, errEnd+3, "  }")
	def eqeqeqFix(self, view, edit, index, errStart, errEnd):
		expected = re.match(r"^.*\'(\!==|===)\'", messages[index])
		if expected != None:
			view.erase(edit, sublime.Region(errStart, errEnd))
			view.insert(edit, min(errStart, errEnd), expected.group(1))
	def missingNlsFix(self, view, edit, index, errStart, errEnd):
		docKeysToChange = {
			"id" : "missing-nls",
			"annotation" : { "data" : metaMessages[index]["args"]["data"]}
		}
		data = self.fixRequest(view, edit, index, errStart, errEnd, docKeysToChange)
		if data != None:
			view.insert(edit, data["start"], data["text"])
	def noCommaDangleFix(self, view, edit, index, errStart, errEnd):
		view.erase(edit, sublime.Region(errStart, errEnd))
	def noDuplicateCaseFix(self, view, edit, index, errStart, errEnd):
		docKeysToChange = {
			"id" : "no-duplicate-case"
		}
		data = self.fixRequest(view, edit, index, errStart, errEnd, docKeysToChange)
		if data is not None:
			group = data["groups"][0] #Assume single group
			view.sel().clear()
			for pos in group['positions']:
				view.sel().add(sublime.Region(pos['offset'], pos['offset']+pos['length']))
	def noDupeKeysFix(self, view, edit, index, errStart, errEnd):
		docKeysToChange = {
			"id" : "no-dupe-keys"
		}
		data = self.fixRequest(view, edit, index, errStart, errEnd, docKeysToChange)
		if data is not None:
			group = data["groups"][0] #Assume single group
			view.sel().clear()
			for pos in group['positions']:
				view.sel().add(sublime.Region(pos['offset'], pos['offset']+pos['length']))
	def noExtraSemiFix(self, view, edit, index, errStart, errEnd):
		view.erase(edit, sublime.Region(errStart, errEnd))
	def noSelfAssignRenameFix(self, view, edit, index, errStart, errEnd):
		docKeysToChange = { 
			"id" : "no-self-assign-rename"
			}
		data = self.fixRequest(view, edit, index, errStart, errEnd, docKeysToChange)
		if data is not None:
			group = data["groups"][0] #Assume single group
			view.sel().clear()
			for pos in group['positions']:
				view.sel().add(sublime.Region(pos['offset'], pos['offset']+pos['length']))
	def noUndefFix(self, view, edit,index, errStart, errEnd):
		docKeysToChange = { 
			"id" : "no-undef", 
			"annotation" : {"title" : messages[index]}
			}
		data = self.fixRequest(view, edit, index, errStart, errEnd, docKeysToChange)
		if data is not None:
			view.insert(edit, data["point"], data["text"])
	def noUndefDefinedInenvFix(self, view, edit,index, errStart, errEnd):
		docKeysToChange = { 
			"id" : "no-undef-defined-inenv", 
			"annotation" : {"title" : messages[index]}
			}
		data = self.fixRequest(view, edit, index, errStart, errEnd, docKeysToChange)
		if data is not None:
			view.insert(edit, data["point"], data["text"])
	def noUndefInitFix(self, view, edit, index, errStart, errEnd):
		docKeysToChange = { 
			"id" : "no-undef-init", 
			"annotation" : {"title" : messages[index]}
			}
		data = self.fixRequest(view, edit, index, errStart, errEnd, docKeysToChange)
		if data is not None:
			view.erase(edit, sublime.Region(data["start"], data["end"]));
	def noUnreachableFix(self, view, edit,index, errStart, errEnd):
		view.erase(edit, sublime.Region(view.full_line(errStart).a, view.full_line(errEnd).b))
	def semiFix(self, view, edit,index, errStart, errEnd):
		view.insert(edit, errEnd, ";")
	def unnecessaryNlsFix(self, view, edit, index, errStart, errEnd):
		global metaMessages
		docKeysToChange = {
			"id" : "unnecessary-nls",
			"annotation" : { "data" : metaMessages[index]["args"]["data"]}
		}
		
		data = self.fixRequest(view, edit, index, errStart, errEnd, docKeysToChange)
		if data != None:
			view.erase(edit, sublime.Region(data["start"], data["end"]))

orionInstance = orionInstance()
quickFixesInstance = quickFixesLib()
metaMessages = []
messages = []
messageLocs = []
messageStatus = []
globalVariables = []
quickFixes = []
lastSel = None
class orionListeners(sublime_plugin.EventListener):
	def on_post_save(self, view):
		view.run_command("orion_lint")
	def on_close(self, view):
		if len(sublime.active_window().views_in_group(1)) == 0:
			sublime.active_window().set_layout({
			    "cols": [0, 1],
			    "rows": [0, 1],
			    "cells": [
			    		[0, 0, 1, 1]
			    		]
			})
	def on_selection_modified(self, view):
		global lastSel
		if(view.sel()[0].a != view.sel()[0].b):
			if view.sel()[0] != lastSel:
				lastSel = view.sel()[0]
				view.run_command("orion_tooltip")
class orionLintCommand(sublime_plugin.TextCommand):
	def run(self, edit):
		if os.path.isfile('orion_global_variables.txt'):
			globalVariableFile = open(pluginDir+'/orion_global_variables.txt', 'r');
			global globalVariables
			for line in globalVariableFile:
				for var in line.split():
					globalVariables.append(var)
		else:
			globalVariableFile = open(pluginDir+'/orion_global_variables.txt', 'a');
			globalVariableFile.close()
		if self.view.file_name()[len(self.view.file_name()) -3:] == ".js":
			def select_error_helper(x):
				if x >= 0:
					self.view.sel().clear() 
					self.view.sel().add(messageLocs[x])
					self.view.show_at_center(messageLocs[x])
					sublime.set_timeout(lambda : self.view.run_command("orion_tooltip"), 300)	
				else:
					pass
			orionInstance.start_server()
			allRegion = sublime.Region(0, self.view.size())
			allText = self.view.substr(allRegion)

			doc = {
				"files":[{
					"text" : allText,
					"name" : self.view.file_name(),
					"type" : "full"
				}]
			}
			
			data = None
			try:
				data = orionInstance.send_request(doc)
			except Req_Error as e:
				print("Error:" + e.message)
				return None
			except:
				pass

			warnings = []
			errors = []
			del messages[:]
			del messageLocs[:]
			del messageStatus[:]
			del quickFixes[:]
			if data != None:
				global metaMessages
				metaMessages = data
				for result in data:
					# print(result)
					undefError = result.get("ruleId", None) == "no-undef"
					if undefError:
						temp = result["message"].split('\'')[1]
						if temp in globalVariables:
							continue
					region = None
					if result.get("related", None) != None and result["related"].get("range", None) != None:
						region = sublime.Region(result["related"]["range"][0],  result["related"]["range"][1])
					else:
						region = sublime.Region(result["node"]["range"][0],  result["node"]["range"][1])

					messages.append(str(self.view.rowcol(region.a)[0]+1)+":"+str(self.view.rowcol(region.a)[1]+1)+" "+ result["message"]+"\n")
					messageLocs.append(region)
					messageStatus.append(True)
					if result.get("severity", 0) <= 1:
						warnings.append(region)
					else:
						errors.append(region)
					tempFix = None
					if quickFixesInstance.defaultFixes.get(result.get("ruleId", "None"),None) != None:
						tempFix = quickFixesInstance.defaultFixes.get(result.get("ruleId", "None"),None).copy()
					if tempFix != None:
						tempFix[:] = [ x for x in tempFix if x.get("pid", None) == None or result["args"].get("pid", None) == x.get("pid") or result["args"].get("nls", None) == x.get("pid")]
					quickFixes.append(tempFix)
				self.view.add_regions("orionLintWarnings", warnings, "keyword", "Packages/orion_tools_sublime/warning.png", sublime.DRAW_NO_FILL | sublime.DRAW_NO_OUTLINE | sublime.DRAW_SOLID_UNDERLINE)
				self.view.add_regions("orionLintErrors", errors, "keyword", "Packages/orion_tools_sublime/error.png", sublime.DRAW_NO_FILL | sublime.DRAW_NO_OUTLINE | sublime.DRAW_SOLID_UNDERLINE)
				self.view.window().show_quick_panel(messages, select_error_helper)
			self.view.run_command("lint_window", { "messages" : messages})
class lintWindowCommand(sublime_plugin.TextCommand):
	def run(self, edit, messages):
		if len(messages) > 0:
			first_open = True
			if self.view.window().num_groups() > 1:
				first_open = False
			if first_open:
				self.view.window().set_layout({
				    "cols": [0, 1],
				    "rows": [0,0.8, 1],
				    "cells": [
				    		[0, 0, 1, 1], 
				    		[0, 1, 1, 2]
				    		]
				})

			if self.view.window().active_group() == 1:
				sublime.error_message("Wrong group selected")
			elif len(self.view.window().views_in_group(1)) > 1:
				sublime.error_message("Lint Window is dirty, Should keep it clean")
			else:
				lint_view = None
				if len(self.view.window().views_in_group(1)) == 1:
					lint_view = self.view.window().active_view_in_group(1)
					lint_view.set_read_only(False)
					lint_view.erase(edit, sublime.Region(0, lint_view.size()))
				else:
					lint_view = self.view.window().new_file()
					self.view.window().set_view_index(lint_view, 1, 0)
				lint_view.set_scratch(True)
				temp_row = 0
				for message in messages:
					tempPoint = lint_view.text_point(temp_row, 0)
					lint_view.insert(edit, tempPoint, message)
					temp_row += 1
				lint_view.set_read_only(True)
				self.view.window().focus_view(self.view)
		else:
			if self.view.window().num_groups() == 2:
				views = self.view.window().views_in_group(1)
				for i in range(len(views)):
					views[i].close()
			sublime.active_window().set_layout({
			    "cols": [0, 1],
			    "rows": [0, 1],
			    "cells": [
			    		[0, 0, 1, 1]
			    		]
			})
class orionTooltipCommand(sublime_plugin.TextCommand):
	def run(self, edit):
		if self.view.file_name() and self.view.file_name()[len(self.view.file_name()) -3:] == ".js":
			if self.view.file_name() == None: return
			selection = self.view.sel()[0] #Assume single selection
			temp = []
			tempIndexes = []
			itemsInsideError = []
			def close_tooltip(x):
				if x >= 0 and type(temp[x]) == str and re.match(r"^Quick Fix", temp[x]) == None:
					messageStatus[tempIndexes[x]] = False
				elif  x >= 0 and type(temp[x]) == str and re.match(r"^Quick Fix", temp[x]) != None:
					if a == selection.a:
						self.view.run_command("execute_fixes", { "kind" : tempIndexes[x], "index" : itemsInsideError[x], "errStart" : selection.a, "errEnd" : selection.b})
					else:
						self.view.run_command("execute_fixes", { "kind" : tempIndexes[x], "index" : itemsInsideError[x], "errStart" : selection.b, "errEnd" : selection.a})
			for index, loc in enumerate(messageLocs):
				a = loc.a
				b = loc.b
				if a == selection.a and b == selection.b or a == selection.b and b == selection.a:
					if messageStatus[index] == True:
						temp.append(messages[index] + "                    Click to ignore")
						itemsInsideError.append(-1)
						tempIndexes.append(index)
						if quickFixes[index] != None:
							for i in range(len(quickFixes[index])):
								temp.append("Quick Fix: " + quickFixes[index][i]["des"])
								itemsInsideError.append(i)
								tempIndexes.append(index)
			if(len(temp) != 0):
				self.view.show_popup_menu(temp, close_tooltip)
				global lastSel
				lastSel = None
class executeFixes(sublime_plugin.TextCommand):
	def run(self, edit, kind, index, errStart, errEnd):
		if quickFixes[kind][index].get("options") != None:
			quickFixes[kind][index]["fix"](self.view, edit, kind, min(errStart, errEnd), max(errStart, errEnd), quickFixes[kind][index].get("options"))
		else: 
			quickFixes[kind][index]["fix"](self.view, edit, kind, min(errStart, errEnd), max(errStart, errEnd))
		reLintException = ["Rename right hand variable", "Rename case", "Rename key"]
		if quickFixes[kind][index]["des"] not in reLintException:
			self.view.run_command("orion_lint")




