import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { supportedCodesFromPage } from '../src/pdfRows.ts';
import { offerLineOnePrice, offerMatchesLead, offerSourceGroup } from '../src/domain.ts';

test('reads an unfamiliar data plan code and rejects Basic and tablet rows', async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const draw = (value, x, y) => page.drawText(value, { x, y, size: 10, font });
  draw('Bell Consumer Rate Plans', 30, 750);
  draw('Plan', 90, 690); draw('Data', 200, 690); draw('SOC', 300, 690);
  draw('BYOD Select', 90, 660); draw('80GB', 200, 660); draw('ZZAB98765', 292, 660);
  draw('Basic Talk and Text', 90, 635); draw('-', 200, 635); draw('ZZAB98766', 292, 635);
  draw('Tablet', 30, 580);
  draw('Plan', 90, 552); draw('Data', 200, 552); draw('SOC', 300, 552);
  draw('Tablet data', 90, 525); draw('20GB', 200, 525); draw('ZZTAB123', 292, 525);
  const bytes = await pdf.save();
  const document = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const content = await (await document.getPage(1)).getTextContent();
  const cells = content.items.filter(item => 'str' in item && item.str.trim()).map(item => ({
    text: item.str.trim(), x: item.transform[4], y: item.transform[5], width: item.width,
  }));
  assert.deepEqual(supportedCodesFromPage(cells), ['ZZAB98765']);
});

test('date revisions of the same named sheet keep one source group', () => {
  assert.equal(
    offerSourceGroup('BestBuy Express - ON - Rate Plans 9-18-26.pdf'),
    offerSourceGroup('BestBuy Express - ON - Rate Plans 10-03-26.pdf'),
  );
});

test('heat insight displays the Line 1 net price without stacking AutoPay or XSell', () => {
  assert.equal(
    offerLineOnePrice({ pricing: 'Gross $75; Line 1 net price: $65 (AutoPay included); XSell $55; Line 2 $45' }),
    '$65/mo',
  );
  assert.equal(offerLineOnePrice({ pricing: 'XSell $50; Line 2 $40' }), null);
});

test('a lead interested in both brands can match either brand offer', () => {
  const lead = { brand: 'both', services: ['byod'], customer_type: ['consumer'], transcript: '' };
  const offer = { title: 'BYOD 80GB', description: '80GB data plan', services: ['byod'], customer_segments: [], valid_until: '' };
  assert.equal(offerMatchesLead({ ...offer, brand: 'bell' }, lead), true);
  assert.equal(offerMatchesLead({ ...offer, brand: 'virgin' }, lead), true);
  assert.equal(offerMatchesLead({ ...offer, brand: 'both' }, lead), true);
  assert.equal(offerMatchesLead({ ...offer, brand: 'virgin' }, { ...lead, brand: 'bell' }), false);
});
