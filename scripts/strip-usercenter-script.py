# -*- coding: utf-8 -*-
p = r"c:\Users\yang\Desktop\GameManagement-platform\modules\user-center\userCenter.html"
with open(p, "r", encoding="utf-8") as f:
    lines = f.readlines()
i_open, i_close = 2151, 4452
assert lines[i_open].strip().startswith("<script"), lines[i_open]
assert lines[i_close].strip() == "</script>", lines[i_close]
insert = '    <script src="user-center-page.js" defer></script>\n'
with open(p, "w", encoding="utf-8") as f:
    f.writelines(lines[:i_open] + [insert] + lines[i_close + 1 :])
print("OK userCenter.html", len(lines), "->", len(lines) - (i_close - i_open))
