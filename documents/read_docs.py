import zipfile
import xml.etree.ElementTree as ET
import os

def read_docx(path):
    try:
        with zipfile.ZipFile(path) as z:
            xml_content = z.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            texts = [node.text for node in tree.findall('.//w:t', namespaces=ns) if node.text]
            return ' '.join(texts)
    except Exception as e:
        return f"Error reading {path}: {e}"

docs_dir = r"c:\Users\Lenovo\OneDrive\Desktop\TechTrends.AI\Documents"
with open(os.path.join(docs_dir, 'output.txt'), 'w', encoding='utf-8') as f_out:
    for f in sorted(os.listdir(docs_dir)):
        if f.endswith('.docx'):
            path = os.path.join(docs_dir, f)
            f_out.write(f"========== {f} ==========\n")
            content = read_docx(path)
            f_out.write(content + "\n\n")
