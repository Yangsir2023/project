import sys, os
import fitz

pdf_path = r"C:/Users/yangsir/Documents/xwechat_files/wxid_vjh8uyxu0k1w22_6f8d/temp/RWTemp/2026-07/c2ec26f70c4667fee26806514789af3b/全方位项目图.pdf"
out_dir = r"c:/Users/yangsir/Desktop/computer/disseration/project/bifrost/temp_preview"
os.makedirs(out_dir, exist_ok=True)

doc = fitz.open(pdf_path)
print(f"pages={doc.page_count}", flush=True)

for i, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    out = os.path.join(out_dir, f"page_{i+1}.png")
    pix.save(out)
    print(f"{out}  {pix.width}x{pix.height}", flush=True)

doc.close()
print("DONE", flush=True)
