'use client';
import { readApiJson } from '@/lib/api-json';
import { useEffect, useRef, useState } from 'react';
import { FileText, ImagePlus, Minus, Send, Sofa, Sparkles, X } from 'lucide-react';
import styles from './alashi.module.css';
import { useCart } from '@/context/CartContext';
type Match = {id:string;title:string;description?:string;image:string;images:string[];category:string;price:number;variantId:string;colour:string;range_type:string;available:boolean;offerToken?:string;materials?:string;warranty?:string;colourNotes?:string;range:{min:number;max:number}|null;dimensions?:{width:number;depth:number;height:number};colours:{colour:string;available:boolean}[]};
type Message = {role:'assistant'|'customer';text:string;products?:Match[];image?:string;request?:string;attachment?:Attachment;actions?:string[];order?:Match};
type Attachment = {name:string;data:string};
const suggestedQuestions = ['Help me choose a corner sofa', 'What fabrics and colours can I choose?', 'How does delivery work?', 'Can I pay on delivery?'];
const money = (n:number) => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(n);
export default function AlashiChat() {
  const {addItem}=useCart();
  const [context,setContext]=useState('');
  const controller=useRef<AbortController|null>(null);
  const sending=useRef(false);const generation=useRef(0);const [restored,setRestored]=useState(false);const [generating,setGenerating]=useState(false);
  const [open,setOpen] = useState(false);
  const [messages,setMessages] = useState<Message[]>([{role:'assistant',text:'Welcome to Corner Sofa. I’m HELPER, your sofa assistant. Tell me what you have in mind, or share a photo or document.'}]);
  const [message,setMessage]=useState(''); const [attachment,setAttachment]=useState<Attachment>();
  const [reference,setReference]=useState<Attachment>(); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const [design,setDesign]=useState(''); const end=useRef<HTMLDivElement>(null);
  useEffect(()=>{end.current?.scrollIntoView({block:'nearest'});},[messages,busy]);
  useEffect(()=>{try{const saved=JSON.parse(sessionStorage.getItem('alashi-chat-v2')||'null');if(saved?.messages?.length){setMessages(saved.messages.map((m:Message)=>({...m,text:m.text.replace(/\bALASHI\b/g,'HELPER')})));setContext(saved.context||'');setDesign(saved.design||'');}}catch{}setRestored(true);return()=>controller.current?.abort();},[]);
  useEffect(()=>{if(restored)try{sessionStorage.setItem('alashi-chat-v2',JSON.stringify({context,design,messages:messages.map(({attachment,image,...m})=>m)}));}catch{}},[context,design,messages,restored]);
  function clearChat(){generation.current++;controller.current?.abort();sending.current=false;setBusy(false);setGenerating(false);setContext('');setDesign('');setReference(undefined);setAttachment(undefined);setMessage('');setError('');setMessages([{role:'assistant',text:'Welcome to Corner Sofa. How can I help you today?'}]);sessionStorage.removeItem('alashi-chat-v2');}
  function saveChat(){const text=messages.map(m=>`${m.role==='assistant'?'HELPER':'You'}: ${m.text}${m.products?.map(p=>`\n${p.title}: ${money(p.price)} (VAT included)`).join('')||''}`).join('\n\n');const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='HELPER-conversation.txt';a.click();URL.revokeObjectURL(url);}
  async function upload(file?:File) {
    if (!file) return; if(file.size>5*1024*1024){setError('Please choose a file smaller than 5 MB.');return;}
    const reader=new FileReader(); reader.onload=()=>{setAttachment({name:file.name,data:String(reader.result)});setError('');}; reader.onerror=()=>setError('Could not read that file.'); reader.readAsDataURL(file);
  }
  async function send(productId?:string, sourceRequest?:string, sourceAttachment?:Attachment, suggestion?:string) {
    const text=suggestion || message.trim() || (productId?sourceRequest||design:'Please help me find a sofa based on this attachment.');
    if(sending.current || busy || (!suggestion && !message.trim() && !attachment && !productId))return;
    sending.current=true;const run=++generation.current;setGenerating(!!productId);
    const attached=attachment || (productId?sourceAttachment:undefined);
    controller.current=new AbortController();
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/alashi/',{method:'POST',signal:controller.current.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,attachment:attached,context,history:messages.slice(-12).map(m=>({role:m.role,text:m.text})),action:productId?'generate':'chat',productId})});
      const data=await readApiJson(response); if(!response.ok)throw new Error(data.error || 'Please try again.');
      if(run!==generation.current||controller.current?.signal.aborted)return;
      setContext(data.context||context);
      setMessages(current=>[...current,{role:'customer',text:productId?`Custom concept: ${text}`:text+(attached?`\nAttached: ${attached.name}`:'')},{role:'assistant',text:String(data.answer || '').replace(/\bALASHI\b/g,'HELPER'),products:data.products,image:data.image,request:text,attachment:attached,actions:data.actions,order:data.order}]);
      if(attached)setReference(attached);setDesign(text);setAttachment(undefined);setMessage('');
    }catch(e){if(run===generation.current)setError(e instanceof Error&&e.name==='AbortError'?'Request cancelled.':e instanceof Error?e.message:'Connection failed. Your conversation is saved; please retry or contact us on WhatsApp.');}finally{if(run===generation.current){sending.current=false;setBusy(false);setGenerating(false);}}
  }
  return <aside className={styles.widget} aria-label="HELPER sofa assistant">
    {!open?<button aria-label="Open HELPER sofa assistant" className={styles.launcher} onClick={()=>setOpen(true)}><Sofa size={25}/><span>HELPER<small>Your sofa assistant</small></span><Sparkles size={17}/></button>:<section className={styles.panel}>
      <header><span className={styles.mark}><Sofa/></span><div><strong>HELPER</strong><small>Corner Sofa · AI assistant</small></div><button aria-label="Minimise HELPER" onClick={()=>setOpen(false)}><Minus/></button></header>
      <div className={styles.contact}><button type="button" onClick={clearChat}>Clear chat</button><button type="button" onClick={saveChat}>Save chat</button></div>
      <div className={styles.intro}><span>✦ Your personal sofa assistant</span><h2>Find it. Imagine it. Make it yours.</h2></div><div className={styles.messages} role="log" aria-live="polite"><div className={styles.suggestions} role="group" aria-label="Suggested questions">{suggestedQuestions.map(question=><button key={question} type="button" disabled={busy} onClick={()=>send(undefined,undefined,undefined,question)}>{question}</button>)}</div>{messages.map((m,i)=><div key={i} className={m.role==='customer'?styles.customer:styles.assistant}><p style={{whiteSpace:'pre-line'}}>{m.text}</p>{m.actions?.includes('checkout')&&m.order&&<button onClick={()=>{const p=m.order!;addItem({productId:p.id,variantId:p.variantId,title:p.title,image:p.image,color:p.colour,range_type:p.range_type,price:p.price,offerToken:p.offerToken});window.location.href='/checkout/';}}>Continue to checkout ? {money(m.order.price)}</button>}{m.actions?.includes('appointment')&&<a className={styles.visit} href="/alashi-appointment/">Request a visit ↗</a>}{m.image&&<a href={m.image} download="alashi-sofa-concept.png"><img src={m.image} alt="HELPER custom sofa concept"/><small>Download concept image</small></a>}{m.products?.map(p=><article className={styles.product} key={p.id}><img src={p.image} alt={p.title}/><strong>{p.title}</strong><small>{p.description}</small><small>{p.category}{p.dimensions?` · ${p.dimensions.width} × ${p.dimensions.depth} × ${p.dimensions.height} cm`:''}</small><small>{p.colours.map(c=>`${c.colour}${c.available?'':' (check with us)'}`).join(', ')}</small><b>{money(p.price)} · VAT included</b>{p.materials&&<small>Material: {p.materials}</small>}{p.warranty&&<small>Warranty: {p.warranty}</small>}{p.colourNotes&&<small>{p.colourNotes}</small>}<small>{p.range?`${money(p.range.min)} – ${money(p.range.max)}`:'Price range: ask our team'}</small><a href={`/product/${encodeURIComponent(p.id)}/`}>View sofa ↗</a><details><summary>More photos</summary>{p.images?.slice(1).map((src,j)=><img key={j} src={src} alt={`${p.title} photo ${j+2}`}/>)}</details><button disabled={busy||!p.available||!p.offerToken} onClick={()=>{addItem({productId:p.id,variantId:p.variantId,title:p.title,image:p.image,color:p.colour,range_type:p.range_type,price:p.price,offerToken:p.offerToken});setError('Added to basket at the shown offer.');}}>Add to basket · {money(p.price)}</button><a href="/checkout/">Checkout / challan ↗</a><button disabled={busy} onClick={()=>send(p.id,m.request,m.image?{name:'previous-concept.png',data:m.image}:m.attachment)}><Sparkles size={14}/> Generate custom image</button></article>)}</div>)}{busy&&<p role="status">HELPER is typing…</p>}<div ref={end}/></div>
      <div className={styles.contact}><a href="https://wa.me/447456439050" target="_blank" rel="noreferrer">WhatsApp our team ↗</a><a href="https://mail.google.com/mail/?view=cm&amp;fs=1&amp;to=cornersofaonlineuk%40gmail.com" target="_blank" rel="noreferrer">Email us</a></div>
      <form onSubmit={e=>{e.preventDefault();send();}} className={styles.composer}>
        <div className={styles.uploads}><label><ImagePlus size={17}/> Add photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{upload(e.target.files?.[0]);e.target.value='';}} disabled={busy}/></label><label><FileText size={17}/> Add document<input type="file" accept=".pdf,.txt,.md,.csv" onChange={e=>{upload(e.target.files?.[0]);e.target.value='';}} disabled={busy}/></label></div>
        {attachment&&<div className={styles.file}>{attachment.name}<button type="button" aria-label="Remove attachment" onClick={()=>setAttachment(undefined)}><X size={14}/></button></div>}
        <small className={styles.hint}>JPG, PNG, WebP · PDF, TXT, MD, CSV · 5 MB. Files are sent to our AI provider when you send.</small>
        <div className={styles.entry}><textarea aria-label="Message HELPER" placeholder="Describe your ideal sofa…" maxLength={3000} value={message} onChange={e=>setMessage(e.target.value)} disabled={busy}/><button aria-label="Send to HELPER" disabled={busy||(!message.trim()&&!attachment)}><Send size={19}/></button></div>
        {busy&&<button type="button" className={styles.cancel} onClick={()=>controller.current?.abort()}>Cancel</button>}{error&&<p className={styles.error} role="alert">{error}</p>}
      </form>
    </section>}
  </aside>;
}
