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
orionInstance = orionInstance()

class orionListeners(sublime_plugin.EventListener):
	def on_activated(self, view):
		print("activated")
		orionInstance.start_server()
class orionReferenceCommand(sublime_plugin.TextCommand):
	def run(self, edit):
		self.view.insert(edit, 0, "Hello, World!")
