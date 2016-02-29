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
			"curly" : self.curlyFix,
			"no-undef" : self.noUndefFix,
			"radix" : self.radixFix,
			"semi" : self.semiFix
		}
	@staticmethod
	def curlyFix(view, edit,index, errStart, errEnd):
		view.insert(edit, errStart, "{  ")
		view.insert(edit, errEnd+3, "  }")
	@staticmethod
	def noUndefFix(view, edit,index, errStart, errEnd):
		allRegion = sublime.Region(0, view.size())
		allText = view.substr(allRegion)

		doc = {
	    	"text" : allText,
	    	"annotation" : {
	    		"start" : errStart,
	    		"end" : errEnd,
	    		"title" : messages[index]
	    	},
	    	"id":"no-undef"
	    }
		data = None
		try:
			data = orionInstance.send_request(doc, "/quickFixes")
		except Req_Error as e:
			print("Error:" + e.message)
			return None
		except:
			pass
		if data is not None:
			view.insert(edit, data["point"], data["text"])
	@staticmethod
	def radixFix(view, edit,index, errStart, errEnd):
		allRegion = sublime.Region(0, view.size())
		allText = view.substr(allRegion)
		doc = {
	    	"text" : allText,
	    	"annotation" : {
	    		"start" : errStart,
	    		"end" : errEnd
	    	},
	    	"id":"radix"
	    }
	    
		data = None
		try:
			data = orionInstance.send_request(doc, "/quickFixes")
		except Req_Error as e:
			print("Error:" + e.message)
			return None
		except:
			pass
		view.insert(edit, data["start"], data["text"])
	@staticmethod
	def semiFix(view, edit,index, errStart, errEnd):
		print(errStart)
		view.insert(edit, errEnd, ";")

orionInstance = orionInstance()
quickFixesInstance = quickFixesLib()
messages = []
messageLocs = []
messageStatus = []
globalVariables = []
quickFixes = []

class orionListeners(sublime_plugin.EventListener):
	def __init__(self):
		self.lastSel = None
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
		if(view.sel()[0].a != view.sel()[0].b):
			if view.sel()[0] != self.lastSel:
				self.lastSel = view.sel()[0]
				view.run_command("orion_tooltip")
class orionLintCommand(sublime_plugin.TextCommand):
	def run(self, edit):
		if os.path.isfile('orion_global_variables.txt'):
			globalVariableFile = open(pluginDir+'/orion_global_variables.txt', 'r');
			globalVariables = []
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
				for result in data:
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
					messages.append(str(result["line"])+":"+str(result["column"])+" "+ result["message"]+"\n")
					messageLocs.append(region)
					messageStatus.append(True)
					if result.get("severity", 0) <= 1:
						warnings.append(region)
					else:
						errors.append(region)
					quickFixes.append(quickFixesInstance.defaultFixes.get(result.get("ruleId", "None"),None))
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
		if self.view.file_name() == None: return
		selection = self.view.sel()[0] #Assume single selection
		for index, loc in enumerate(messageLocs):
			a = loc.a
			b = loc.b
			if a == selection.a and b == selection.b or a == selection.b and b == selection.a:
				def close_tooltip(x):
					if x == 0:
						messageStatus[index] = False
					elif x == 1:
						if a == selection.a:
							self.view.run_command("execute_fixes", { "index" : index, "errStart" : selection.a, "errEnd" : selection.b})
						else:
							self.view.run_command("execute_fixes", { "index" : index, "errStart" : selection.b, "errEnd" : selection.a})
				if messageStatus[index] == True:
					if quickFixes[index] == None:
						self.view.show_popup_menu([messages[index] + "                    Click to close"], close_tooltip)
					else:
						self.view.show_popup_menu([messages[index] + "                    Click to close", "Quick Fix"], close_tooltip)
				break
class executeFixes(sublime_plugin.TextCommand):
	def run(self, edit, index, errStart, errEnd):
		quickFixes[index](self.view, edit, index, errStart, errEnd)
		self.view.run_command("orion_lint")




