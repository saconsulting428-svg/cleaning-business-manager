const L=[]; let id=1; const add=(part,x,z,lvl=0,rot=0,color)=>L.push({id:'o'+(id++),part,x,z,lvl,rot,color:color||SPRITES.parts[part].color});
const X0=2,X1=10,Z0=3,Z1=9;
for(let x=X0;x<X1;x++)for(let z=Z0;z<Z1;z++) add(x<6?'floor_wood':'floor_tile',x,z);
for(let x=X0;x<X1;x++){ add('wall_plaster',x,Z0,0,0); }
for(let x=X0;x<X1;x++){ if(x===5) add('door_wood',x,Z1-1,0,2); else if(x===3||x===8) add('window_small',x,Z1-1,0,2); else add('wall_plaster',x,Z1-1,0,2); }
for(let z=Z0;z<Z1;z++){ add(z===5?'window_big':'wall_brick',X0,z,0,3); add(z===6?'arch':'wall_plaster',X1-1,z,0,1); }
for(let z=Z0;z<Z1;z++){ if(z===5) add('arch',5,z,0,1); else add('wall_plaster',5,z,0,1); }
add('sofa',2,4,0,0); add('coffee_table',3,6,0,0); add('rug',3,5,0,0); add('lamp',2,7,0,0); add('tv',2,3,0,1);
add('bed',8,4,0,0); add('wardrobe',9,7,0,0); add('plant',6,8,0,0); add('dining_table',6,6,0,0);add('chair',6,7,0,0);add('fridge',9,3,0,0);
add('tree',0,2);add('bush',11,5);add('flowers',2,10);add('bench',4,10,0,0); add('fence',0,11,0,2);add('gate',1,11,0,2);
for(let x=X0;x<X1;x++)for(let z=Z0;z<Z1-3;z++) add('floor_wood',x,z,1);
for(let x=X0;x<X1;x++){ add('wall_plaster',x,Z0,1,0); add('window_small',x,Z1-4,1,2); }
for(let z=Z0;z<Z1-3;z++){ add('wall_plaster',X0,z,1,3); add('wall_plaster',X1-1,z,1,1); }
add('bed',3,4,1,0);
for(let x=X0;x<X1;x++){ add('roof_slope',x,Z0,1,0); add('roof_slope',x,Z1-4,1,2); }
RENO.World.setLayout(L); RENO.World.setMode('view'); RENO.World.setInterior(false);
