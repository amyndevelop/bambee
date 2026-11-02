import fitz,json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[2]
rows=json.loads((root/'content/pregnancy/weeks.es-AR.json').read_text())
boxes=[
(45,130,82,165),(138,123,182,165),(248,121,302,164),(350,90,428,168),(455,74,549,173),(567,39,686,173),(695,38,815,178),(828,69,938,173),(952,36,1101,177),
(20,224,163,352),(167,211,318,356),(326,194,459,362),(466,196,604,363),(616,196,776,362),(775,216,945,354),(943,193,1110,365),
(17,389,205,561),(205,364,349,580),(329,387,508,576),(506,394,704,576),(697,351,889,583),(882,384,1110,575),
(18,624,200,798),(199,580,420,803),(411,588,559,813),(562,584,724,819),(725,601,956,814),(947,568,1111,818),
(16,798,210,1087),(214,806,425,1085),(410,832,643,1086),(642,844,872,1084),(870,818,1106,1086),
(0,1087,187,1362),(183,1087,320,1367),(280,1182,433,1361),(430,1163,604,1356),(594,1101,837,1366),(827,1086,1118,1367)]
doc=fitz.open(root/'design/fruits/fyv.pdf')
manifest={'source':'fyv.pdf','sha256':hashlib.sha256((root/'design/fruits/fyv.pdf').read_bytes()).hexdigest(),'page':1,'coordinateSystem':'PDF points, origin top-left','assets':[]}
for row,box in zip(rows[3:],boxes,strict=True):
 slug=Path(row['fruitImage']).name.replace('-pending.png','')
 path=f'/assets/pregnancy/fruits/{slug}.png'
 doc[0].get_pixmap(clip=fitz.Rect(*box),alpha=True).save(root/'public'/path[1:])
 manifest['assets'].append({'week':row['week'],'fruit':row['fruit'],'path':path,'clip':box})
 row['fruitImage']=path
 row['fruitImageIsPlaceholder']=False
(root/'design/fruits/sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(root/'content/pregnancy/weeks.es-AR.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print('Extraídas',len(boxes),'ilustraciones originales')
