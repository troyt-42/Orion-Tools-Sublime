var Messages = require("./Messages.js").messages;
exports.categories = {
	functionDecls: {
		name: Messages['functionDecls'],
		category: 'funcdecls', //$NON-NLS-1$
		sort: 1
	},
	functionCalls: {
		name: Messages['functionCalls'],
		category: 'funccalls', //$NON-NLS-1$
		sort: 2
	},
	propAccess: {
		name: Messages['propAccess'],
		category: 'propaccess', //$NON-NLS-1$
		sort: 3
	},
	propWrite: {
		name: Messages['propWrite'],
		category: 'propwrite', //$NON-NLS-1$
		sort: 4
	},
	varDecls: {
		name: Messages['varDecls'],
		category: 'vardecls', //$NON-NLS-1$
		sort: 5
	},
	varAccess: {
		name: Messages['varAccess'],
		category: 'varaccess', //$NON-NLS-1$
		sort: 6
	},
	varWrite: {
		name: Messages['varWrite'],
		category: 'varwrite', //$NON-NLS-1$
		sort: 7
	},
	regex: {
		name: Messages['regex'],
		category: 'regex', //$NON-NLS-1$
		sort: 8
	},
	strings: {
		name: Messages['strings'],
		category: 'strings', //$NON-NLS-1$
		sort: 9
	},
	blockComments: {
		name: Messages['blockComments'],
		category: 'blockcomments', //$NON-NLS-1$
		sort: 10
	},
	lineComments: {
		name: Messages['lineComments'],
		category: 'linecomments', //$NON-NLS-1$
		sort: 11
	},
	partial: {
		name: Messages['partial'],
		category: 'partial', //$NON-NLS-1$
		sort: 12
	},
	uncategorized: {
		name: Messages['uncategorized'],
		category: 'uncategorized', //$NON-NLS-1$
		sort: 13
	},
	syntax: {
		name: Messages['parseErrors'],
		category: 'parseerrors', //$NON-NLS-1$
		sort: 14
	}
};