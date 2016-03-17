# Orion Tools For Sublime <img src="./orion.ico" align="right" width="40"><img src="./sublime.png" align="right" width="40">
A collection of plugins that provide Orion tools for Sublime.

# Install Orion Linter for Sublime #
1. Put the orion_lint_tool_sublime folder into the Packages directory of Sublime (you can find the path by click Preferences → Browse Packages in Sublime):
	* `WINDOWS: %APPDATA%\Sublime Text 3\Packages`
 	* `OS X: ~/Library/Application Support/Sublime Text 3\Packages`
 	* `Linux: ~/.config/sublime-text-3`
2. Run "npm install" to install the nodejs dependencies.

# Screenshot #
##Linter: ##
<img src="https://github.com/watrool/orion_tools_sublime/raw/master/linter_screenshot.png">
<img src="https://github.com/watrool/orion_tools_sublime/raw/master/linter_screenshot_2.png">
<img src="https://github.com/watrool/orion_tools_sublime/raw/master/linter_screenshot_3.png">
##References: ##
<img src="https://github.com/watrool/orion_tools_sublime/raw/master/ref_screenshot_4.png">
<img src="https://github.com/watrool/orion_tools_sublime/raw/master/ref_screenshot_5.png">

# Notice #
* Global variables like `console`, `require`, `define` should be added to `orion_global_variables.txt` to be recognized by the linter.

# Avaliable Quick Fixes#
1. `curly`
2. `eqeqeq`
3. `missing-nls`
4. `missing-doc`
5. `new-parens`
6. `no-comma-dangle`
7. `no-debugger`
8. `no-duplicate-case`
9. `no-dupe-keys`
10. `no-empty-block`
11. `no-eq-null`
12. `no-extra-parens`
13. `no-extra-semi`
14. `no-fallthrough`
15. `no-new-wrappers`
16. `no-reserved-keys`
17. `no-self-assign`
18. `no-shadow`
19. `no-shadow-global`
20. `no-shadow-global-param`
21. `no-sparse-arrays`
22. `no-throw-literal`
23. `no-undef`
24. `no-undef-init`
25. `no-unreachable`
26. `no-unused-params`
27. `no-unused-vars`
28. `radix`
29. `semi`
30. `use-isnan`
31. `unnecessary-nls`

Details about these rules can be found here: http://eslint.org/docs/rules/
