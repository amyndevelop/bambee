import fitz,json
from pathlib import Path
root=Path(__file__).resolve().parents[2]; manifest=json.loads((root/'design/fruits/sources.json').read_text()); doc=fitz.open(root/'design/fruits/fyv.pdf')
polygons={
21:[(205,364),(349,364),(349,440),(325,440),(325,580),(205,580)],
22:[(349,387),(508,387),(508,576),(329,576),(329,460),(349,440)],
25:[(882,384),(1110,384),(1110,567),(882,567)],
28:[(420,588),(559,588),(559,813),(420,813)],
34:[(425,832),(643,832),(643,1086),(410,1086),(410,970),(425,970)],
38:[(205,1087),(320,1087),(320,1177),(281,1177),(281,1367),(199,1367),(199,1220),(205,1220)],
39:[(300,1182),(433,1182),(433,1361),(280,1361),(280,1220),(300,1220)],
40:[(430,1163),(596,1163),(596,1356),(430,1356)],
41:[(600,1101),(827,1101),(827,1366),(600,1366)]}
for item in manifest['assets']:
 polygon=polygons.get(item['week'])
 if not polygon: continue
 extracted=fitz.open(); page=extracted.new_page(width=doc[0].rect.width,height=doc[0].rect.height); page.show_pdf_page(page.rect,doc,0)
 content=b'\n'.join(extracted.xref_stream(x) for x in page.get_contents())
 path=' '.join(f'{x} {page.rect.height-y} '+('m' if i==0 else 'l') for i,(x,y) in enumerate(polygon))+' h W n'
 xref=extracted.get_new_xref(); extracted.update_object(xref,'<<>>');extracted.update_stream(xref,('q '+path+'\n').encode()+content+b'\nQ');page.set_contents(xref)
 page.get_pixmap(clip=fitz.Rect(*item['clip']),alpha=True).save(root/'public'/item['path'][1:]);item['clipPolygon']=polygon
(root/'design/fruits/sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
