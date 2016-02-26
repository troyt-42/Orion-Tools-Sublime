def semiFix(view,edit,point):
	view.insert(edit, point, ";")

defaultFixes = {
	"semi" : semiFix
}
class quickFixesLib():
	def __init__(self):
		self.defaultFixes = defaultFixes