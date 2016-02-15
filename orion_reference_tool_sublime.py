import sublime, sublime_plugin
import os, sys, platform, subprocess, webbrowser, json, re, time, atexit
windows = platform.system() == "Windows"
env = None
pluginDir = os.path.abspath(os.path.dirname(__file__))
if platform.system() == "Darwin":
	env = os.environ.copy()
	env['PATH'] += ":/usr/local/bin"
class orionInstance(object):
	def __init__(self):
		self.ternServerStarted = False
		self.ternServer = None
		self.port = None
		self.last_failed = None
		self.files = {}
	def start_server(self):
		if self.ternServerStarted == False:
			ternServer = subprocess.Popen(
						["node", pluginDir + '/node_modules/tern/bin/tern', '--no-port-file'],
						cwd=None,
						env=env,
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

class Req_Error(Exception):
  def __init__(self, message):
    self.message = message
  def __str__(self):
    return self.message

orionInstance = orionInstance()
testDoc = {
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
		allRegion = sublime.Region(0, self.view.size())
		allText = self.view.substr(allRegion)

		doc = {}

		doc["files"] = [{
			'text' : allText,
			'name' : self.view.file_name(),
			'type' : 'full'
		}]

		doc['query'] = {
			'file' : self.view.file_name(),
			'lineCharPositions' : True,
			'type' : 'refs',
			'end' : self.view.sel()[0].b #Assume only single selection
		}
		data = None
		try:
			data = orionInstance.send_request(doc)
		except Req_Error as e:
			print("Error:" + e.message)
			return None
		except:
			pass

		if data is not None and data['refs'] is not None:
			for ref in data['refs']:
				startPoint = self.view.text_point(ref['start']['line'], ref['start']['ch'])
				endPoint = self.view.text_point(ref['end']['line'], ref['end']['ch'])
				resultedRegion = sublime.Region(startPoint, endPoint)
				print(startPoint)
				self.view.sel().add(resultedRegion)
