"""Tests for scripts/slop_lint.py (mechanical UI anti-pattern lint)."""
import json

import pytest

import slop_lint
from conftest import run_script

RM = "@media (prefers-reduced-motion: reduce) { * { animation: none; } }\n"


def lint(tmp_path, name, content, extra=None):
    """Lint one file (plus optional extra files) and return the list of findings."""
    target = tmp_path / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    for other_name, other in (extra or {}).items():
        (tmp_path / other_name).write_text(other, encoding="utf-8")
    return slop_lint.lint_paths([tmp_path])


def rules(findings):
    return {f.rule for f in findings}


# (rule, filename, positive content, negative content)
CASES = [
    ("UC001", "a.css", ".a { transition: all 200ms ease-out; }",
     ".a { transition: opacity 200ms ease-out; }"),
    ("UC001", "a.html", '<div class="transition-all duration-200"></div>',
     '<div class="transition-colors duration-200"></div>'),
    ("UC002", "a.css", ".a { transition: width 200ms ease-out; }",
     ".a { transition: transform 200ms ease-out, opacity 200ms; }"),
    ("UC002", "b.css", "@keyframes grow {\n  from { height: 0; }\n  to { height: 10px; }\n}",
     "@keyframes rise {\n  from { transform: translateY(8px); }\n  to { transform: none; }\n}"),
    ("UC002", "a.jsx", "<motion.div animate={{ width: 200 }} />",
     "<motion.div animate={{ scale: 1.1 }} style={{ width: 200 }} />"),
    ("UC002", "c.css", ".a { transition-property: margin-top; }",
     ".a { transition-property: box-shadow; }"),
    ("UC004", "a.css", "button:focus { outline: none; }",
     "button:focus { outline: none; }\nbutton:focus-visible { outline: 2px solid; }"),
    ("UC004", "a.html", '<button class="focus:outline-none">x</button>',
     '<button class="focus:outline-none focus-visible:ring-2">x</button>'),
    ("UC005", "a.css", ".h { background: linear-gradient(90deg, #6366f1, #a855f7); }",
     ".h { background: linear-gradient(90deg, #0f766e, #155e75); }"),
    ("UC005", "a.html", '<div class="bg-gradient-to-r from-indigo-500 to-purple-500"></div>',
     '<div class="bg-gradient-to-r from-amber-200 to-orange-300 text-indigo-500"></div>'),
    ("UC006", "a.css", ".hero { min-height: 100vh; }",
     ".hero { min-height: 100dvh; }"),
    ("UC006", "b.css", ".hero { height: 100vh; }",
     ".hero { height: 100vh; height: 100svh; }"),
    ("UC006", "a.html", '<section class="h-screen"></section>',
     '<section class="h-dvh screen-reader"></section>'),
    ("UC007", "a.css", ".m { z-index: 9999; }", ".m { z-index: 50; }"),
    ("UC007", "a.jsx", "<div style={{ zIndex: 1000 }} />", "<div style={{ zIndex: 10 }} />"),
    ("UC007", "a.html", '<div class="z-[999]"></div>', '<div class="z-50"></div>'),
    ("UC008", "a.html", '<img src="a.png">', '<img src="a.png" alt="">'),
    ("UC008", "a.jsx", "<img\n  src={src}\n  className='x'\n/>", "<img\n  src={src}\n  alt={title}\n/>"),
    ("UC009", "a.html", "<p>Lorem ipsum dolor sit amet</p>", "<p>Ship invoices in minutes</p>"),
    ("UC009", "b.html", "<h1>Welcome to our website</h1>", "<h1>Welcome back, Ada</h1>"),
    ("UC010", "a.html", "<h2>\U0001F680 Fast deploys</h2>", "<h2>Fast deploys</h2>"),
    ("UC010", "b.html", "<button>Launch ✨</button>", "<button>Continue →</button>"),
    ("UC011", "a.css", ".a { transition: opacity 300ms ease-in; }",
     ".a { transition: opacity 300ms ease-in-out; }"),
    ("UC011", "b.css", ".a { transition: transform 300ms linear; }",
     ".spinner { animation: spin 1s linear infinite; }"),
    ("UC011", "a.html", '<div class="transition-opacity ease-in"></div>',
     '<div class="transition-opacity ease-out"></div>'),
    ("UC012", "a.css", ".a { transition: opacity 1500ms ease-out; }",
     ".a { transition: opacity 600ms ease-out 2s; }"),
    ("UC012", "b.css", ".a { animation: fade 2s ease-out; }",
     ".marquee { animation: scroll 20s linear infinite; }"),
    ("UC012", "a.html", '<div class="transition duration-[1200ms]"></div>',
     '<div class="transition duration-700"></div>'),
    ("UC012", "a.jsx", "<motion.div transition={{ duration: 1.6 }} />",
     "<motion.div transition={{ duration: 0.4 }} />"),
    ("UC013", "a.css", "h1, h2 { font-family: Inter, sans-serif; }",
     "h1, h2 { font-family: 'Fraunces', serif; }\nbody { font-family: Inter, sans-serif; }"),
    ("UC013", "b.css", ":root { --font-display: 'Roboto', sans-serif; }",
     ":root { --font-display: 'Instrument Serif', serif; --font-body: Inter; }"),
    ("UC014", "a.css", "body { color: #000; background: #fff; }",
     "body { color: #111; background: #fafafa; }"),
    ("UC014", "a.html", '<body class="bg-white text-black"></body>',
     '<body class="bg-white text-neutral-900"></body>'),
    ("UC015", "a.jsx", "<div onClick={() => open()}>Open</div>",
     '<div role="button" tabIndex={0} onClick={() => open()}>Open</div>'),
    ("UC015", "a.vue", '<span @click="open">Open</span>',
     '<button @click="open">Open</button>'),
    ("UC016", "a.css", "".join(f".c{i} {{ color: red !important; }}\n" for i in range(6)),
     "".join(f".c{i} {{ color: red !important; }}\n" for i in range(5))),
    ("UC017", "a.js", "window.addEventListener('scroll', onScroll);",
     "window.addEventListener('scroll', onScroll, { passive: true });"),
    ("UC017", "b.js", "el.addEventListener(\n  'wheel',\n  handler,\n  { capture: true }\n);",
     "el.addEventListener(\n  'wheel',\n  handler,\n  { passive: true }\n);"),
    ("UC018", "a.html",
     '<meta name="viewport" content="width=device-width, user-scalable=no">',
     '<meta name="viewport" content="width=device-width, initial-scale=1">'),
    ("UC018", "b.html",
     '<meta name="viewport" content="width=device-width, maximum-scale=1">',
     '<meta name="viewport" content="width=device-width, maximum-scale=5">'),
]


