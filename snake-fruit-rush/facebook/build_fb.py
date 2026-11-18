import re, os, shutil, sys
SRC='/home/user/cleaning-business-manager/snake-fruit-rush/Fruit_Rush_Snake.html'
OUT=os.path.join(os.getcwd(),'SnakeFruitRush_FB')
s=open(SRC,encoding='utf-8').read()
shutil.rmtree(OUT,ignore_errors=True); os.makedirs(OUT+'/js'); os.makedirs(OUT+'/css')
tags=[(m.start(),m.end(),m.group(0)) for m in re.finditer(r'<(/?)(script|style)[^>]*>',s)]
# real top-level blocks: pair opening/closing by order of the real tags (the phaser file contains no literal <script> tags)
blocks=[];i=0
while i<len(tags):
    a=tags[i]
    if a[2].startswith('<script') or a[2].startswith('<style'):
        b=tags[i+1]; assert b[2] in ('</script>','</style>'),b; blocks.append((a[1],b[0],a[2])); i+=2
    else: i+=1
styles=[b for b in blocks if b[2].startswith('<style')]; scripts=[b for b in blocks if b[2].startswith('<script')]
print(len(styles),len(scripts),[b[1]-b[0] for b in scripts])
names=['phaser.min.js','engine.js','levels.js','ADS','assets.js','assets_ui.js','assets_ui2.js','game.js']
assert len(scripts)==8
open(OUT+'/css/style.css','w',encoding='utf-8').write(s[styles[0][0]:styles[0][1]])
tagsout=[]
for (a,b,_),n in zip(scripts,names):
    if n=='ADS': continue
    open(OUT+'/js/'+n,'w',encoding='utf-8').write(s[a:b]); tagsout.append(n)
head=s[:s.index('<style>')]
head=head.replace('<title>Snake - Fruit Rush</title>','<title>Snake - Fruit Rush</title>\n<script src="https://connect.facebook.net/en_US/fbinstant.7.1.js"></script>\n<link rel="stylesheet" href="css/style.css">')
body='</head>\n<body>\n<div id="game"></div>\n'
order=['phaser.min.js','engine.js','levels.js','fb-config.js','fb-bridge.js','assets.js','assets_ui.js','assets_ui2.js','game.js']
body+=''.join('<script src="js/%s"></script>\n'%n for n in order)+'</body>\n</html>\n'
open(OUT+'/index.html','w',encoding='utf-8').write(head+body)
for f in ('fb-config.js','fb-bridge.js'): shutil.copy(os.path.join(os.path.dirname(os.path.abspath(__file__)),f),OUT+'/js/'+f)
shutil.copy(os.path.join(os.path.dirname(os.path.abspath(__file__)),'fbapp-config.json'),OUT+'/fbapp-config.json')
shutil.copy(os.path.join(os.path.dirname(os.path.abspath(__file__)),'README.md'),OUT+'/README.md')
print('ok')
