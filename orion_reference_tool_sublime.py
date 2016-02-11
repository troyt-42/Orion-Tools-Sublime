import sublime, sublime_plugin
import os, sys, platform, subprocess, webbrowser, json, re, time, atexit
windows = platform.system() == "Windows"

class orionInstance(object):
	def __init__(self):
		self.ternServerStarted = False
		self.ternServer = None
		self.port = None
		self.last_failed = None
	def start_server(self):
		if self.ternServerStarted == False:
			ternServer = subprocess.Popen(
						["node", 'C:\\Users\\IBM_ADMIN\\AppData\\Roaming\\Sublime Text 3\\Packages\\tern_for_sublime\\node_modules/tern/bin/tern', '--no-port-file'],
						cwd=None,
						env=None,
                        stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        shell=windows)
			output = ""
			self.ternServerStarted = True
			while True:
				line = ternServer.stdout.readline().decode("utf-8")
				if not line:
					sublime.error_message("Failed to start tern server" + (output and ":\n" + output))
					self.last_failed = time.time()
					return None
				match = re.match("Listening on port (\\d+)", line)
				if match:
					self.ternServer = ternServer
					port = int(match.group(1))
					self.port = port
					return port
				else:
					output += line
	def send_request(self, doc):
		import urllib.request, urllib.error
		opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
		try:
			req = opener.open("http://localhost:" + str(self.port) + "/", json.dumps(doc).encode("utf-8"), 1)
			return json.loads(req.read().decode("utf-8"))
		except urllib.error.URLError as error:
			raise Req_Error(error.read().decode("utf-8"))
	def kill_server(self):
		if self.ternServer is None: return
		self.ternServer.stdin.close()
		self.ternServer.wait()
		self.ternServer = None

orionInstance = orionInstance()
requestDoc = {
	'files': [
		{	'text': '\t\t], __WEBPACK_AMD_DEFINE_RESULT__ = function() {\n\t\t\t\n\t\t\t/**\n\t\t\t * @description Returns if the given character is upper case or not considering the locale\n\t\t\t * @param {String} string A string of at least one char14acter\n\t\t\t * @return {Boolean} True iff the first character of the given string is uppercase\n\t\t\t */\n\t\t\t function isUpperCase(string) {\n\t\t\t\tif (string.length < 1) {\n\t\t\t\treturn false;\n\t\t\t\t}\n\t\t\t\tif (isNaN(string.charCodeAt(0))) {\n\t\t\t\t\treturn false;\n\t\t\t\t}\n\t\t\t\treturn string.toLocaleUpperCase().charAt(0) === string.charAt(0);\n\t\t\t}\n\t\t\t\n\t\t\t/**\n\t\t\t * @description Match ignoring case and checking camel case.\n\t\t\t * @param {String} prefix\n\t\t\t * @param {String} target\n\t\t\t * @returns {Boolean} If the two strings match\n\t\t\t */\n\t\t\tfunction looselyMatches(prefix, target) {\n\t\t\t\tif (typeof prefix !== "string" || typeof target !== "string") {\n\t\t\t\t\treturn false;\n\t\t\t\t}\n\t', 
			'name': 'OrionJavaScript.js', 'type': 'part', 'offset': 263533
		}
	], 
	'query': {
		'file': '#0', 
		'lineCharPositions': True, 
		'type': 'definition', 
		'end': 370
	}
};
class orionListeners(sublime_plugin.EventListener):
	def on_activated(self, view):
		print("activated")
		orionInstance.start_server()

class orionReferenceCommand(sublime_plugin.TextCommand):
	def run(self, edit):
		data = None
		try:
			data = orionInstance.send_request(requestDoc)
		except Req_Error as e:
			if not silent: report_error(str(e), pfile.project)
			return None
		except:
			pass
		print(data)
