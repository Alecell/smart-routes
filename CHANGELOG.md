# Changelog

## 1.0.2

This version came with most needed code refactor, the previous version was a complete mess. Sincerely I upload the package without much care about the code itself, I just wanted to make the functionality work. Now the code is away better, readable, removed deprecated dependency, add a bit of error handling and removed the annoying global and insecure global variable `path`.

I do my best to avoid breaking changes, but as the code was refactored (actually it was rewritten) I have no choice but create a new breaking change version.

- Slash '`/`' don't apply automatically. That auto add lead to some unexpected bugs, now each route must be preceded by a slash.

- Error throwing when send param to a not parameterized route.

- To get the route use `.path` instead of `.exec()`. Its more readable and intuitive.