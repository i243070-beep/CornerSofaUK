const { chromium, expect } = require('@playwright/test');
const sharp = require('sharp');
let browser;
(async () => {
  browser = await chromium.launch({channel:'chrome',headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  const fixture = await sharp({create:{width:300,height:180,channels:4,background:{r:90,g:110,b:80,alpha:1}}}).png().toBuffer();
  let requested;
  // Isolate image preparation; verify that the selected sofa and colour reach the existing API.
  await page.route('**/api/room-planner/sofa/**', async route => { requested = new URL(route.request().url()); await route.fulfill({status:200,contentType:'image/png',body:fixture}); });
  await page.goto('http://localhost:3100/',{waitUntil:'networkidle'});
  const card = page.locator('.featured-grid article').first();
  await card.scrollIntoViewIfNeeded();
  const before = await card.getByRole('link',{name:'View sofa',exact:true}).getAttribute('href');
  await card.getByRole('group').getByRole('button').nth(1).click();
  const after = await card.getByRole('link',{name:'View sofa',exact:true}).getAttribute('href');
  if(before===after)throw Error('Colour did not change');
  const url = new URL(after,'http://localhost:3100');
  await card.getByRole('button',{name:/Try .* in your room/}).click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await modal.getByLabel('Upload room photo',{exact:true}).setInputFiles('public/images/sofas/blue-corner-room-hero.webp');
  await expect(modal.getByAltText(/front view against the marked wall/)).toBeVisible({timeout:30000});
  await expect(modal.getByRole('heading',{name:'Choose your sofa.',exact:true})).toHaveCount(0);
  if(requested.searchParams.get('variant')!==url.searchParams.get('variant') || !url.pathname.includes(requested.searchParams.get('product')))throw Error('Wrong sofa or colour');
  await page.screenshot({path:'artifacts/selected-sofa-room.png'});
  await page.getByRole('button',{name:'Close room preview'}).click();
  await expect(modal).toHaveCount(0);
  for(const width of [1440,768,390,320]) {await page.setViewportSize({width,height:1000});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Overflow '+width);}
  console.log('PASS: colour swap and in-place room preview preserve the selected product and variant; responsive cards.');
  await browser.close();
})().catch(async error=>{console.error(error);await browser?.close();process.exit(1)});
