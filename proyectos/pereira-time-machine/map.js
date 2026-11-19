"use strict";

const Diorama = (() => {
  const startAngle = -.28;
  const startTilt = .60;
  const limit = (n, min, max) => Math.max(min, Math.min(n, max));
  const point = (x,y,z) => [x,y,z];

  function builder(target) {
    const poly = (color, ...vertices) => target.push({ color, vertices });
    function box(x, y, z, w, h, d, c, xSide = c, zSide = xSide, turn = 0) {
      const a = Math.cos(turn), b = Math.sin(turn);
      const v = (u, q, r) => [x + u*a - r*b, y+q, z + u*b + r*a];
      const p = v(-w/2,0,-d/2), q = v(w/2,0,-d/2), r = v(w/2,0,d/2), s = v(-w/2,0,d/2);
      const A = v(-w/2,h,-d/2), B = v(w/2,h,-d/2), C = v(w/2,h,d/2), D = v(-w/2,h,d/2);
      poly(c,A,B,C,D);
      if (h > 0) {
        poly(xSide,p,A,D,s);
        poly(xSide,q,r,C,B);
        poly(zSide,p,q,B,A);
        poly(zSide,s,D,C,r);
      }
    }
    function roof(x,y,z,w,h,d,c,side) {
      const A = point(x-w/2,y,z-d/2), B = point(x+w/2,y,z-d/2), C = point(x+w/2,y,z+d/2), D = point(x-w/2,y,z+d/2);
      const E = point(x-w/2,y+h,z), F = point(x+w/2,y+h,z);
      poly(side,A,E,D);
      poly(side,B,C,F);
      poly(c,A,B,F,E);
      poly(side,D,E,F,C);
    }
    function beam(a,b,r,color) {
      const dx=b[0]-a[0], dy=b[1]-a[1], dz=b[2]-a[2];
      const length=Math.hypot(dx,dz) || 1;
      const p = [dz/length*r,0,-dx/length*r];
      const v = (u,k) => [u[0]+k*p[0],u[1]+k*(dy ? 0 : r),u[2]+k*p[2]];
      if (!dx && !dz) { box(a[0],Math.min(a[1],b[1]),a[2],r*2,Math.abs(dy),r*2,color,color); return; }
      poly(color,v(a,-1),v(b,-1),v(b,1),v(a,1));
    }
    function disk(x,y,z,r,color) {
      poly(color,...Array.from({length:14},(_,i)=>point(x+Math.cos(i*Math.PI/7)*r,y,z+Math.sin(i*Math.PI/7)*r)));
    }
    function cylinder(axis,x,y,z,length,radius,colors){
      const sides=16;
      const rings=[0,1].map(end=>Array.from({length:sides},(_,i)=>{
        const angle=i*Math.PI*2/sides;
        const a=Math.cos(angle)*radius,f=Math.sin(angle)*radius;
        return axis==="x"?[x+end*length,y+a,z+f]:[x+a,y+end*length,z+f];
      }));
      for(let i=0;i<sides;i++){
        const next=(i+1)%sides;
        const light=(i+2)%sides;
        const color=colors[light<5?0:light<11?1:2];
        poly(color,rings[0][i],rings[1][i],rings[1][next],rings[0][next]);
      }
      poly(colors[2],...rings[0]);
      poly(colors[0],...rings[1]);
    }
    return {poly,box,roof,beam,disk,cylinder};
  }

  function architecture(era,objects,ground,detail=false) {
    const b=builder(objects), p=era.palette;
    const flat=(x,z,w,d,color,y=.03)=>ground.box(x,y,z,w,0,d,color);
    function tree(x,z,scale=1) {
      const h=4.5*scale;
      b.box(x,0,z,.42*scale,h*.58,.42*scale,"#68523c","#5b4936");
      b.roof(x,h*.40,z,3.7*scale,h*.51,3.5*scale,p.tree,p.leaf);
      b.roof(x-.33*scale,h*.69,z,3.0*scale,h*.48,2.75*scale,p.leaf,p.tree);
    }
    function house(x,z,w,d,h,roofColor="#a96449",wall="#e8cfa4") {
      b.box(x,0,z,w,h,d,"#eee1be","#bb9e7d",wall);
      b.roof(x,h,z,w+.7,Math.min(2.5,w*.22),d+.65,roofColor,"#925339");
      b.box(x,0,z+d/2+.03,1.2,1.8,.14,"#5c675d");
      b.box(x-w*.29,h*.45,z+d/2+.03,1,.8,.12,"#6d7e72");
      b.box(x+w*.29,h*.45,z+d/2+.03,1,.8,.12,"#6d7e72");
      if(detail){
        b.box(x,.02,z,w+.12,.19,d+.17,"#bcac90","#85796a");
        b.box(x,.02,z+d/2+.37,2.15,.14,.69,"#cfbc9e","#9d886d");
        for(const side of [-1,1]){
          const window=x+side*w*.29;
          const front=z+d/2+.105;
          b.box(window,h*.45-.07,front,1.21,.086,.23,"#ceb695","#9e866a");
          b.box(window,h*.45,front,.064,.80,.06,"#c3ab89");
          b.box(window,h*.45+.36,front,1,.063,.06,"#c3ab89");
          b.box(window,h*.45,z-d/2-.029,1,.80,.14,"#556860");
        }
        b.box(x,h-.20,z+d/2, w+.34,.13,.22,"#b5926d","#9c7759");
      }
    }
    function block(x,z,w,d,h,front,roofColor="#f2e9d0") {
      b.box(x,0,z,w,h,d,roofColor,"#a4987e",front);
      b.box(x,h,z,w+.35,.35,d+.35,roofColor,"#9a876d",front);
      const columns = Math.max(2,Math.floor(w/2.6));
      for(let i=0;i<columns;i++){
        for(let j=0;j<Math.min(6,Math.floor(h/2.5));j++){
          const windowX=x-w/2+(i+.5)*w/columns, windowY=1+j*2.5;
          b.box(windowX,windowY,z+d/2-.04,.91,.86,.15,"#617e7d","#617e7d","#53686a");
          if(detail){
            b.box(windowX,windowY-.09,z+d/2+.065,1.07,.09,.13,"#dac7a5","#af9b7a");
            b.box(windowX,windowY,z+d/2+.078,.07,.86,.05,"#c6b699");
            b.box(windowX,windowY,z-d/2-.04,.91,.86,.13,"#617e7d","#617e7d","#53686a");
          }
        }
      }
    }
    function stalls(x,z) {
      for(let i=0;i<3;i++){
        const t=x+i*3.0;
        for(const side of [-1,1]) b.box(t+side*1.06,0,z,.18,2.55,.18,"#715840");
        b.box(t,.74,z,2.25,.22,1.24,"#ae7550","#89523f");
        b.roof(t,2.32,z,2.65,.46,1.8,i%2?"#d09c50":"#b66c54",i%2?"#b3844c":"#9e5140");
        for(let j=0;j<3;j++) b.box(t-.65+j*.6,.97,z,.45,.24,.49,["#8d9a4f","#bc6447","#d9a44d"][j]);
      }
    }
    function church(x,z,capilla) {
      house(x,z,capilla?9:13,10,capilla?4.8:8.5,"#aa644e","#e6bd8b");
      const d=capilla?0:4.9;
      for(const shift of capilla?[0]:[-d,d]){
        b.box(x+shift,0,z+4,capilla?2.2:3.3,capilla?7:13,3.5,"#ead5ad","#a67952","#bf9064");
        b.roof(x+shift,capilla?7:13,z+4,capilla?2.5:3.7,capilla?1.5:3.0,3.75,"#b7825a","#85644c");
        b.box(x+shift,capilla?5.9:10.7,z+5.75,.72,1.55,.13,"#665949");
        b.box(x+shift,capilla?8.2:15.5,z+4,.16,1.2,.16,"#5f4d37");
        b.box(x+shift,capilla?8.86:16.16,z+4,.68,.16,.16,"#5f4d37");
      }
    }
    function station(x,z,early) {
      if(early){
        house(x,z,14,7,4.2,"#ae6450","#e5cca1");
        b.box(x,.08,z+4.4,16,.55,2.9,"#ddc5a2","#a88b67");
        for(let i=-2;i<=2;i++) b.box(x+i*2.85,.63,z+5.7,.25,3.03,.27,"#aa7957","#855d43");
        b.roof(x,3.44,z+4.68,15,.72,3.74,"#b67455","#a05d48");
        for(let i=-1;i<=1;i++) b.box(x+i*2.8,.1,z+3.55,.99,2.3,.15,"#6a7b75","#53645f");
      } else {
        block(x,z,17,7,6,"#e7c892");
        block(x,z+1,4.6,6,11,"#edce97");
        b.box(x,8.6,z+4.04,1.36,1.36,.15,"#fcf0cc","#faf1ca","#fff7da");
        b.box(x,8.8,z+4.13,.1,.53,.06,"#37453f");
        b.box(x+.22,8.8,z+4.13,.43,.1,.06,"#37453f");
      }
    }
    function plaza(x,z,statue) {
      flat(x,z,17,10,"#d2c6a6",.073);
      flat(x-4,z,5,7,"#a2a97a",.078);
      flat(x+4,z,5,7,"#a2a97a",.078);
      for(const a of [-1,1]) for(const c of [-1,1]) tree(x+a*5.3,z+c*3.45,.82);
      if(detail){
        flat(x,z,2.2,10,"#ded2b8",.082);
        flat(x,z,17,1.44,"#ded2b8",.082);
        flat(x,z,5.8,4.5,"#d5c6a8",.083);
        for(const side of [-1,1]){
          b.box(x+side*5.2,.15,z+.92,1.65,.15,.43,"#a9835b","#83634e");
          for(const leg of [-1,1])b.box(x+side*5.2+leg*.56,.08,z+.92,.16,.10,.30,"#695d4d");
        }
      }
      if(statue){
        objects.push(...BolivarMonument.placeAt(x,z));
      }else{
        b.box(x,0,z,2.8,.42,2.45,"#d8d0b6","#b0a58c");
        b.box(x,.42,z,2.45,.08,1.89,"#87a6a2","#7c9187");
      }
    }
    function bridge(x,z) {
      for(const dir of [-1,1]){
        const inner=x+dir*13,outer=x+dir*17;
        b.poly("#b6b4a2",[outer,.09,z-2.85],[inner,5.11,z-2.85],[inner,5.11,z+2.85],[outer,.09,z+2.85]);
        b.poly("#998574",[outer,.09,z+2.85],[inner,5.11,z+2.85],[inner,0,z+2.85]);
      }
      b.box(x,4.6,z,26,.51,5.7,"#b6b4a2","#a68972");
      if(detail){
        b.box(x,5.116,z,25.9,0,4.65,"#6e756f");
        for(let i=-11;i<=11;i+=2) b.box(x+i,5.125,z,1.14,0,.12,"#eee0ab");
        for(const side of [-1,1]) {
          b.box(x,5.125,z+side*2.21,25.9,0,.09,"#e8dbc1");
          for(let i=-12;i<=12;i+=2) b.box(x+i,5.18,z+side*2.62,.09,.40,.11,"#c6b6a0");
          b.box(x,5.55,z+side*2.62,26,.08,.10,"#d4c5af");
        }
      }
      for(const s of [-1,1]){
        b.box(x+s*11.8,0,z,1.65,5.2,4.8,"#aba997","#888879");
        b.box(x,5.15,z+s*2.75,26,.23,.14,"#e1c7a4","#a7987f");
        b.box(x+s*5.2,4.9,z+s*2.1,.78,12,.78,"#eee4cd","#aeb2a4");
        for(let i=1;i<5;i++) b.beam([x+s*5.2,16.4-i*.61,z+s*2.1],[x+s*5.2+s*i*1.51,5.25,z+s*2.1],.09,"#e9d8b8");
        for(let i=1;i<4;i++) b.beam([x+s*5.2,16.4-i*.61,z+s*2.1],[x+s*5.2-s*i*1.59,5.25,z+s*2.1],.09,"#e9d8b8");
      }
    }
    function stadium(x,z){
      const segments=detail?48:32, turn=Math.PI*2;
      const perimeter=(rx,rz,height)=>Array.from({length:segments},(_,i)=>{
        const a=i*turn/segments, u=Math.cos(a), v=Math.sin(a);
        return [x+rx*Math.sign(u)*Math.abs(u)**.74,height,z+rz*Math.sign(v)*Math.abs(v)**.74];
      });
      function ring(draw,from,to,color){
        for(let i=0;i<segments;i++){
          const j=(i+1)%segments;
          draw.poly(typeof color==="string"?color:color(i),from[i],from[j],to[j],to[i]);
        }
      }

      ground.poly("#a9a78b",...perimeter(15.2,10.0,.081));
      ground.poly("#70675c",...perimeter(10.84,6.67,.092));
      ground.poly("#78875c",...perimeter(9.35,5.47,.097));
      const lanes=detail?4:2;
      for(let i=1;i<=lanes;i++){
        const n=i/(lanes+1), u=9.35+n*1.49, v=5.47+n*1.2;
        ring(ground,perimeter(u,v,.101),perimeter(u+.040,v+.035,.101),"#b8a995");
      }
      for(let i=-4;i<=4;i++){
        flat(x+i*1.64,z,1.64,8.21,i%2===0?"#7e9d64":"#87a76a",.105);
      }

      const line="#eaedcc", level=.115;
      const pitchX=7.34,pitchZ=4.10;
      for(const side of [-1,1]){
        flat(x,z+side*pitchZ,pitchX*2,.065,line,level);
        flat(x+side*pitchX,z,.065,pitchZ*2,line,level);
        flat(x+side*(pitchX-1.73),z,.065,4.45,line,level);
        for(const flank of [-1,1]){
          flat(x+side*(pitchX-.87),z+flank*2.22,1.73,.065,line,level);
          b.box(x+side*(pitchX+.03),.113,z+flank*.67,.063,.67,.063,"#ede9da");
        }
        b.box(x+side*(pitchX+.03),.76,z,.063,.06,1.39,"#ede9da");
        if(detail){
          const back=x+side*(pitchX+.53);
          for(const corner of [-1,1]){
            b.beam([x+side*(pitchX+.03),.78,z+corner*.67],[back,.15,z+corner*.67],.024,"#cccac0");
          }
          b.beam([back,.15,z-.67],[back,.15,z+.67],.025,"#cccac0");
        }
      }
      flat(x,z,.065,pitchZ*2,line,level);
      ring(ground,perimeter(1.06,1.06,level),perimeter(1.12,1.12,level),line);

      let prior=perimeter(11.08,6.93,.46);
      ring(b,perimeter(11.08,6.93,.087),prior,"#9c9889");
      const rows=detail?9:6;
      for(let row=1;row<=rows;row++){
        const t=row/rows, width=11.08+t*3.65, depth=6.93+t*2.64;
        const height=.46+t*3.65;
        const edge=perimeter(width,depth,prior[0][1]);
        const top=perimeter(width,depth,height);
        ring(b,prior,edge,i=>i%(segments/8)===0?"#b1a48d":row%2?"#d5cab4":"#c8bea9");
        ring(b,edge,top,"#a49d8b");
        prior=top;
      }
      const facadeBottom=perimeter(14.73,9.57,.16);
      const seam=perimeter(14.73,9.57,1.22);
      ring(b,facadeBottom,seam,i=>i%5===0?"#978772":"#a66e5a");
      ring(b,seam,prior,i=>i%4===0?"#b7ac96":"#bfb6a3");

      // The pre-2011 concrete canopy covers the western stand only.
      for(let bay=0;bay<6;bay++){
        const start=x-9.9+bay*3.30;
        const roofPoint=(i,edge)=>{
          const progress=i/6;
          const span=edge?5.72:8.99;
          return [start+progress*3.30,5.73+Math.sin(progress*Math.PI)*.78+(edge?-.22:0),z-span];
        };
        for(let i=0;i<6;i++){
          b.poly(i<2?"#dfd8c6":i<4?"#e8dfcb":"#c6beae",
            roofPoint(i,false),roofPoint(i+1,false),roofPoint(i+1,true),roofPoint(i,true));
          b.poly("#998e7b",roofPoint(i,true),roofPoint(i+1,true),
            [roofPoint(i+1,true)[0],roofPoint(i+1,true)[1]-.14,z-5.72],
            [roofPoint(i,true)[0],roofPoint(i,true)[1]-.14,z-5.72]);
        }
        b.box(start+.10,.15,z-8.69,.25,5.58,.23,"#bdb4a1","#8e887a");
      }
      b.box(x+9.8,.15,z-8.69,.25,5.58,.23,"#bdb4a1","#8e887a");
      for(const side of [-1,1])for(const end of [-1,1]){
        const lightX=x+end*12.13,lightZ=z+side*6.7;
        b.box(lightX,.10,lightZ,.17,7.32,.17,"#a1937c","#746e60");
        b.box(lightX,7.15,lightZ,1.15,.48,.25,"#d5cdb7","#8e8777");
        if(detail)for(let i=-1;i<=1;i++)b.box(lightX+i*.31,7.23,lightZ+.129,.22,.23,.034,"#f7e6bd");
      }
    }

    function terminal(x,z,modern) {
      block(x,z,15,8,modern?6.4:4.7,modern?"#ebdec1":"#cfd7c7",modern?"#749489":"#728e80");
      b.box(x,2.3,z+4.1,14,.24,2.8,"#eee4c9","#a1a99a");
      for(let i=-2;i<=2;i++) b.box(x+i*2.8,0,z+5,.22,2.32,.22,"#7f8a7f");
    }
    function landmark(type,x,z){
      switch(type){
        case "capilla": church(x,z,true); break;
        case "ranchos": house(x-3,z,8,7,4.2);house(x+5,z-2,5,5,3.1); break;
        case "station":station(x,z,true);break;
        case "station-clock":station(x,z,false);break;
        case "coffee":
          house(x,z,13,7,5.4,"#a9a181","#daba8d");
          b.box(x+4,0,z-2,1.4,9.8,1.4,"#987a66","#786554");
          for(let i=0;i<4;i++) b.box(x-4+i*2,0,z+5,1.05,.96,.93,"#c9a573","#ac8a63");
          break;
        case "church": church(x,z,false);break;
        case "plaza-old":plaza(x,z,false);break;
        case "plaza":plaza(x,z,true);church(x-7,z-10,false);break;
        case "warehouse":
          house(x,z,15,8,5.2,"#b37851","#dbb78e");
          b.box(x,.03,z+5.25,15,.43,2.55,"#c4a783","#947557");
          for(let i=0;i<5;i++){
            const at=x-5.5+i*2.15;
            b.box(at,.46,z+5.6,1.1,.8,.82,"#b89364","#926c4e");
            if(i%2===0)b.box(at,1.26,z+5.6,.92,.62,.73,"#c8a475","#a28059");
          }
          break;
        case "market":stalls(x-3,z);house(x,z-4.4,13,4.5,3.7,"#a96d54","#e5c696");break;
        case "bridge":bridge(x,z);break;
        case "stadium":stadium(x,z);break;
        case "river-park":
          plaza(x,z,false);
          if(detail){
            flat(x,z,21,14,"#a6a77e",.016);
            flat(x+8.8,z,4.1,14,"#7d9d98",.022);
            for(let i=-5;i<=5;i+=2)flat(x+8.8,z+i,2.8,.085,"#b2c3b0",.027);
          }
          break;
        case "terminal":terminal(x,z,false);break;
        case "cable":terminal(x,z,true);break;
      }
    }

    return {landmark,tree,house,block};
  }

  function buildWorld(era) {
    const surfaces=[], objects=[];
    const ground=builder(surfaces), b=builder(objects), p=era.palette;
    let seed=1481;
    const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    const flat=(x,z,w,d,c,y=.03)=>ground.box(x,y,z,w,0,d,c);
    const {landmark,tree,house,block}=architecture(era,objects,ground);
    flat(0,0,108,65,p.base,0);
    b.box(0,-3.6,0,108,3.59,65,p.base,p.edge,"#8a7a5a");
    for(let i=0;i<60;i++){
      const x=(rand()-.5)*106,z=(rand()-.5)*63;
      if(Math.abs(z)>22 || Math.abs(x)>45) flat(x,z,2+rand()*7,1+rand()*3,i%2?p.field:p.base,.015);
    }
    if (era.vehicle==="taxi" || era.vehicle==="mule") {
      const riverX=era.vehicle==="taxi"?24:20;
      for(let i=0;i<20;i++){
        const center=riverX+Math.sin(i*.41)*2.4;
        flat(center,-31+i*3.26,era.vehicle==="taxi"?8:2.4,3.35,"#789d97",.045);
      }
    }
    if(era.index===0){
      flat(-31,-8,32,1.8,"#c8ae85",.052);
      flat(-21,-6,1.7,27,"#c8ae85",.053);
      flat(-38,-6,1.7,27,"#c8ae85",.053);
    }
    if(era.index>=2){
      for(const z of [-20.5,18.2]){
        flat(-1,z,93,3.65,"#9d9c87",.049);
        for(let x=-43;x<49;x+=5.4)flat(x,z,1.7,.13,"#e6d8b4",.052);
      }
      for(const x of [-41,-13,11,42])flat(x,0,3.6,43,"#9d9c87",.057);
    }
    const rail=era.vehicle==="train" || era.vehicle==="tram";
    const airborne=era.vehicle==="cable";
    const road = rail ? "#b8a58b" : era.vehicle==="mule" ? "#c8ae85" : "#7d817b";
    const stripes = era.vehicle==="mule" ? "#bca27a" : "#dad2b6";
    flat(-1,2.5,98,8.4,road,.081);
    if(!airborne){
      flat(-1,-2.04,98,.64,"#d9ccb1",.08);
      flat(-1,7.04,98,.64,"#d9ccb1",.08);
    }
    for(let x=-48;x<49;x+=3.9){
      if(rail){
        flat(x,2.5,.38,3.7,"#8c745c",.087);
      } else if(!airborne){
        flat(x,2.5,1.8,.17,stripes,.087);
      }
    }
    if(rail) for(const offset of [-1.16,1.16]) flat(-1,2.5+offset,98,.15,"#67665d",.098);
    if(era.vehicle==="megabus") for(const offset of [-2.6,2.6]) flat(-1,2.5+offset,98,.16,"#d0cf93",.099);

    era.stops.forEach(stop=>{
      const x=stop.x;
      if(stop.landmark==="bridge"){
        landmark(stop.landmark,x,2.5);
      }else if(stop.landmark==="stadium"){
        flat(x,-14,32,21.4,p.court,.065);
        flat(x,-2.9,7.4,2.9,p.court,.074);
        landmark(stop.landmark,x,-14);
      } else {
        flat(x,-10.2,19.8,14.6,p.court,.07);
        flat(x,-3.05,3.8,3.4,p.court,.075);
        landmark(stop.landmark,x,-10);
      }
      if(stop.landmark!=="bridge") flat(x,7.9,10,1.15,p.court,.074);
    });
    for(let i=0;i<54;i++){
      const x=(rand()-.5)*101,z=(rand()-.5)*60;
      if(Math.abs(z-2)<6.5 || era.stops.some(s=>s.landmark==="stadium"
        ? Math.abs(s.x-x)<17 && Math.abs(z+14)<11.7
        : Math.abs(s.x-x)<11 && Math.abs(z+10)<10))continue;
      if((z>10 && z<24 || z<-19) && i%3===0 && Math.abs(x)<45 && (era.vehicle!=="mule" || i%2===0)){
        const modern=["taxi","megabus","cable"].includes(era.vehicle);
        if(modern && rand()>.34)block(x,z,4+rand()*3,4+rand()*3,4+rand()*10,["#c0c1a7","#decba9","#c0ccc0"][i%3]);
        else house(x,z,4+rand()*3,4+rand()*3,2+rand()*3,["#a3684f","#bc7753","#ad835d"][i%3]);
      } else tree(x,z,.55+rand()*.65);
    }
    for (let i=0;i<9;i++){
      const x=-48+i*12;
      if(i%2===0)tree(x,-26,1);
      tree(x+2,25,.75);
    }
    if(airborne){
      for(const x of [-44,0,43]){
        b.box(x,0,2.5,.72,13.5,.72,"#aab3a7","#7d9288");
        b.box(x,13.2,2.5,1.1,.34,4,"#7d9288","#5e7569");
      }
      b.beam([-49,13.5,2.5],[49,13.5,2.5],.08,"#273f39");
    }
    for (const stop of era.stops) {
      for(let i=0;i<3;i++){
        const x=stop.x-4.3+i*4.2;
        if(road!== "#c8ae85"){
          b.box(x,0,-2.85,.16,3.2,.16,"#677967");
          b.box(x,3.06,-2.85,.43,.23,.43,"#f4d99e","#bfa679");
        }
      }
    }
    return {surfaces,objects};
  }

  function wheel(b,x,y,z,r,tone,side=1){
    b.poly(tone,...Array.from({length:14},(_,i)=>[x+Math.cos(i*Math.PI/7)*r,y+Math.sin(i*Math.PI/7)*r,z]));
    b.poly("#b0a58b",...Array.from({length:10},(_,i)=>[x+Math.cos(i*Math.PI/5)*r*.43,y+Math.sin(i*Math.PI/5)*r*.43,z+side*.017]));
  }

  function drawVehicle(b,type,x,y,z,t,detail=false){
    const dark="#35413d", glass="#b1c6bb";
    if(type==="mule"){
      const walk=Math.sin(t*8)*.35;
      b.box(x,y+1.02,z,2.5,1.05,1.1,"#bd8a62","#825c45","#9e7050");
      b.box(x+1.13,y+1.47,z,.63,1.19,.60,"#a87d59","#79553f");
      b.box(x+1.52,y+2.39,z,.83,.51,.54,"#ab7d58","#745443");
      b.box(x+1.4,y+2.76,z,.16,.53,.14,"#79573d");
      b.box(x+1.4,y+2.76,z-.27,.16,.53,.14,"#79573d");
      for(const a of [-1,1]) for(const c of [-1,1]) b.box(x+a*(.87+walk*c),y,z+c*.37,.23,1.21,.23,"#715542");
      for(const s of [-1,1]){
        b.box(x-.25,y+1.18,z+s*.59,1.18,.75,.48,"#e1c48c","#b19566");
        if(detail){
          b.box(x-.25,y+1.38,z+s*.835,.92,.11,.028,"#9d7856");
          b.box(x-.16,y+1.18,z+s*.835,.11,.75,.032,"#9d7856");
          b.box(x+1.67,y+2.63,z+s*.275,.10,.076,.026,"#534436");
          b.box(x+1.68,y+2.42,z+s*.276,.13,.06,.027,"#dcc19b");
        }
      }
      if(detail)b.beam([x-1.10,y+1.83,z],[x-1.68,y+.95,z-.14],.11,"#604737");
      return;
    }
    if(type==="cable"){
      b.box(x,y,z,4.0,2.8,2.6,"#f2dfab","#345a50","#476d62");
      b.box(x,y+.85,z+1.29,3.3,1.34,.1,glass,"#779a93");
      b.box(x,y+2.8,z,.88,.32,.88,"#283f39");
      b.box(x,y+3.1,z,.17,1.15,.17,"#394a41");
      if(detail){
        b.box(x,y+4.19,z,1.02,.16,.39,"#465950","#293f37");
        b.box(x,y+.85,z-1.29,3.30,1.34,.10,glass,"#779a93");
        for(const side of [-1,1]){
          b.box(x,y+.14,z+side*1.30,3.74,.12,.06,"#cfba79","#a59663");
          b.box(x,y+.46,z+side*1.37,.085,1.72,.052,"#35564f");
          b.box(x+side*1.99,y+.85,z,.08,1.34,1.96,glass,"#789f91");
          b.box(x+side*2.042,y+.85,z,.045,1.36,.085,"#5c8076");
        }
      }
      return;
    }
    if(type==="train"){
      const green="#4c6260", red="#ad5d43";
      b.box(x,y+.6,z,6.8,.72,2.62,red,"#734f3f");
      if(detail){
        const boiler=["#62736e","#415653","#334742"];
        const band=["#78908a","#576d64","#465950"];
        b.cylinder("x",x-1.46,y+2.12,z,4.32,.83,boiler);
        for(const at of [-.9,.07,1.04,2.03])b.cylinder("x",x+at,y+2.12,z,.069,.85,band);
        b.cylinder("x",x+2.88,y+2.12,z,.14,.75,["#5d6c64","#45534c","#36433d"]);
        b.cylinder("y",x+.65,y+2.87,z,.43,.28,band);
        b.cylinder("y",x+.65,y+3.27,z,.078,.33,band);
        b.cylinder("y",x+2.57,y+2.71,z,1.10,.31,boiler);
        b.cylinder("y",x+2.57,y+3.75,z,.15,.41,band);
      }else{
        b.roof(x+.74,y+2.56,z,4.8,.55,1.83,"#56716c","#415853");
        b.box(x+.67,y+1.19,z,4.7,1.46,1.77,green,"#2f4443");
        b.box(x+2.64,y+2.58,z,.65,1.24,.67,dark);
        b.box(x+2.64,y+3.73,z,.98,.26,.91,dark);
      }
      b.box(x-2.12,y+1.15,z,2.04,2.54,2.43,green,"#304744");
      b.box(x-2.10,y+2.36,z+1.22,1.33,.8,.09,glass,"#94aaa0");
      b.box(x-2.12,y+3.68,z,2.35,.24,2.66,dark);
      b.box(x-5.25,y+.65,z,3.2,1.62,2.34,"#627573","#3d5752");
      for(const s of [1,-1]) for(const d of [-6.1,-4.45,-2.34,-.55,1.42,2.65]) wheel(b,x+d,y+.69,z+s*1.24,d===-.55||d===1.42?.76:.55,dark,s);
      if(detail){
        for(const side of [-1,1]){
          b.box(x-2.10,y+2.36,z+side*1.23,1.33,.8,.065,glass,"#94aaa0");
          b.box(x+.52,y+.70,z+side*1.35,3.40,.10,.11,"#c6b596","#8c8674");
          b.box(x-5.25,y+2.10,z+side*1.04,3.06,.28,.20,"#51675d","#41584d");
        }
        for(let i=0;i<12;i++){
          const across=(i%4)*.65, row=Math.floor(i/4)*.51;
          const tone=["#4b5045","#5b5c4c","#42483f"][i%3];
          b.roof(x-6.25+across,y+2.24,z-.55+row,.54,.14+(i%3)*.04,.51,tone,"#454b41");
        }
        b.cylinder("x",x+2.95,y+2.70,z,.27,.19,["#e9cf90","#baa067","#a18254"]);
        b.box(x+3.36,y+.47,z,.22,.20,2.89,"#8c5140","#6d443a");
      }
      return;
    }
    const models={
      tram:[6.8,3.05,"#c78e49","#994839",4],
      bus:[6.9,2.85,"#e3bb69","#a85642",4],
      taxi:[4.5,1.38,"#e8bd5a","#c69a38",2],
      megabus:[9.8,2.65,"#b9c786","#557950",6]
    };
    const [w,h,top,body,cols]=models[type];
    b.box(x,y+.46,z,w,h,2.3,top,body,body);
    if(type==="taxi") b.box(x-.25,y+1.6,z,2.75,.7,2.1,top,body);
    const windowHeight=type==="taxi"?.43:.85;
    for(let i=0;i<cols;i++){
      const offset=(i-(cols-1)/2)*w*.82/cols;
      for(const s of [1,-1]) b.box(x+offset,y+(type==="taxi"?1.76:1.61),z+s*(type==="taxi"?1.06:1.16),w*.70/cols,windowHeight,.09,glass,"#749189");
    }
    if(type==="megabus") b.box(x-.64,y+.48,z,.72,h,2.36,"#6f7770","#5b6660");
    if(type==="tram") b.box(x,y+h+.45,z,.18,.83,.19,dark);
    for(const s of [1,-1]) for(const d of [-w*.32,w*.31]) wheel(b,x+d,y+.49,z+s*1.16,.54,dark,s);
    if(detail){
      const taxi=type==="taxi", edge=x+w/2, rear=x-w/2;
      b.box(x,y+.48,z,w+.15,.18,2.42,"#51625b","#394841");
      for(const side of [-1,1]){
        b.box(edge+.028,y+(taxi?.90:.95),z+side*.80,.12,.19,.33,"#f1d99a","#c9ae78");
        b.box(rear-.045,y+.89,z+side*.81,.10,.24,.25,"#a94d42","#923e37");
        b.box(x,y+1.21,z+side*1.155,w-.28,.10,.055,top,"#b2a18a");
      }
      b.box(edge-(taxi?1.12:0),y+(taxi?1.77:1.64),z,.09,taxi?.39:.90,1.64,glass,"#749189");
      b.box(rear+(taxi?.67:0),y+(taxi?1.77:1.64),z,.09,taxi?.39:.90,1.64,glass,"#749189");
      if(taxi)b.box(x-.18,y+2.31,z,.69,.26,.61,"#f0da9b","#a88d4e");
      if(type==="megabus"){
        for(const side of [-1,1]){
          for(let i=-2;i<=2;i++)b.box(x-.64+i*.13,y+.58,z+side*1.18,.044,h-.13,.065,"#4a534e");
        }
      }
      if(!taxi){
        const doorX=x+w*.24;
        b.box(doorX,y+.64,z+1.20,1.13,1.86,.08,body,"#5f6559");
        for(const side of [-1,1])b.box(doorX+side*.275,y+1.59,z+1.245,.39,.75,.044,glass,"#78938b");
        b.box(doorX,y+.66,z+1.254,.06,1.84,.044,"#53625b");
      }
    }
  }

  function drawPerson(b,x,z,t,i,era) {
    const clothes = ["#b86b4c","#4e7068","#c3a45c","#6e5968","#738250"];
    const shift=Math.sin(t*6+i)*.18;
    b.box(x-shift,0,z-.18,.24,.68,.27,"#504a42");
    b.box(x+shift,0,z+.17,.24,.68,.27,"#504a42");
    b.box(x,.62,z,.48,.72,.53,clothes[i%5],"#535749",clothes[i%5]);
    const skin=["#c9946e","#946543","#d7ac84","#aa7958"][i%4];
    b.box(x,1.35,z,.38,.4,.37,skin,"#895f48",skin);
    if(era<3) b.box(x,1.68,z,.62,.11,.53,"#a08c62","#83684e");
  }

  class View {
    constructor(canvas) {
      this.canvas=canvas; this.ctx=canvas.getContext("2d");this.angle=startAngle;this.tilt=startTilt;this.zoom=1;
      this.w=0;this.h=0;this.resize();
      this.resizeObserver=new ResizeObserver(()=>this.resize());
      this.resizeObserver.observe(canvas);
    }
    resize(){
      const {width,height}=this.canvas.getBoundingClientRect();
      const dpr=Math.min(window.devicePixelRatio||1,2);
      this.w=width;this.h=height;
      this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);
      this.ctx.setTransform(dpr,0,0,dpr,0,0);
      this.redraw?.();
    }
    setEra(era){this.era=era;this.world=buildWorld(era);}
    reset(){this.angle=startAngle;this.tilt=startTilt;this.zoom=1;}
    orbit(dx,dy){this.angle=(this.angle+dx*.008)%(Math.PI*2);this.tilt=limit(this.tilt+dy*.004,.36,1.2);}
    magnify(factor){this.zoom=limit(this.zoom*factor,.64,2.2);}
    project(x,y,z){
      if(this.centerY)y-=this.centerY;
      const a=x*this.cos-z*this.sin,q=x*this.sin+z*this.cos;
      const v=q*this.vertical+y*this.up;
      const f=this.scale*205/(205-v);
      return [this.w*.50+a*f,this.h*(this.anchorY??.58)+(q*this.up-y*this.vertical)*f,v];
    }
    paintFace(face){
      const c=this.ctx;
      c.beginPath();
      face.points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
      c.closePath();c.fillStyle=face.color;c.fill();
    }
    layer(faces) {
      const projected=[];
      for(const face of faces) {
        const pts=face.vertices.map(p=>this.project(...p));
        const depth=pts.reduce((s,p)=>s+p[2],0)/pts.length;
        projected.push({points:pts,depth,color:face.color});
      }
      projected.sort((a,b)=>a.depth-b.depth);
      for(const face of projected) this.paintFace(face);
    }
    setModel(faces){
      const min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
      for(const {vertices} of faces)for(const point of vertices)for(let i=0;i<3;i++){
        min[i]=Math.min(min[i],point[i]);
        max[i]=Math.max(max[i],point[i]);
      }
      this.modelSize=max.map((value,i)=>Math.max(.1,value-min[i]));
      const center=max.map((value,i)=>(value+min[i])/2);
      const centered=faces.map(({vertices,color,ground})=>({
        ground,color,vertices:vertices.map(([x,y,z])=>[x-center[0],y-min[1],z-center[2]])
      }));
      this.modelGround=centered.filter(face=>face.ground).sort((a,b)=>a.vertices[0][1]-b.vertices[0][1]);
      this.model=centered.filter(face=>!face.ground);
      this.centerY=this.modelSize[1]/2;
      this.anchorY=.46;
    }
    drawModel(){
      if(!this.w||!this.h||!this.model)return;
      const c=this.ctx;
      this.cos=Math.cos(this.angle);this.sin=Math.sin(this.angle);
      this.up=Math.sin(this.tilt);this.vertical=Math.cos(this.tilt);
      const [width,height,depth]=this.modelSize;
      const spread=Math.hypot(width,depth);
      this.scale=Math.min(this.w/(spread*1.28),this.h/(height+spread*.57))*this.zoom;
      const gradient=c.createLinearGradient(0,0,0,this.h);
      gradient.addColorStop(0,"#e9e8d6");
      gradient.addColorStop(1,"#cbcfb6");
      c.fillStyle=gradient;
      c.fillRect(0,0,this.w,this.h);
      const [x,y]=this.project(0,-.07,0);
      c.fillStyle="#4e48362a";
      c.beginPath();
      c.ellipse(x,y,this.scale*Math.max(width,depth)*.45,
        this.scale*Math.min(width,depth)*(.13+.24*this.up),this.angle*-.20,0,Math.PI*2);
      c.fill();
      for(const face of this.modelGround){
        this.paintFace({color:face.color,points:face.vertices.map(p=>this.project(...p))});
      }
      this.layer(this.model);
    }
    backdrop() {
      const c=this.ctx,{w,h}=this,p=this.era.palette;
      const bg=c.createLinearGradient(0,0,0,h);
      bg.addColorStop(0,p.sky);bg.addColorStop(1,p.haze);
      c.fillStyle=bg;c.fillRect(0,0,w,h);
      const px = w*.77,py=h*.20;
      c.fillStyle="#fff4ce85";c.beginPath();c.arc(px,py,Math.min(h,w)*.10,0,Math.PI*2);c.fill();
      for(let layer=0;layer<3;layer++){
        c.beginPath();c.moveTo(0,h);
        for(let i=0;i<=28;i++){
          const x=i/28*w;
          const y=h*(.38+layer*.08)+Math.sin(i*.31+layer*1.8)*h*.10+Math.sin(i*.78+layer*2.1)*h*.035;
          c.lineTo(x,y);
        }
        c.lineTo(w,h);c.closePath();c.fillStyle=p.hills[layer];c.fill();
      }
      c.strokeStyle="#f8f5d13b";c.lineWidth=1;
      for(let j=0;j<9;j++){
        c.beginPath();
        for(let i=0;i<=24;i++){
          const x=i/24*w,y=h*(.62+j*.042)+Math.sin(i*.38+j*.29)*h*.037;
          if(i)c.lineTo(x,y);else c.moveTo(x,y);
        }
        c.stroke();
      }
    }
    draw(position,seconds,isMoving,reducedMotion){
      if(!this.world||!this.w||!this.h)return;
      this.cos=Math.cos(this.angle);this.sin=Math.sin(this.angle);
      this.up=Math.sin(this.tilt);this.vertical=Math.cos(this.tilt);
      this.scale=Math.min(this.w/123,this.h/72)*this.zoom;
      this.backdrop();
      const c=this.ctx;
      const shadow=this.project(0,-3,2);
      c.fillStyle="#28382e27";c.beginPath();c.ellipse(shadow[0],shadow[1]+5,this.scale*51,this.scale*23,this.angle*.25,0,Math.PI*2);c.fill();
      const sides=this.world.objects.slice(0,5);
      this.layer(sides);
      for(const face of this.world.surfaces)this.paintFace({color:face.color,points:face.vertices.map(p=>this.project(...p))});
      const fx=[];
      const b=builder(fx);
      const height=poseHeight(this.era,position);
      const pinFrom=this.era.stops[0].x,pinTo=this.era.stops.at(-1).x;
      for(let x=pinFrom;x<pinTo;x+=1.52){
        const by=poseHeight(this.era,x);
        b.box(x,by+.11,2.5,.93,0,.26,"#f7d587");
      }
      for(const stop of this.era.stops){
        b.disk(stop.x,poseHeight(this.era,stop.x)+.12,2.5,.78,"#f9e1a1");
      }
      for(let i=0;i<this.era.stops.length;i++) {
        const stop=this.era.stops[i];
        for(let j=0;j<5;j++){
          const movement=reducedMotion?0:Math.sin(seconds*(.42+j*.07)+i+j)*1.85;
          drawPerson(b,stop.x+(j-2)*2.4+movement,j%2?-3.25:8.65,
            reducedMotion?0:seconds,i*5+j,this.era.index);
        }
      }
      if(this.era.vehicle==="train"&&!reducedMotion){
        for(let i=0;i<5;i++){
          const k=(seconds*.58+i*.2)%1;
          b.box(position+2.6-k*3.3,4.0+k*4.5,2.5+.7*k,.43+k*.52,.47+k*.35,.41+k*.57,"#d2cbad","#bab298");
        }
      }
      if(this.era.vehicle==="mule") b.disk(position,.12,2.5,1.25,"#5b543a5e");
      drawVehicle(b,this.era.vehicle,position,height+.09,2.5,isMoving&&!reducedMotion?seconds:0);
      this.layer([...this.world.objects.slice(5),...fx]);
    }
  }

  function poseHeight(era,x) {
    if(era.vehicle==="cable")return 9.15;
    if(era.vehicle==="taxi"){
      const bridge=era.stops.find(stop=>stop.landmark==="bridge");
      if(bridge)return 5.13*limit((17-Math.abs(x-bridge.x))/4,0,1);
    }
    return 0;
  }

  function modelFaces(era,model){
    if(model.kind==="monument")return BolivarMonument.faces;
    const faces=[];
    if(model.kind==="vehicle"){
      drawVehicle(builder(faces),era.vehicle,0,0,0,0,true);
      return faces;
    }
    const floor=[];
    architecture(era,faces,builder(floor),true).landmark(model.landmark,0,0);
    return [...floor.map(face=>({...face,ground:true})),...faces];
  }

  return {View,poseHeight,modelFaces};
})();
