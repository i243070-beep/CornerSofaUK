import type { BuildSnapshot } from '@/lib/sofa-builder/types';
import { formatProductPrice } from '@/lib/product-options';

export default function BuildSpecification({ build, compact = false }: { build: BuildSnapshot; compact?: boolean }) {
  return <div className={compact ? 'build-spec-compact' : 'build-specification'}>
    <p className="build-reference">Build {build.id.slice(0,12).toUpperCase()}</p>
    {!compact && <><h2>Your custom sofa</h2><h3>{build.price.title}</h3>{build.price.image && <img src={build.price.image} alt={build.price.title} className="build-summary-image" />}<p>Catalogue photograph. Custom feet, piping and requests are listed below; they are not rendered in this image.</p></>}
    {build.price.fabric && <div className="attached-fabric">{build.price.fabric.image_url?<img src={build.price.fabric.image_url} alt={build.price.fabric.name}/>:<span style={{backgroundColor:build.price.fabric.hex_color}}/>}<div><strong>{build.price.fabric.name}</strong><small>{build.price.fabric.material} fabric - part of this sofa</small></div></div>}
    <details open={!compact}><summary>Configuration &amp; manufacturing specification</summary><ul>{build.price.specification.map((line,i)=><li key={i}>{line}</li>)}</ul></details>
    {!compact && <><dl>{build.price.lines.map(line=><div key={line.id}><dt>{line.label}{line.quantity>1?` × ${line.quantity}`:''}</dt><dd>{line.totalPence===0?'Included':formatProductPrice(line.totalPence/100)}</dd></div>)}</dl><p className="build-total">{build.price.status==='fixed'?'Total':'Known items'} <strong>{formatProductPrice(build.price.knownPence/100)}</strong></p>{build.price.unresolved.length>0 && <ul className="build-unresolved">{build.price.unresolved.map(reason=><li key={reason}>{reason}</li>)}</ul>}</>}
  </div>;
}
