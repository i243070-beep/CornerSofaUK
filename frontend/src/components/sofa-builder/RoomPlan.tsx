'use client';
import { useRef } from 'react';
import type { RoomPlan as Plan } from '@/lib/sofa-builder/types';

export const EMPTY_PLAN: Plan = { widthMm: 5000, lengthMm: 4000, xMm: 700, yMm: 700, rotation: 0, obstacles: [] };
export default function RoomPlan({ value, onChange, footprint }: { value: Plan; onChange: (plan: Plan) => void; footprint?: { width: number; depth: number } }) {
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const sofaW = footprint ? (value.rotation === 90 ? footprint.depth : footprint.width) * 10 : 0;
  const sofaD = footprint ? (value.rotation === 90 ? footprint.width : footprint.depth) * 10 : 0;
  const place = (x: number,y: number) => onChange({ ...value, xMm:Math.round(Math.max(0,Math.min(value.widthMm-sofaW,x))),yMm:Math.round(Math.max(0,Math.min(value.lengthMm-sofaD,y))) });
  function move(event:React.PointerEvent<SVGSVGElement>) { if (!dragging.current || !svg.current || !footprint) return; const point=svg.current.createSVGPoint();point.x=event.clientX;point.y=event.clientY;const local=point.matrixTransform(svg.current.getScreenCTM()!.inverse());place(local.x-sofaW/2,local.y-sofaD/2); }
  return <div>
    <div className="builder-fields"><label>Room width (cm)<input type="number" min="100" max="2000" value={value.widthMm/10} onChange={e=>onChange({...value,widthMm:Math.max(1000,Math.min(20000,Number(e.target.value)*10))})}/></label><label>Room length (cm)<input type="number" min="100" max="2000" value={value.lengthMm/10} onChange={e=>onChange({...value,lengthMm:Math.max(1000,Math.min(20000,Number(e.target.value)*10))})}/></label></div>
    {!footprint && <p role="status">This design has no verified footprint yet. Use the photo planner, or ask us to confirm dimensions before planning its fit.</p>}
    <svg ref={svg} viewBox={`0 0 ${value.widthMm} ${value.lengthMm}`} className="builder-room-plan" role="img" aria-label="Room footprint in millimetres" onPointerMove={move} onPointerUp={()=>{dragging.current=false;}} onPointerCancel={()=>{dragging.current=false;}}>
      <rect x="10" y="10" width={value.widthMm-20} height={value.lengthMm-20} fill="#edf1e5" stroke="#789480" strokeWidth="25"/>
      {value.obstacles.map((o,i)=><g key={i}><rect x={o.xMm} y={o.yMm} width={o.widthMm} height={o.depthMm} fill={o.type==='door'?'#c9a55d':'#8cc9d0'} /><text x={o.xMm+30} y={o.yMm+100} fontSize="95" fill="#213c33">{o.type}</text></g>)}
      {footprint && <g role="button" tabIndex={0} aria-label="Sofa position. Use arrow keys to move 10 centimetres." style={{cursor:'grab'}} onPointerDown={e=>{dragging.current=true;svg.current?.setPointerCapture(e.pointerId);}} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();place(value.xMm+(e.key==='ArrowRight'?100:e.key==='ArrowLeft'?-100:0),value.yMm+(e.key==='ArrowDown'?100:e.key==='ArrowUp'?-100:0));}}}><rect x={value.xMm} y={value.yMm} width={sofaW} height={sofaD} rx="70" fill="#386c58" stroke="#e4c780" strokeWidth="25"/><text x={value.xMm+sofaW/2} y={value.yMm+sofaD/2} textAnchor="middle" dominantBaseline="middle" fontSize="100" fill="white">{sofaW/10} × {sofaD/10} cm</text></g>}
    </svg>
    {footprint && <><p>Drag the sofa or use its arrow keys. This is a rectangular overall footprint, not a delivery-access guarantee.</p>{(sofaW>value.widthMm||sofaD>value.lengthMm) && <p role="alert">The sofa footprint is larger than this room.</p>}<div className="builder-fields"><label>Horizontal position (cm)<input type="number" min="0" value={value.xMm/10} onChange={e=>place(Number(e.target.value)*10,value.yMm)}/></label><label>Vertical position (cm)<input type="number" min="0" value={value.yMm/10} onChange={e=>place(value.xMm,Number(e.target.value)*10)}/></label></div><button type="button" onClick={()=>onChange({...value,rotation:value.rotation===90?0:90,xMm:0,yMm:0})}>Rotate footprint 90°</button></>}
    <div className="builder-inline">{(['door','window'] as const).map(type=><button type="button" key={type} disabled={value.obstacles.length>=10} onClick={()=>onChange({...value,obstacles:[...value.obstacles,{type,xMm:200,yMm:100,widthMm:900,depthMm:type==='door'?900:120}]})}>Add {type}</button>)}</div>
    {value.obstacles.map((o,i)=><div className="builder-fields" key={i}><label>{o.type} left (cm)<input type="number" min="0" max={value.widthMm/10} value={o.xMm/10} onChange={e=>onChange({...value,obstacles:value.obstacles.map((v,j)=>j===i?{...v,xMm:Number(e.target.value)*10}:v)})}/></label><label>Top (cm)<input type="number" min="0" max={value.lengthMm/10} value={o.yMm/10} onChange={e=>onChange({...value,obstacles:value.obstacles.map((v,j)=>j===i?{...v,yMm:Number(e.target.value)*10}:v)})}/></label><button type="button" onClick={()=>onChange({...value,obstacles:value.obstacles.filter((_,j)=>j!==i)})}>Remove {o.type}</button></div>)}
  </div>;
}
