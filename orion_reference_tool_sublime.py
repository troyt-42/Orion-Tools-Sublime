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
						["node", pluginDir+"/server-test.js"],
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


orionInstance = orionInstance()

class orionReferences(sublime_plugin.TextCommand):
	def run(self, edit):
		if self.view.file_name()[len(self.view.file_name()) -3:] == ".js":
			orionInstance.start_server();
			originStr = self.view.substr(self.view.sel()[0])
			doc = {
				"textToSearch" : originStr,
				"searchLoc" : self.view.window().folders()[0],
				"files" : [self.view.file_name()],
				"start" : min(self.view.sel()[0].a, self.view.sel()[0].b),
				"end" : max(self.view.sel()[0].a, self.view.sel()[0].b),
				"fileName" : self.view.file_name()
			}
			data = None
			try:
				data = orionInstance.send_request(doc, "/References")
			except Req_Error as e:
				print("Error:" + e.message)
				return None
			except:
				pass
			if data != None:
				ref_result_view = self.view.window().new_file();
				ref_result_view.set_scratch(True);

				tempPoint = 0;
				ref_result_view.insert(edit, tempPoint, "References Result\n\n")
				tempPoint += len("References Result\n\n")
				for result in data:
					if result["confidence"] >= 0:
						ref_result_view.insert(edit, tempPoint, str(result["path"])+"\n")
						tempPoint += len(str(result["path"])+"\n")
						for key in result:
							if key != "path":
								ref_result_view.insert(edit, tempPoint, "\t"+key+":"+str(result[key])+"\n")
								tempPoint += len("\t"+key+":"+str(result[key])+"\n")
						
						
					