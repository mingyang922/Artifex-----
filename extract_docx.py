# -*- coding: utf-8 -*-
import zipfile
import re
import sys
import os

# 桌面路径 + 文件名
desktop = os.path.join(os.environ.get('USERPROFILE', ''), 'Desktop')
path = os.path.join(desktop, '策划书（面向游戏美术的大模型辅助资产生成平台）.docx')

if not os.path.exists(path):
    # 尝试列出桌面上的 docx 找包含 策划 的
    for f in os.listdir(desktop):
        if f.endswith('.docx') and '策划' in f:
            path = os.path.join(desktop, f)
            break

if not os.path.exists(path):
    print('FILE_NOT_FOUND', file=sys.stderr)
    sys.exit(1)

with zipfile.ZipFile(path, 'r') as z:
    xml_content = z.read('word/document.xml').decode('utf-8')

# 移除 XML 标签，保留文本
text = re.sub(r'<w:p\s', '\n', xml_content)
text = re.sub(r'<[^>]+>', ' ', text)
text = re.sub(r'&amp;', '&', text)
text = re.sub(r'&lt;', '<', text)
text = re.sub(r'&gt;', '>', text)
text = re.sub(r'&quot;', '"', text)
text = re.sub(r'\s+', ' ', text)
text = re.sub(r'\n\s*', '\n', text)
text = text.strip()

output_path = os.path.join(os.path.dirname(__file__), '策划书-提取.txt')
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(text)
