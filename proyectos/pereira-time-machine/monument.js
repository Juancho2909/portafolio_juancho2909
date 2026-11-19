"use strict";

const BolivarMonument = (() => {
  const faces = [];
  const tau = Math.PI * 2;
  const subtract = (a,b) => a.map((v,i)=>v-b[i]);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit = v => {
    const length=Math.hypot(...v)||1;
    return v.map(n=>n/length);
  };
  const light = unit([-0.48,.83,.45]);

  function face(vertices,base,variation=0) {
    const normal=unit(cross(subtract(vertices[1],vertices[0]),subtract(vertices[2],vertices[0])));
    const cosine=normal.reduce((sum,n,i)=>sum+n*light[i],0);
    const intensity=.67+.47*Math.max(0,cosine)+.11*Math.max(0,-cosine)+variation;
    const color="rgb("+base.map(channel=>Math.round(channel*intensity)).join(",")+")";
    faces.push({vertices,color});
  }

  const bronze=[105,96,73], greenBronze=[88,100,78], shadowBronze=[84,77,61], flameBronze=[117,103,72];

  // An elliptical section at each anatomical joint or change of volume.
  function sweep(sections, material=bronze, sides=12) {
    const smooth=sections.flatMap((start,i)=>{
      const end=sections[i+1];
      if(!end)return [start];
      const before=sections[i-1]||start, after=sections[i+2]||end;
      // The midpoint of the Catmull–Rom segment rounds off crests and joints.
      const middle=start.map((a,j)=>(9*(a+end[j])-before[j]-after[j])/16);
      return [start,middle];
    });
    const rings=smooth.map(([x,y,z,width,depth],i)=>{
      const from=smooth[Math.max(i-1,0)],to=smooth[Math.min(i+1,smooth.length-1)];
      width=Math.max(.008,width);
      depth=Math.max(.008,depth);
      const tangent=unit([to[0]-from[0],to[1]-from[1],to[2]-from[2]]);
      const horizontal=unit(Math.hypot(tangent[0],tangent[1])>.03 ? [-tangent[1],tangent[0],0] : [1,0,0]);
      const perpendicular=cross(tangent,horizontal);
      return Array.from({length:sides},(_,j)=>{
        const a=tau*j/sides,c=Math.cos(a)*width,s=Math.sin(a)*depth;
        return [x+horizontal[0]*c+perpendicular[0]*s,y+horizontal[1]*c+perpendicular[1]*s,z+horizontal[2]*c+perpendicular[2]*s];
      });
    });
    for(let i=0;i<rings.length-1;i++) {
      for(let j=0;j<sides;j++){
        const k=(j+1)%sides;
        face([rings[i][j],rings[i][k],rings[i+1][k],rings[i+1][j]],material,.012*Math.sin(19*j+12*i));
      }
    }
    face([...rings[0]].reverse(),material);
    face(rings.at(-1),material);
  }

  function hoof(x,y,z){
    sweep([[x+.17,y+.13,z,.13,.13],[x,y,z,.17,.145],[x-.22,y-.025,z,.10,.13]],shadowBronze,8);
  }

  function cloth(profile,width,phase) {
    const folds=19;
    const sheets=[-1,1].map(side=>profile.map(([x,y,z,halfSpan],i)=>
      Array.from({length:folds+1},(_,j)=>{
        const t=j/folds;
        const ridge=Math.cos(t*Math.PI*18+phase+i*.28)*.045;
        const curve=Math.sin(t*Math.PI);
        return [x+halfSpan*(t-.5)*.22,y+halfSpan*(t-.5)+curve*.08,
          z+(t-.5)*width+ridge+side*(.055+curve*.038)];
      })
    ));
    for(const [side,sheet] of sheets.entries()) {
      for(let i=0;i<sheet.length-1;i++){
        for(let j=0;j<folds;j++){
          const panel=[sheet[i][j],sheet[i+1][j],sheet[i+1][j+1],sheet[i][j+1]];
          face(side?panel:[...panel].reverse(),greenBronze,.085*Math.cos(j*Math.PI*.95+phase));
        }
      }
    }
    for(let i=0;i<profile.length-1;i++){
      face([sheets[0][i][0],sheets[0][i+1][0],sheets[1][i+1][0],sheets[1][i][0]],shadowBronze);
      face([sheets[1][i][folds],sheets[1][i+1][folds],sheets[0][i+1][folds],sheets[0][i][folds]],bronze);
    }
  }

  function pedestal() {
    const stone=[162,157,142];
    const lower=[[-3.55,0,-1.96],[3.55,0,-1.96],[3.55,0,1.96],[-3.55,0,1.96]];
    const upper=lower.map(([x,,z])=>[x,.55,z]);
    face([...upper].reverse(),stone);
    for(let i=0;i<4;i++){
      const j=(i+1)%4;
      face([lower[i],lower[j],upper[j],upper[i]],stone);
    }
    // The bronze below the horse rises from the tilted support in three layered folds.
    sweep([[.32,.56,0,.45,.72],[-.18,1.27,0,.59,.85],[-.64,2.12,0,.78,.78],
      [-1,3.03,0,.70,.71],[-.72,3.66,0,.72,.68],[-.15,4.3,0,.58,.61]],shadowBronze,12);
    cloth([[-1.81,3.01,-.24,1.12],[-1.13,2.43,-.02,2.18],[-.16,1.96,.24,2.12],
      [.79,1.63,.48,1.78],[1.84,1.76,.73,1.39],[2.76,2.08,.93,.83],[3.33,2.45,.94,.18]],1.58,.1);
    cloth([[-1.56,3.43,.02,.95],[-.59,3.10,.23,1.36],[.29,2.94,.43,1.49],
      [1.12,2.92,.63,1.50],[2.00,3.06,.88,1.27],[2.95,3.32,1.07,.87],[3.55,3.88,1.01,.20]],1.42,1.3);
    cloth([[-1.08,3.86,-.35,.64],[-.28,3.68,-.38,.96],[.55,3.48,-.39,.97],
      [1.39,3.38,-.37,.94],[2.26,3.39,-.51,.67],[3.04,3.55,-.72,.57],[3.57,4.02,-.83,.09]],1.42,2.0);
  }

  function horse() {
    sweep([[-1.8,4.8,0,.36,.45],[-1.53,4.59,0,.68,.62],
      [-.93,4.59,0,.75,.72],[-.20,4.64,0,.69,.64],[.57,4.81,0,.65,.65],
      [1.10,4.98,0,.66,.67],[1.57,5.01,0,.56,.55],[1.90,4.98,0,.23,.26]]);
    sweep([[-1.32,4.53,0,.49,.53],[-1.66,4.98,0,.51,.49],[-1.94,5.32,0,.41,.37],
      [-2.24,5.57,0,.34,.28],[-2.52,5.65,0,.27,.23],[-2.78,5.63,0,.23,.21]]);
    sweep([[-2.27,5.69,0,.28,.27],[-2.61,5.67,0,.31,.26],[-2.94,5.52,0,.23,.19],
      [-3.18,5.40,0,.17,.18],[-3.33,5.38,0,.115,.15]]);
    sweep([[-3.04,5.39,.005,.085,.15],[-3.21,5.29,.005,.084,.13],[-3.30,5.30,.005,.044,.06]],shadowBronze,8);
    for(const z of [-.176,.176]){
      sweep([[-2.50,5.79,z,.11,.09],[-2.47,6.02,z,.082,.07],[-2.49,6.17,z,.025,.023]],shadowBronze,7);
      sweep([[-2.73,5.67,z*1.45,.067,.026],[-2.83,5.64,z*1.5,.026,.026]],shadowBronze,8);
    }
    for(const z of [-1,1]){
      sweep([[-1.53,4.43,z*.43,.36,.28],[-1.92,4.24,z*.50,.25,.21],
        [-2.25,4.00,z*.53,.16,.14],[-2.38,3.73,z*.56,.105,.095],
        [-2.19,3.60,z*.57,.087,.085],[-1.94,3.57,z*.56,.11,.11]],bronze,10);
      hoof(-1.98,3.54,z*.56);
      const extension=z>0?.18:-.20;
      sweep([[1.24,4.84,z*.43,.41,.33],[1.28,4.36,z*.55,.30,.24],
        [1.92,4.25+extension,z*.56,.17,.16],[2.34,4.55+extension,z*.57,.14,.12],
        [2.64,4.36+extension,z*.59,.092,.094],[2.91,4.35+extension,z*.59,.106,.11]],bronze,10);
      hoof(2.94,4.35+extension,z*.59);
    }
    for(let i=0;i<7;i++){
      const z=(i-3)*.105;
      sweep([[-2.40,5.89,z,.10,.08],[-2.06,5.78,z+.02,.125,.095],
        [-1.77,5.47,z+.05,.112,.08],[-1.39,5.20,z+.13,.090,.07],
        [-1.06,5.04,z+.23,.016,.032]],i%2?greenBronze:shadowBronze,6);
      sweep([[1.60,5.10,z,.14,.105],[1.94,5.30+i*.035,z,.16,.132],
        [2.31,5.31+i*.064,z+.04,.135,.11],
        [2.76,5.10+i*.061,z+.13,.107,.108],[3.28+i*.054,4.84+i*.069,z+.25,.019,.032]],i%2?greenBronze:shadowBronze,7);
    }
  }

  function rider() {
    sweep([[-.58,5.26,0,.30,.36],[-.79,5.49,0,.34,.35],
      [-1.13,5.78,0,.39,.31],[-1.46,6.02,0,.43,.39],[-1.65,6.18,0,.32,.33],[-1.81,6.26,0,.22,.25]]);
    sweep([[-1.68,6.04,.01,.21,.21],[-1.84,6.28,.01,.186,.20],[-2.00,6.39,.01,.19,.19]]);
    sweep([[-2.13,6.32,.015,.115,.135],[-2.13,6.46,.015,.22,.21],
      [-2.08,6.64,.012,.245,.224],[-2.02,6.83,.015,.179,.186],[-1.95,6.93,.027,.05,.09]],bronze);
    sweep([[-2.20,6.47,.025,.091,.12],[-2.33,6.46,.025,.063,.073],[-2.39,6.43,.025,.028,.043]],bronze,8);
    for(const z of [-.18,.18]) {
      sweep([[-1.97,6.61,z,.11,.079],[-1.88,6.76,z,.12,.083],[-1.72,6.72,z+.025,.055,.041]],shadowBronze,7);
      sweep([[-.66,5.36,z*1.95,.28,.26],[-.68,5.01,z*2.9,.27,.22],[-.99,4.66,z*3.72,.198,.17],
        [-1.31,4.49,z*3.57,.151,.14],[-1.01,4.30,z*3.62,.144,.133],[-.64,4.16,z*3.81,.091,.093],
        [-.45,4.08,z*3.84,.11,.112],[-.55,3.96,z*3.89,.044,.09]],bronze,10);
    }
    sweep([[-1.64,6.10,-.28,.19,.18],[-2.06,6.25,-.43,.17,.152],
      [-2.54,6.46,-.51,.15,.132],[-2.88,6.65,-.53,.121,.102],[-3.30,6.87,-.59,.092,.088],
      [-3.51,6.99,-.59,.13,.11]],bronze,10);
    sweep([[-1.51,5.95,.25,.203,.185],[-1.69,5.61,.57,.174,.16],
      [-1.91,5.47,.62,.132,.12],[-2.31,5.54,.57,.11,.10],[-2.55,5.61,.52,.125,.11]],bronze,10);
    sweep([[-3.46,6.81,-.60,.074,.081],[-3.56,7.12,-.62,.097,.10],[-3.66,7.32,-.62,.152,.141]],shadowBronze,9);
    for(let i=0;i<8;i++){
      const z=-.83+i*.057;
      const reach=Math.sin((i+.5)*Math.PI/8);
      sweep([[-3.58,7.16,z,.092,.067],[-3.95+i*.017,7.31+i*.068,z,.14,.087],
        [-3.71+i*.041,7.58+i*.037,z+.09,.12,.079],
        [-3.46+reach*.54,7.64+i*.047,z+.23,.017,.024]],flameBronze,7);
    }
  }

  pedestal();
  horse();
  rider();
  return {
    faces,
    placeAt(x,z){
      const angle=.12,cos=Math.cos(angle),sin=Math.sin(angle);
      return faces.map(({vertices,color})=>({color,vertices:vertices.map(([a,b,c])=>[
        x+a*cos-c*sin,b,z+a*sin+c*cos
      ])}));
    }
  };
})();
