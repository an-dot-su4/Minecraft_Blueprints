// 元の設計図 HTML（天空トラップタワー）の build() をそのまま写したもの。
// blueprints/sky-trap-tower.json の ops がこれと同じブロックになるかをテストで確かめる。
export function build(){
 const B=new Map();const k=(x,y,z)=>x+','+y+','+z;
 const set=(x,y,z,t,d)=>B.set(k(x,y,z),{x,y,z,t,d});const has=(x,y,z)=>B.has(k(x,y,z));
 for(let x=-3;x<=3;x++)for(let z=-8;z<=-2;z++){set(x,-2,z,'slabB');set(x,0,z,'slabT');}
 for(let y=-2;y<=0;y++){for(let x=-4;x<=4;x++)set(x,y,-9,'stone');for(let z=-9;z<=-1;z++){set(-4,y,z,'stone');set(4,y,z,'stone');}}
 for(let y=-2;y<=0;y++)for(const x of [-3,-2,2,3])set(x,y,-1,'stone');
 set(-2,-1,-2,'chest');set(-3,-1,-2,'chest');
 for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++){set(x,-1,z,'hopper',z==-1?'W':'N');set(x,-2,z,'stone');}
 set(-2,-1,-1,'hopper','N');
 for(let x=-1;x<=1;x++)set(x,-2,-1,'stone');
 for(let z=0;z<=1;z++){set(-2,-1,z,'stone');set(2,-1,z,'stone');}
 for(let x=-2;x<=2;x++)set(x,-1,2,'stone');set(2,-1,-1,'stone');
 for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)set(x,0,z,'carpet');
 for(let y=0;y<=20;y++)for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){
  if(Math.abs(x)<2&&Math.abs(z)<2)continue;
  if(y==0&&z==-2&&Math.abs(x)<=1)continue;
  if(!has(x,y,z))set(x,y,z,'stone');}
 for(let x=-9;x<=9;x++)for(let z=-1;z<=1;z++)if(Math.abs(x)>=2){set(x,20,z,'stone');set(x,21,z,Math.abs(x)==9?'water':'flow');}
 for(let x=-10;x<=10;x++)for(const z of[-2,2])set(x,21,z,'stone');
 for(let z=-1;z<=1;z++)for(const x of[-10,10])for(let y=20;y<=21;y++)set(x,y,z,'stone');
 const floors=[22,25,28,31];
 floors.forEach((y,i)=>{
  for(let x=-9;x<=9;x++)for(let z=-8;z<=8;z++){
   if(Math.abs(z)>=2)set(x,y,z,'pad');
   else if(i>0&&Math.abs(x)<=1)set(x,y,z,'pad');}
  const xs=(i%2==0)?[2,4,6,8]:[3,5,7,9];
  xs.forEach(a=>[a,-a].forEach(x=>[1,-1].forEach(z=>set(x,y,z,'trapdoor',z>0?'S':'N'))));
 });
 for(let x=-1;x<=1;x++)for(const z of[-1,1])for(const y of[23,24])set(x,y,z,'guard');
 for(let y=22;y<=33;y++)for(let x=-10;x<=10;x++)for(let z=-9;z<=9;z++)if((Math.abs(x)==10||Math.abs(z)==9)&&!has(x,y,z))set(x,y,z,'stone');
 for(let x=-10;x<=10;x++)for(let z=-9;z<=9;z++)set(x,34,z,'stone');
 for(const x of[-6,0,6])for(const z of[-5,5])set(x,35,z,'torch');
 B.delete(k(0,-1,-9));B.delete(k(0,0,-9));
 return [...B.values()];
}
