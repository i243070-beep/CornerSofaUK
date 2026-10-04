'use client';
import type { FabricSwatch } from '@/lib/fabric-options';
import { Check } from 'lucide-react';
export default function FabricChoices({swatches,value,onChange}:{swatches:FabricSwatch[];value?:string;onChange:(id:string)=>void}){
 return <div className="fabric-choice-grid">{swatches.map(s=><button type="button" key={s.id} aria-pressed={value===s.id} className={`fabric-choice ${value===s.id?'selected':''}`} onClick={()=>onChange(s.id)}><span className="fabric-preview" style={{backgroundColor:s.hex_color}}>{s.image_url?<img src={s.image_url} alt={`${s.name} ${s.material} fabric`} loading="lazy"/>:<span>Colour reference</span>}{value===s.id&&<i><Check size={18}/></i>}</span><span className="fabric-choice-text"><strong>{s.name}</strong><small>{s.material}</small><b>{s.surchargePence?`+ £${(s.surchargePence/100).toFixed(2)}`:'Included'}</b></span></button>)}</div>;
}
