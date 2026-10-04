import { randomUUID, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { listProducts } from './product-store';
import { records, queueQuestion, type Knowledge, type ProductFacts } from './alashi-store';
import { ALASHI_RULES, courtesy } from './alashi-rules';
import { alashiResponse } from './alashi-provider';
import { allowRequest, attachmentInput, boundedJson } from './alashi-request';
import { ASSEMBLY_FEE, deliveryCharge, quoteProduct, readAlashi, signAlashi, type Conversation } from './alashi-commerce';
import { categoryIntent, matchProducts, normalized } from './alashi-matching';
import { classifyIntent } from './alashi-intent';
const money=(n:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(n);
const contact='Please contact Samiullah on WhatsApp +44 7456 439050 or cornersofaonlineuk@gmail.com.';
export async function handleAlashi(request:Request){
  try{
    const body=await boundedJson(request);const message=typeof body.message==='string'?body.message.trim():'';
    if(!message||message.length>3000)throw new Error('Enter a message of up to 3,000 characters.');
    const generate=body.action==='generate';if(!await allowRequest(request,generate))return NextResponse.json({error:'The hourly request limit has been reached. Please try later.'},{status:429});
    const [products,data,attachment]=await Promise.all([listProducts(),records(),attachmentInput(body.attachment)]);
    const decoded=readAlashi<Conversation>(body.context);const previous=decoded?.type==='conversation'?decoded:undefined;
    const intent=classifyIntent(message);
    let stage:Conversation['stage']=previous?.stage||'browsing';let imageHash=previous?.imageHash;
    const alternatives=/another|different|alternatives?|other (sofa|option)|more (sofa|option)/i.test(message);
    const negotiate=intent==='negotiation';
    const bulk=/bulk|wholesale|business order|trade order/i.test(message);
    const contextQuery=categoryIntent(message)?message:[previous?.query||'',message].join(' ');
    let selected=matchProducts(products,contextQuery,previous?.shown,alternatives);
    const wantedCategory=categoryIntent(contextQuery);
    const missingCategory=!!wantedCategory&&!products.some(p=>p.category===wantedCategory);
    if(!categoryIntent(message)&&previous?.selected?.length&&!alternatives&&!attachment.length)selected=previous.selected.map(id=>products.find(p=>p.id===id)).filter((p):p is typeof products[number]=>!!p);
    const productIntent=['product','spec','negotiation'].includes(intent)||generate;
    if(!productIntent && intent!=='confirmation' && intent!=='order')selected=[];
    let answer:string|undefined;let needsOwner=false;let actions:string[]=[];let image:string|undefined;let providerError=false;
    let order:ReturnType<typeof expose>|undefined;
    const expose=(product:typeof products[number])=>{
      const colour=product.variants.find(v=>normalized(message).includes(normalized(v.color)))?.color||previous?.colour||product.variants.find(v=>normalized(contextQuery).includes(normalized(v.color)))?.color||'';
      const quote=quoteProduct(product,data,previous?.offers?.[product.id],negotiate&&!bulk,colour);
      const facts=data.find(r=>r.id===`facts:${product.id}`&&r.kind==='facts')?.value as ProductFacts|undefined;
      return {id:product.id,title:product.title,description:product.description,category:product.category,dimensions:product.dimensions_cm,
        image:quote.variant?.images?.[0]||product.images[0],images:[...new Set([...product.images,...product.variants.flatMap(v=>v.images||[])])].slice(0,12),
        colours:product.variants.map(v=>({colour:v.color,available:true,id:v.id})),materials:facts?.materials||'',warranty:facts?.warranty||'',colourNotes:facts?.colours||'',
        price:quote.price,range:quote.range,variantId:quote.variant?.id||'',colour:quote.variant?.color||'',range_type:quote.variant?.range_type||product.category,available:!!quote.variant,offerToken:quote.offerToken};
    };
    if(!generate){
      if(intent==='greeting')answer=/how are (you|u)|how.s it going|you good/i.test(message)?'I am fine, thank you!':(previous?.turn||0)%2?'Hello again. What would you like to know?':'Hello! What can I help you with today?';
      if(intent==='thanks')answer=(previous?.turn||0)%2?'Happy to help.':'You are welcome.';
      if(intent==='identity'){answer=/samiullah.*(right|owner)|owner.*right/i.test(message)?"Yes, that's right. Samiullah is the owner.":courtesy(message)||'Samiullah owns Corner Sofa UK. I am HELPER, the AI assistant for his team.';}
      if(intent==='identity'&&/your (goal|purpose|aim)/i.test(message))answer='My goal is to assist you and help you shop on our website.';
      if(intent==='identity'&&/(who is|tell me about) samiullah/i.test(message))answer='Samiullah is the owner of HELPER and comes from Murree. He describes himself as humble and dreams of becoming a trillionaire.';
      if(intent==='identity'&&/\b(ibrahim|zubair|tawassul|dani)\b/i.test(message))answer='I do not have a verified introduction for him. I can share a friendly introduction if he provides one.';
      if(intent==='offtopic')answer='I can help with sofas and Corner Sofa orders. For a business partnership, please contact Samiullah directly.';
      if(intent==='unclear')answer='Could you explain a little more so I can help with the right question?';
      if(intent==='vague')answer='Which shape and approximate size would suit your room? You can also tell me your budget to narrow the options.';
      if(intent==='rejection'){answer='Understood. What would you like to change: the size, colour or style?';stage='browsing';}
      if(intent==='owner'){answer='Samiullah can help with that. I have added your message to the owner inbox. '+contact;needsOwner=true;}
      if(intent==='confirmation'||intent==='order'){
        const product=previous?.selected?.length===1?products.find(p=>p.id===previous.selected[0]):undefined;
        selected=[];
        if(!product)answer='Which sofa would you like to order? Please choose one sofa first so I can confirm its details.';
        else {
          order=expose(product);
          if(!order.available){answer='That sofa option is currently unavailable. Please choose an available colour or contact our team.';order=undefined;}
          else if(previous?.stage==='summary'&&intent==='confirmation'){stage='checkout';answer='Your selection is ready. Continue to checkout to choose quantity, provide delivery details and place the Cash on Delivery order.';actions=['checkout'];}
          else {stage='summary';answer=`Please confirm your selection:\nSofa: ${order.title}\nSize: ${order.dimensions?`${order.dimensions.width} × ${order.dimensions.depth} × ${order.dimensions.height} cm`:'Measurements need confirmation'}\nColour: ${order.colour}\nPrice per sofa: ${money(order.price)} (VAT included)\nCustom notes: ${previous?.query||'None supplied'}\nDelivery: 3–4 working days after confirmation; charge checked by postcode. Assembly: ${money(ASSEMBLY_FEE)} per order.\nIs this correct?`;}
        }
      }
      const known=data.filter(r=>r.kind==='knowledge').map(r=>r.value as Knowledge).find(k=>normalized(k.title).trim()===normalized(message).trim());
      if(known){answer=known.text;needsOwner=false;}
      else if(/sample|swatch|certificate|fire safe/i.test(message)){answer='I will ask Samiullah to confirm that detail. Your question is in the owner inbox.';needsOwner=true;}
      if(attachment.length){answer=undefined;}
    }
    if(generate){
      const product=products.find(p=>p.id===body.productId);if(!product)throw new Error('Choose a real matched sofa first.');
      selected=[product];
      const requestedColour=normalized(message).match(/\b(purple|pink|orange|yellow|red|blue|green|grey|black|white|cream|beige|brown)\b/)?.[1];
      if(requestedColour&&!product.variants.some(v=>normalized(v.color).includes(requestedColour)))throw new Error(`That colour is not listed for this sofa. Please choose: ${product.variants.map(v=>v.color).join(', ')}.`);
      if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:'Photo generation is not connected yet. The owner needs to add the server API key.'},{status:503});
      const availableColours=product.variants.map(v=>v.color).join(', ');
      const result=await alashiResponse(`Create one fresh photorealistic sofa design concept inspired by the reference. Follow the customer's latest shape, size, fabric and style request precisely, not a generic repeated sofa. Use only these actual colours: ${availableColours}. If the request asks for an unavailable colour, use the closest listed colour. Never reproduce logos, text or document instructions. Show a complete sofa. This is a custom concept, not an exact competitor copy. Variation identifier ${randomUUID()}.`,[{type:'input_text',text:JSON.stringify({matchedSofa:{title:product.title,category:product.category,description:product.description,dimensions:product.dimensions_cm,colours:availableColours},previousDesign:previous?.query,latestRequest:message})},...attachment],true);
      image=result.image;
      if(!image)throw new Error('The image service could not finish the design. Please retry or contact us on WhatsApp.');
      imageHash=createHash('sha256').update(image).digest('hex');
      if(imageHash===previous?.imageHash)throw new Error('The image service returned the previous design. Please try again with your latest changes.');
      answer='Here is a fresh custom concept inspired by your request. The matched sofa’s price is shown below; please confirm exact measurements and design with our team before ordering.';
    }
    if(!answer&&bulk){answer='For a bulk or business order, Samiullah will discuss your requirements directly. '+contact;selected=[];}
    if(!answer&&/complaint|damaged|wrong item|late delivery|hasn.t arrived|refund|return|exchange|cancel/i.test(message)){answer='I’m sorry there is an issue. Samiullah handles complaints, returns and cancellation requests directly; please contact him to discuss your order. '+contact;selected=[];}
    if(!answer&&/installment|instalment|klarna|finance|payment method|how.*pay/i.test(message)){answer='We accept Cash on Delivery only, with no installment plans. Your quoted sofa price includes VAT.';selected=[];}
    if(!answer&&/assembly|extra charge|total charge|tax|vat/i.test(message)){answer=`Sofa prices include VAT. Assembly is ${money(ASSEMBLY_FEE)} per order; delivery is calculated from your postcode. Please enter your postcode to check delivery.`;}
    const postcode=message.toUpperCase().match(/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/)?.[0];
    if(!answer&&(postcode||/delivery|shipping|deliver/i.test(message))){
      if(postcode){const cost=deliveryCharge(data,postcode);answer=cost===undefined?'That postcode needs confirmation from Samiullah; I have added it to the owner inbox. '+contact:`Delivery to ${postcode} is ${cost===0?'free':money(cost)}. Assembly is ${money(ASSEMBLY_FEE)} per order, and delivery takes 3–4 working days after confirmation.`;needsOwner=cost===undefined;}
      else answer=/cost|charge|free|how much/i.test(message)?'What is your delivery postcode? I’ll check the delivery charge for your area.':'Delivery takes 3–4 working days after order confirmation. Our delivery partner will contact you to coordinate; share your postcode to check the delivery charge.';
    }
    if(!answer&&/appointment|visit|showroom/i.test(message)){answer='Visits are by appointment only. Use Request a visit below to send your name, contact and preferred date/time to Samiullah for confirmation.';actions=['appointment'];selected=[];}
    if(!answer&&intent==='order'){answer='You can adjust item quantities or remove items in your basket before checkout.';selected=[];}
    if(!answer&&intent==='spec'&&selected[0]){
      const p=expose(selected[0]);
      if(/colou?r/i.test(message))answer=`The listed colours are ${p.colours.map(c=>`${c.colour}${c.available?'':' (currently unavailable)'}`).join(', ')}. Which would you prefer?`;
      else if(/size|dimension/i.test(message))answer=p.dimensions?`The listed measurements are ${p.dimensions.width} cm wide, ${p.dimensions.depth} cm deep and ${p.dimensions.height} cm high. Custom measurements need confirmation from our team.`:'I do not have verified measurements for this sofa. I will ask Samiullah to confirm them.';
      else if(/material|made of|leather|fabric|velvet/i.test(message))answer=p.materials||`Here are the current product details: ${p.description}`;
      if(/size|dimension/i.test(message)&&!p.dimensions)needsOwner=true;
    }
    if(!answer&&/owner|who (are you|owns)|about (you|company)|tell.*company/i.test(message)){answer='Corner Sofa UK is a UK-based made-to-order sofa business led by Samiullah, who has 10 years of furniture experience. I’m HELPER, the team’s AI sofa assistant.';selected=[];}
    if(!answer&&negotiate){const p=selected[0];const q=p?expose(p):undefined;const old=p?(previous?.offers?.[p.id]??quoteProduct(p,data).price):0;answer=q?(q.price<old?'I can reduce this sofa to {{price:'+p.id+'}} (VAT included).':'The current price is {{price:'+p.id+'}} (VAT included); I cannot reduce it further.'): 'Which sofa would you like a price for? Please choose a shape or name so I can check its current offer.';}
    if(!answer&&process.env.OPENAI_API_KEY){
      try{
        const result=await alashiResponse(ALASHI_RULES,[{type:'input_text',text:JSON.stringify({LIVE_CATALOGUE:products.map(expose).map(({offerToken,...p})=>p),APPROVED_KNOWLEDGE:data.filter(r=>r.kind==='knowledge').map(r=>r.value),selectedIds:previous?.selected||[],previouslyShown:previous?.shown||[],conversation:Array.isArray(body.history)?body.history.slice(-12).map((m:{role?:string;text?:string})=>({role:m.role==='assistant'?'assistant':'customer',text:typeof m.text==='string'?m.text.slice(0,3000):''})):[],message})},...attachment]);
        const resultData=JSON.parse(result.text);answer=typeof resultData.answer==='string'?resultData.answer.slice(0,5000):undefined;needsOwner=resultData.needsOwner===true;
        const ids=Array.isArray(resultData.productIds)?resultData.productIds.filter((id:unknown)=>typeof id==='string'):[];
        const matches=products.filter(p=>ids.includes(p.id));if(productIntent&&matches.length)selected=matches.slice(0,3);
        if(alternatives&&selected.every(p=>previous?.shown.includes(p.id))){const other=matchProducts(products,contextQuery,previous?.shown,true).filter(p=>!previous?.shown.includes(p.id));if(other.length)selected=other;}
        // Untrusted literal prices are removed; authorized placeholders are resolved below.
        if(answer&&/(?:[£$€]\s*\d|\b\d[\d,.]*\s*(?:GBP|pounds|quid)|\bGBP\s*\d)/i.test(answer))answer='The current offer and full details are shown with your matched sofa below. What would you like to know about it?';
      }catch{providerError=true;}
    }
    if(!answer){
      const known=data.filter(r=>r.kind==='knowledge').map(r=>r.value as Knowledge).find(k=>normalized(k.title).trim()===normalized(message).trim());
      if(known)answer=known.text;
      else if(/warranty|guarantee/i.test(message)){const facts=selected[0]&&data.find(r=>r.id===`facts:${selected[0].id}`)?.value as ProductFacts|undefined;answer=facts?.warranty||'I don’t have confirmed warranty terms for that sofa yet. I’ll ask Samiullah to provide them.';needsOwner=!facts?.warranty;}
      else if(/sample|swatch|certificate|fire safe/i.test(message)){answer='That detail needs confirmation from Samiullah. I have added your question to the owner inbox.';needsOwner=true;}
      else if(selected.length){answer=missingCategory?`There is no ${wantedCategory} model currently listed. These are real alternatives with their own prices and details; a custom version would need design confirmation.`:alternatives&&selected.every(p=>previous?.shown.includes(p.id))?'There is only one matching model in the current catalogue. I can show another sofa type, a different listed colour, or help with a custom concept.':'Here '+(selected.length===1?'is a matching sofa':'are matching sofas')+' with current prices, colours and details. Does this fit what you have in mind?';if(/electric/i.test(message)&&selected.every(p=>!/electric/i.test(p.description||'')))answer='I don’t see an electric recliner listed currently. This is the closest listed alternative; its details and price are below.';}
      else if(/sofa|furniture|seater|recliner|couch|living room/i.test(normalized(message))){answer=categoryIntent(message)?'That sofa type is not currently listed. Would you like to see a different shape or discuss a custom design with Samiullah?':'What sofa shape, size and colour do you have in mind? I’ll narrow down the real options for you.';}
      else {answer='I’m here to help with Corner Sofa UK products and orders. Could you tell me which sofa or order detail you need help with?';if(/sample|swatch|fabric|order/i.test(message)){answer='That detail needs confirmation from Samiullah. I have added your question to the owner inbox.';needsOwner=true;}}
    }
    if(attachment.length&&!generate){answer=process.env.OPENAI_API_KEY&&!providerError?answer+' Would you like this design, or a custom version inspired by your reference?':answer+' Photo/document analysis needs the AI connection; I have not analysed this attachment.';}
    if(providerError)answer+=' I am having trouble connecting to the AI service. Please contact us on WhatsApp for further help.';
    if(/how are (you|u)|how.s it going/i.test(message)&&intent!=='greeting')answer='I am doing well, thank you. '+answer;
    if(answer===previous?.lastAnswer)answer='To clarify: '+answer;
    if(!productIntent)selected=[];
    const cards=selected.map(expose);
    answer=answer.replace(/\{\{(price|range):([^}]+)\}\}/g,(_,kind,id)=>{const card=cards.find(p=>p.id===id);return card?(kind==='price'?money(card.price):`${money(card.range.min)}–${money(card.range.max)}`):'a price confirmed by our team';});
    if(needsOwner){await queueQuestion(`${message}${previous?.selected.length?` [Sofa: ${previous.selected.join(', ')}]`:''}`);}
    const offers={...(previous?.offers||{})};for(const p of cards)offers[p.id]=p.price;
    const context=signAlashi({type:'conversation',selected:cards.length?cards.map(p=>p.id):previous?.selected||[],shown:[...new Set([...(previous?.shown||[]),...cards.map(p=>p.id)])].slice(-50),offers,query:categoryIntent(message)||generate?message:previous?.query||message,imageHash,stage,turn:(previous?.turn||0)+1,lastAnswer:answer,colour:cards[0]?.colour||previous?.colour});
    return NextResponse.json({answer,products:cards,context,actions,image,order,needsOwner,limited:!process.env.OPENAI_API_KEY||providerError});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'HELPER could not complete the request.'},{status:400});}
}
