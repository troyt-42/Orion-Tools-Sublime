# Orion Tools For Sublime <img src="./orion.ico" align="right" width="40"><img src="./sublime.png" align="right" width="40">
A collection of plugins that provide Orion tools for Sublime.

# Install Orion Linter for Sublime #
1. Put the orion_lint_tool_sublime folder into the Packages directory of Sublime (you can find the path by click Preferences → Browse Packages in Sublime):
	* `WINDOWS: %APPDATA%\Sublime Text 3\Packages`
 	* `OS X: ~/Library/Application Support/Sublime Text 3\Packages`
 	* `Linux: ~/.config/sublime-text-3`
2. Run "npm install" to install the nodejs dependencies.

# Screenshot #
<img src="https://raw.githubusercontent.com/watrool/orion_tools_sublime/e2bec2d43770f2032a9e9b525d60ec6c6181a497/screenshot.png">
<img src="https://github.com/watrool/orion_tools_sublime/blob/master/screenshot2.png">

# Notice #
* Global variables like `console`, `require`, `define` should be added to `orion_global_variables.txt` to be recognized by the linter.

# Avaliable Quick Fixes#
1. `curly`
2. `eqeqeq`
3. `no-debugger`
4. `no-duplicate-case`
5. `no-eq-null`
6. `new-parens`
7. `no-self-assign`
8. `no-undef`
9. `no-undef-init`
10. `no-unreachable`
11. `no-unused-params`
12. `no-unused-vars`
13. `radix`
14. `semi`
15. `use-isnan`
16. `unnecessary-nls`

Details about these rules can be found here: http://eslint.org/docs/rules/
