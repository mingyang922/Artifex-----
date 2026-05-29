# -*- coding: utf-8 -*-
"""Remove giant inline <script> block from AI HTML pages and add defer src."""
import sys


def run(path: str, js_name: str) -> None:
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    # 0-based: 3329 = last line before inline block (user-storage); 3330 = "<script>"; 6606 = "</script>"
    i_open = 3330
    i_close = 6606
    if not lines[i_open].strip().startswith("<script"):
        raise SystemExit(f"expected <script> at line {i_open + 1}, got {lines[i_open]!r}")
    if lines[i_close].strip() != "</script>":
        raise SystemExit(f"expected </script> at line {i_close + 1}, got {lines[i_close]!r}")
    insert = f'    <script src="{js_name}" defer></script>\n'
    new_lines = lines[:i_open] + [insert] + lines[i_close + 1 :]
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    print("OK", path, "lines", len(lines), "->", len(new_lines))


if __name__ == "__main__":
    run(
        r"c:\Users\yang\Desktop\GameManagement-platform\modules\ai-generate\ai-generator-new.html",
        "ai-generator-page.js",
    )
    run(
        r"c:\Users\yang\Desktop\GameManagement-platform\modules\ai-generate\visual-workbench.html",
        "visual-workbench-page.js",
    )
