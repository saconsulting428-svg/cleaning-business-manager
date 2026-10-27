#!/bin/bash
# usage: build.sh out.html
cd "$(dirname "$0")"
python3 patch.py >/dev/null || exit 1
{
  head -n 30 base.html
  echo '<script>'
  cat camp-engine.js
  echo '</script>'
  echo '<script>'
  cat levels-data.js
  echo '</script>'
  echo '<script>'
  cat ads-bridge.js
  echo '</script>'
  cat game.camp.js
} > "$1"
node -e "
const fs=require('fs');const h=fs.readFileSync('$1','utf8');
const parts=h.split('<script>').slice(1).map(p=>p.split('</script>')[0]);
parts.slice(1).forEach((p,i)=>{try{new Function(p)}catch(e){console.log('SYNTAX ERROR in script',i+1,e.message);process.exit(1)}});
console.log('syntax ok', h.length)"