@pytest.mark.parametrize("rule,name,positive,negative", CASES,
                         ids=[f"{c[0]}-{c[1]}-{i}" for i, c in enumerate(CASES)])
def test_rule_positive(tmp_path, rule, name, positive, negative):
    found = lint(tmp_path, name, positive, extra={"rm.css": RM})
    assert rule in rules(found), [str(f) for f in found]


@pytest.mark.parametrize("rule,name,positive,negative", CASES,
                         ids=[f"{c[0]}-{c[1]}-{i}" for i, c in enumerate(CASES)])
def test_rule_negative(tmp_path, rule, name, positive, negative):
    found = lint(tmp_path, name, negative, extra={"rm.css": RM})
    assert rule not in rules(found), [str(f) for f in found]


def test_every_contract_rule_has_cases():
    covered = {c[0] for c in CASES} | {"UC003"}
    assert covered == set(slop_lint.RULES)
    assert len(slop_lint.RULES) == 18


# --- UC003 (project-level) -------------------------------------------------------------------

def test_uc003_reported_once_without_reduced_motion(tmp_path):
    (tmp_path / "a.css").write_text(".a { transition: opacity 200ms; }", encoding="utf-8")
    (tmp_path / "b.css").write_text("@keyframes x { to { opacity: 1; } }", encoding="utf-8")
    found = [f for f in slop_lint.lint_paths([tmp_path]) if f.rule == "UC003"]
    assert len(found) == 1


@pytest.mark.parametrize("handling", [
    RM, "const reduce = useReducedMotion();",
    '<div class="motion-safe:animate-bounce"></div>',
    "matchMedia('(prefers-reduced-motion: reduce)')",
])
def test_uc003_satisfied_by_any_handling(tmp_path, handling):
    (tmp_path / "a.css").write_text(".a { transition: opacity 200ms; }", encoding="utf-8")
    (tmp_path / "h.jsx").write_text(handling, encoding="utf-8")
    assert "UC003" not in rules(slop_lint.lint_paths([tmp_path]))


