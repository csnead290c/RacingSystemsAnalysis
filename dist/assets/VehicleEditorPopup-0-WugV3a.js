import{r as p,j as e,an as M,ao as z,ap as L,aq as D,ar as G,as as V}from"./index-C1QgW4k7.js";const H=`
.vep-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr 1fr;
}
.vep-grid.compact {
  gap: 8px;
  grid-template-columns: 1fr 1fr;
}
@media (max-width: 768px) {
  .vep-grid {
    grid-template-columns: 1fr 1fr;
  }
  .vep-grid.compact {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 480px) {
  .vep-grid {
    grid-template-columns: 1fr;
  }
  .vep-grid.compact {
    grid-template-columns: 1fr;
  }
  .vep-span-2 {
    grid-column: span 1 !important;
  }
}
.vep-span-2 {
  grid-column: span 2;
}
.vep-section {
  margin-bottom: 20px;
  padding: 14px;
  background-color: var(--color-surface);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}
.vep-section.compact {
  margin-bottom: 12px;
  padding: 10px;
}
.vep-section-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.vep-section-title.compact {
  font-size: 0.8rem;
  margin-bottom: 8px;
}
.vep-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 2px;
  display: block;
}
.vep-label.compact {
  font-size: 0.7rem;
}
.vep-input {
  width: 100%;
  padding: 8px 10px;
  font-size: 0.9rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg);
  color: var(--color-text);
}
.vep-input.compact {
  padding: 6px 8px;
  font-size: 0.85rem;
}
.vep-input:focus {
  outline: none;
  border-color: var(--color-primary);
}
`,B=[{value:"Gasoline",label:"Gasoline (Carb)"},{value:"Gasoline EFI",label:"Gasoline (EFI)"},{value:"Methanol",label:"Methanol (Carb)"},{value:"Methanol EFI",label:"Methanol (EFI)"},{value:"Nitromethane",label:"Nitromethane"},{value:"E85",label:"E85"}],$=[{value:1,label:"Dragster w/Wing"},{value:2,label:"Dragster"},{value:3,label:"Funny Car"},{value:4,label:"Altered/Roadster"},{value:5,label:"Fastback"},{value:6,label:"Sedan"},{value:7,label:"Wagon/Van"},{value:8,label:"Motorcycle"}];function O({vehicle:t,onChange:o,isPro:i=!1,compact:f=!1,showName:F=!0,hasThrottleStop:u=!0}){var E,w,P,T;p.useEffect(()=>{const a="vep-responsive-styles";if(!document.getElementById(a)){const n=document.createElement("style");n.id=a,n.textContent=H,document.head.appendChild(n)}},[]);const[S,x]=p.useState(!1),[C,d]=p.useState(!1),[R,y]=p.useState(!1),N=t.transmissionType??"clutch",s=(a,n)=>{o({...t,[a]:n})},c=(a,n,m)=>{const g=[...t[a]??[]];g[n]=m,o({...t,[a]:g})},h=f?"compact":"",v=`vep-section ${h}`,j=`vep-section-title ${h}`,b=`vep-grid ${h}`,l=`vep-label ${h}`,r=`vep-input ${h}`;return e.jsxs("div",{children:[F&&e.jsxs("div",{className:v,children:[e.jsx("div",{className:j,children:"Identity"}),e.jsxs("div",{className:b,children:[e.jsxs("div",{className:"vep-span-2",children:[e.jsx("label",{className:l,children:"Vehicle Name *"}),e.jsx("input",{type:"text",className:r,value:t.name??"",onChange:a=>s("name",a.target.value),placeholder:"My Race Car"})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Race Length"}),e.jsxs("select",{className:r,value:t.defaultRaceLength??"QUARTER",onChange:a=>s("defaultRaceLength",a.target.value),children:[e.jsx("option",{value:"EIGHTH",children:"1/8 Mile"}),e.jsx("option",{value:"QUARTER",children:"1/4 Mile"})]})]})]})]}),e.jsxs("div",{className:v,children:[e.jsx("div",{className:j,children:"Vehicle"}),e.jsxs("div",{className:b,children:[e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Weight (lb) *"}),e.jsx("input",{type:"number",className:r,value:t.weightLb??"",onChange:a=>s("weightLb",parseFloat(a.target.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Wheelbase (in)"}),e.jsx("input",{type:"number",className:r,value:t.wheelbaseIn??108,onChange:a=>s("wheelbaseIn",parseFloat(a.target.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Rollout (in)"}),e.jsx("input",{type:"number",step:"0.1",className:r,value:t.rolloutIn??12,onChange:a=>s("rolloutIn",parseFloat(a.target.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Body Style"}),e.jsx("select",{className:r,value:t.bodyStyle??6,onChange:a=>s("bodyStyle",parseInt(a.target.value)),children:$.map(a=>e.jsx("option",{value:a.value,children:a.label},a.value))})]}),e.jsxs("div",{children:[e.jsxs("label",{className:l,children:["Frontal Area (ft²)",e.jsx(M,{onClick:()=>x(!0),tooltip:z.btnFrontalArea})]}),e.jsx("input",{type:"number",step:"0.1",className:r,value:t.frontalAreaFt2??22,onChange:a=>s("frontalAreaFt2",parseFloat(a.target.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Tire Dia (in)"}),e.jsx("input",{type:"number",step:"0.1",className:r,value:t.tireDiaIn??28,onChange:a=>s("tireDiaIn",parseFloat(a.target.value))})]})]})]}),e.jsxs("div",{className:v,children:[e.jsx("div",{className:j,children:"Engine"}),e.jsxs("div",{className:b,children:[e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Peak HP *"}),e.jsx("input",{type:"number",className:r,value:t.powerHP??"",onChange:a=>s("powerHP",parseFloat(a.target.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"RPM @ Peak HP *"}),e.jsx("input",{type:"number",step:"100",className:r,value:t.rpmAtPeakHP??6500,onChange:a=>s("rpmAtPeakHP",parseFloat(a.target.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Displacement (CID)"}),e.jsx("input",{type:"number",className:r,value:t.displacementCID??350,onChange:a=>s("displacementCID",parseFloat(a.target.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Fuel Type"}),e.jsx("select",{className:r,value:t.fuelType??"Gasoline",onChange:a=>s("fuelType",a.target.value),children:B.map(a=>e.jsx("option",{value:a.value,children:a.label},a.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Shift RPM"}),e.jsx("input",{type:"number",step:"100",className:r,value:((E=t.shiftRPMs)==null?void 0:E[0])??6500,onChange:a=>{var g;const n=parseFloat(a.target.value),m=((g=t.gearRatios)==null?void 0:g.length)??4;s("shiftRPMs",Array(m).fill(n))}})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Rev Limiter"}),e.jsx("input",{type:"number",step:"100",className:r,value:t.revLimiterRPM??"",placeholder:"None",onChange:a=>s("revLimiterRPM",a.target.value?parseFloat(a.target.value):void 0)})]})]}),e.jsx("div",{style:{marginTop:"8px"},children:e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:"6px",fontSize:"0.8rem",cursor:"pointer"},children:[e.jsx("input",{type:"checkbox",checked:t.n2oEnabled??!1,onChange:a=>s("n2oEnabled",a.target.checked)}),"N2O (Nitrous Oxide)"]})})]}),e.jsxs("div",{className:v,children:[e.jsx("div",{className:j,children:"Transmission"}),e.jsx("div",{style:{marginBottom:"10px"},children:e.jsxs("div",{style:{display:"flex",gap:"12px"},children:[e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:"4px",fontSize:"0.85rem",cursor:"pointer"},children:[e.jsx("input",{type:"radio",name:"transType",checked:N==="clutch",onChange:()=>s("transmissionType","clutch")}),"Clutch"]}),e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:"4px",fontSize:"0.85rem",cursor:"pointer"},children:[e.jsx("input",{type:"radio",name:"transType",checked:N==="converter",onChange:()=>s("transmissionType","converter")}),"Converter"]})]})}),e.jsx("div",{className:b,children:N==="clutch"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Launch RPM"}),e.jsx("input",{type:"number",step:"100",className:r,value:t.clutchLaunchRPM??5500,onChange:a=>s("clutchLaunchRPM",parseFloat(a.target.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Slip RPM"}),e.jsx("input",{type:"number",step:"100",className:r,value:t.clutchSlipRPM??6e3,onChange:a=>s("clutchSlipRPM",parseFloat(a.target.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Slippage Factor"}),e.jsx("input",{type:"number",step:"0.001",className:r,value:t.clutchSlippage??1.004,onChange:a=>s("clutchSlippage",parseFloat(a.target.value))})]})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Stall RPM"}),e.jsx("input",{type:"number",step:"100",className:r,value:t.converterStallRPM??3e3,onChange:a=>s("converterStallRPM",parseFloat(a.target.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Launch RPM"}),e.jsx("input",{type:"number",step:"100",className:r,value:t.converterLaunchRPM??t.converterStallRPM??3e3,onChange:a=>s("converterLaunchRPM",parseFloat(a.target.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Torque Mult"}),e.jsx("input",{type:"number",step:"0.01",className:r,value:t.converterTorqueMult??2,onChange:a=>s("converterTorqueMult",parseFloat(a.target.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Slippage %"}),e.jsx("input",{type:"number",step:"0.1",className:r,value:t.converterSlippage??5,onChange:a=>s("converterSlippage",parseFloat(a.target.value))})]})]})})]}),e.jsxs("div",{className:v,children:[e.jsx("div",{className:j,children:"Final Drive"}),e.jsxs("div",{className:b,children:[e.jsxs("div",{children:[e.jsxs("label",{className:l,children:["Rear Gear Ratio",e.jsx(M,{onClick:()=>y(!0),tooltip:"Calculate gear ratio"})]}),e.jsx("input",{type:"number",step:"0.01",className:r,value:t.rearGear??3.73,onChange:a=>s("rearGear",parseFloat(a.target.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Trans Efficiency"}),e.jsx("input",{type:"number",step:"0.01",className:r,value:t.transEfficiency??.97,onChange:a=>s("transEfficiency",parseFloat(a.target.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"# of Gears"}),e.jsx("select",{className:r,value:((w=t.gearRatios)==null?void 0:w.length)??4,onChange:a=>{const n=parseInt(a.target.value),m=t.gearRatios??[2.5,1.8,1.4,1],g=t.shiftRPMs??[7e3,7e3,7e3,7e3],I=Array(n).fill(0).map((W,k)=>m[k]??1),A=Array(n).fill(0).map((W,k)=>g[k]??7e3);o({...t,gearRatios:I,shiftRPMs:A})},children:[1,2,3,4,5,6].map(a=>e.jsx("option",{value:a,children:a},a))})]})]}),(((P=t.gearRatios)==null?void 0:P.length)??0)>1&&e.jsxs("div",{style:{marginTop:"10px"},children:[e.jsx("label",{className:l,children:"Gear Ratios"}),e.jsx("div",{style:{display:"flex",gap:"6px",flexWrap:"wrap"},children:(T=t.gearRatios)==null?void 0:T.map((a,n)=>e.jsxs("div",{style:{width:f?"60px":"70px"},children:[e.jsx("input",{type:"number",step:"0.01",className:r,style:{textAlign:"center"},value:a,onChange:m=>c("gearRatios",n,parseFloat(m.target.value)),title:`Gear ${n+1}`}),e.jsxs("div",{style:{fontSize:"0.65rem",textAlign:"center",color:"var(--color-text-muted)"},children:[n+1,n===0?"st":n===1?"nd":n===2?"rd":"th"]})]},n))})]})]}),u&&(i||t.throttleStopEnabled)&&e.jsxs("div",{className:v,children:[e.jsx("div",{className:j,children:"Throttle Stop"}),e.jsx("div",{style:{marginBottom:"10px"},children:e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:"6px",fontSize:"0.8rem",cursor:"pointer"},children:[e.jsx("input",{type:"checkbox",checked:t.throttleStopEnabled??!1,onChange:a=>s("throttleStopEnabled",a.target.checked)}),"Enable Throttle Stop"]})}),t.throttleStopEnabled&&e.jsxs("div",{className:b,children:[e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Delay (sec)"}),e.jsx("input",{type:"number",step:"0.01",className:r,value:t.throttleStopDelay??.5,onChange:a=>s("throttleStopDelay",parseFloat(a.target.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Duration (sec)"}),e.jsx("input",{type:"number",step:"0.01",className:r,value:t.throttleStopDuration??.3,onChange:a=>s("throttleStopDuration",parseFloat(a.target.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:l,children:"Throttle %"}),e.jsx("input",{type:"number",step:"1",className:r,value:t.throttleStopPct??50,onChange:a=>s("throttleStopPct",parseFloat(a.target.value))})]})]})]}),e.jsx(L,{isOpen:S,onClose:()=>x(!1),onApply:a=>{s("frontalAreaFt2",a),x(!1)}}),e.jsx(D,{isOpen:C,onClose:()=>d(!1),onApply:a=>{s("tireWidthIn",a),d(!1)}}),e.jsx(G,{isOpen:R,onClose:()=>y(!1),onApply:a=>{s("rearGear",a),y(!1)}})]})}function _({isOpen:t,onClose:o,vehicle:i,onApply:f,isPro:F=!1}){const[u,S]=p.useState({}),[x,C]=p.useState(!1),[d,R]=p.useState(!1);p.useEffect(()=>{t&&i&&(S({...i}),R(!1))},[t,i]);const y=c=>{S(c),R(!0)},N=()=>{u&&i&&(f({...i,...u}),o())},s=async()=>{if(!(!u||!i)){C(!0);try{const c={...i,...u};await V(c),f(c),o()}catch(c){console.error("Failed to save vehicle:",c),alert("Failed to save vehicle. Please try again.")}finally{C(!1)}}};return p.useEffect(()=>{if(!t)return;const c=h=>{h.key==="Escape"&&o()};return window.addEventListener("keydown",c),()=>window.removeEventListener("keydown",c)},[t,o]),!t||!i?null:e.jsxs(e.Fragment,{children:[e.jsx("div",{onClick:o,style:{position:"fixed",top:0,left:0,right:0,bottom:0,backgroundColor:"rgba(0, 0, 0, 0.6)",zIndex:1e3}}),e.jsxs("div",{style:{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%, -50%)",backgroundColor:"var(--color-bg)",borderRadius:"12px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",zIndex:1001,width:"500px",maxWidth:"95vw",maxHeight:"90vh",display:"flex",flexDirection:"column"},children:[e.jsxs("div",{style:{padding:"14px 18px",borderBottom:"1px solid var(--color-border)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0},children:[e.jsxs("div",{children:[e.jsx("h3",{style:{margin:0,fontSize:"1.1rem",color:"var(--color-text)"},children:"⚙️ Edit Vehicle"}),e.jsx("div",{style:{fontSize:"0.8rem",color:"var(--color-text-muted)"},children:i.name})]}),e.jsx("button",{onClick:o,style:{background:"none",border:"none",fontSize:"1.5rem",cursor:"pointer",color:"var(--color-text-muted)",padding:"0 4px"},children:"×"})]}),e.jsx("div",{style:{padding:"16px",overflowY:"auto",flex:1},children:e.jsx(O,{vehicle:u,onChange:y,isPro:F,compact:!0,showName:!1})}),e.jsxs("div",{style:{padding:"12px 18px",borderTop:"1px solid var(--color-border)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,backgroundColor:"var(--color-surface)"},children:[e.jsx("div",{style:{fontSize:"0.75rem",color:"var(--color-text-muted)"},children:d?"• Unsaved changes":"No changes"}),e.jsxs("div",{style:{display:"flex",gap:"8px"},children:[e.jsx("button",{onClick:o,style:{padding:"8px 16px",borderRadius:"6px",border:"1px solid var(--color-border)",backgroundColor:"transparent",color:"var(--color-text)",cursor:"pointer",fontSize:"0.85rem"},children:"Cancel"}),e.jsx("button",{onClick:N,disabled:!d,style:{padding:"8px 16px",borderRadius:"6px",border:"1px solid var(--color-accent)",backgroundColor:"transparent",color:"var(--color-accent)",cursor:d?"pointer":"not-allowed",opacity:d?1:.5,fontSize:"0.85rem"},title:"Apply changes for this session only",children:"Apply"}),e.jsx("button",{onClick:s,disabled:!d||x,style:{padding:"8px 16px",borderRadius:"6px",border:"none",backgroundColor:d?"var(--color-accent)":"var(--color-border)",color:"white",cursor:d&&!x?"pointer":"not-allowed",fontSize:"0.85rem",fontWeight:500},title:"Save changes permanently",children:x?"Saving...":"Save"})]})]})]})]})}export{_ as default};
//# sourceMappingURL=VehicleEditorPopup-0-WugV3a.js.map