def test_uc003_not_reported_without_animation(tmp_path):
    (tmp_path / "a.css").write_text(".a { color: red; }", encoding="utf-8")
    assert "UC003" not in rules(slop_lint.lint_paths([tmp_path]))


def test_uc013_reported_once_per_run(tmp_path):
    (tmp_path / "a.css").write_text("h1 { font-family: Arial; }\nh2 { font-family: Arial; }",
                                    encoding="utf-8")
    (tmp_path / "b.css").write_text("h3 { font-family: system-ui; }", encoding="utf-8")
    found = [f for f in slop_lint.lint_paths([tmp_path]) if f.rule == "UC013"]
    assert len(found) == 1


def test_uc016_reported_once_per_file(tmp_path):
    body = "".join(f".c{i} {{ color: red !important; }}\n" for i in range(9))
    found = [f for f in lint(tmp_path, "a.css", body) if f.rule == "UC016"]
    assert len(found) == 1 and found[0].line == 6


# --- suppression, filters, traversal ---------------------------------------------------------

def test_inline_suppression_same_line(tmp_path):
    found = lint(tmp_path, "a.css",
                 ".a { transition: all 1s; } /* ui-craft-ignore UC001 */", {"rm.css": RM})
    assert "UC001" not in rules(found)


def test_inline_suppression_previous_line(tmp_path):
    found = lint(tmp_path, "a.css",
                 "/* ui-craft-ignore UC006, UC007 */\n.a { height: 100vh; z-index: 9999; }")
    assert not {"UC006", "UC007"} & rules(found)


def test_suppression_is_rule_specific(tmp_path):
    found = lint(tmp_path, "a.css", ".a { height: 100vh; } /* ui-craft-ignore UC007 */")
    assert "UC006" in rules(found)


def test_suppression_does_not_leak_two_lines(tmp_path):
    found = lint(tmp_path, "a.css", "/* ui-craft-ignore UC006 */\n\n.a { height: 100vh; }")
    assert "UC006" in rules(found)


def test_line_numbers_and_format(tmp_path):
    found = lint(tmp_path, "a.css", "\n\n.m { z-index: 9999; }")
    f = next(f for f in found if f.rule == "UC007")
    assert f.line == 3
    assert str(f).endswith(":3: UC007 [med] " + f.message)


def test_skip_dirs_and_extensions(tmp_path):
    for skipped in ("node_modules", "dist", "build", ".next", ".git"):
        d = tmp_path / skipped
        d.mkdir()
        (d / "a.css").write_text(".a { transition: all 1s; }", encoding="utf-8")
    (tmp_path / "notes.md").write_text("transition: all", encoding="utf-8")
    (tmp_path / "x.min.css").write_text(".a{transition:all 1s}", encoding="utf-8")
    assert slop_lint.lint_paths([tmp_path]) == []


def test_single_file_path(tmp_path):
    f = tmp_path / "a.css"
    f.write_text(".m { z-index: 9999; }", encoding="utf-8")
    assert "UC007" in rules(slop_lint.lint_paths([f]))


def test_cli_ignore_and_exit_codes(tmp_path, capsys):
    (tmp_path / "a.css").write_text(".m { z-index: 9999; }", encoding="utf-8")
    assert slop_lint.main([str(tmp_path)]) == 1
    assert "UC007 [med]" in capsys.readouterr().out
    assert slop_lint.main([str(tmp_path), "--ignore", "UC007"]) == 0
    capsys.readouterr()


def test_cli_severity_filter(tmp_path, capsys):
    (tmp_path / "a.css").write_text(".a { transition: all 200ms; z-index: 9999; }",
                                    encoding="utf-8")
    code = slop_lint.main([str(tmp_path), "--severity", "high", "--json"])
    payload = json.loads(capsys.readouterr().out)
    assert code == 1
    assert {f["severity"] for f in payload["findings"]} == {"high"}
    assert "UC007" not in {f["rule"] for f in payload["findings"]}


def test_cli_severity_accepts_medium_alias(tmp_path, capsys):
    (tmp_path / "a.css").write_text(".m { z-index: 9999; }", encoding="utf-8")
    assert slop_lint.main([str(tmp_path), "--severity", "medium"]) == 1
    capsys.readouterr()


def test_cli_json_shape(tmp_path, capsys):
    (tmp_path / "a.css").write_text(".m { z-index: 9999; }", encoding="utf-8")
    slop_lint.main([str(tmp_path), "--json"])
    payload = json.loads(capsys.readouterr().out)
    assert payload["files_scanned"] == 1
    assert payload["count"] == len(payload["findings"])
    f = payload["findings"][0]
    assert set(f) == {"path", "line", "rule", "severity", "message"}


def test_cli_clean_run(tmp_path, capsys):
    (tmp_path / "a.css").write_text(".a { color: #222; }", encoding="utf-8")
    assert slop_lint.main([str(tmp_path)]) == 0
    assert "No issues" in capsys.readouterr().out


@pytest.mark.parametrize("argv", [["--ignore", "UC999"], ["--severity", "extreme"]])
def test_cli_usage_errors(tmp_path, capsys, argv):
    assert slop_lint.main([str(tmp_path), *argv]) == 2
    assert capsys.readouterr().err


def test_cli_missing_path(tmp_path, capsys):
    assert slop_lint.main([str(tmp_path / "nope")]) == 2
    assert "nope" in capsys.readouterr().err


def test_undecodable_file_is_skipped_gracefully(tmp_path):
    (tmp_path / "a.css").write_bytes(b"\xff\xfe\x00 .m { z-index: 9999; }")
    slop_lint.lint_paths([tmp_path])  # must not raise


def test_cli_subprocess_from_other_cwd(tmp_path):
    (tmp_path / "a.html").write_text("<img src='x.png'>\U0001F680", encoding="utf-8")
    result = run_script("slop_lint.py", str(tmp_path), cwd=tmp_path)
    assert result.returncode == 1 and "UC008 [high]" in result.stdout


def test_cli_help():
    result = run_script("slop_lint.py", "--help")
    assert result.returncode == 0 and "--severity" in result.stdout


# --- false-positive guard --------------------------------------------------------------------

def test_well_written_project_is_clean():
    from conftest import FIXTURES
    findings = slop_lint.lint_paths([FIXTURES / "lint" / "clean"])
    assert findings == [], "\n".join(str(f) for f in findings)


@pytest.mark.parametrize("line", [
    ".a { transition: background-color 200ms ease-out, color 200ms ease-out; }",
    ".a { background: linear-gradient(90deg, #fff, #eee); transition: opacity 200ms; }",
    ".a { z-index: 99; }",
    '<img data-src="x" alt="Team photo">',
    ".a { height: calc(100dvh - 4rem); }",
    ".a { transition: opacity 300ms cubic-bezier(0.4, 0, 1, 1); }",
])
def test_precision_no_findings(tmp_path, line):
    found = lint(tmp_path, "a.html" if line.startswith("<") else "a.css", line, {"rm.css": RM})
    assert found == [], [str(f) for f in found]


def test_uc013_sees_parent_declarations_around_nested_rules(tmp_path):
    (tmp_path / "a.scss").write_text(
        "h1 {\n  .icon { color: red; }\n  font-family: Inter, sans-serif;\n}\n", encoding="utf-8")
    found = [(f.rule, f.line) for f in slop_lint.lint_paths([tmp_path]) if f.rule == "UC013"]
    assert found == [("UC013", 3)]


def test_nested_child_declarations_are_not_attributed_to_parent(tmp_path):
    (tmp_path / "a.scss").write_text(
        "h1 {\n  font-family: 'Fraunces', serif;\n  .meta { font-family: Inter; }\n}\n",
        encoding="utf-8")
    assert not [f for f in slop_lint.lint_paths([tmp_path]) if f.rule == "UC013"]


@pytest.mark.parametrize("css", [
    "::view-transition-old(root) {\n  animation: 160ms ease-in both fade-out;\n}\n",
    ".toast-exit { transition: opacity 150ms ease-in; }\n",
    ".menu[data-state=closed] {\n  animation: hide 120ms ease-in;\n}\n",
])
def test_uc011_allows_ease_in_on_exits(tmp_path, css):
    (tmp_path / "a.css").write_text(css, encoding="utf-8")
    assert not [f for f in slop_lint.lint_paths([tmp_path]) if f.rule == "UC011"]


def test_markup_inside_css_and_js_comments_is_ignored(tmp_path):
    (tmp_path / "a.css").write_text("/* Usage:\n   <img src=\"a.jpg\">\n*/\n.a { color: red; }\n",
                                    encoding="utf-8")
    (tmp_path / "b.js").write_text("// <img src=\"b.jpg\">\nexport const x = 1;\n",
                                   encoding="utf-8")
    assert not [f for f in slop_lint.lint_paths([tmp_path]) if f.rule == "UC008"]
