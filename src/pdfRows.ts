export type PdfCell = { text: string; x: number; y: number; width: number };

const center = (cell: PdfCell) => cell.x + cell.width / 2;
const hasData = /\b(?:\d+(?:\.\d+)?\s*(?:GB|MB|TB)|Unlimited)\b/i;
const code = /^(?=.*\d)[A-Z][A-Z0-9]{5,17}$/;
const section = /^(?:Tablet|Smartwatch|Mobile Internet|Connected Car|Home Phone|Push[- ]to[- ]Talk|Lucky Mobile)\b/i;
const excludedSection = /^(?:Tablet|Smartwatch|Connected Car|Home Phone|Push[- ]to[- ]Talk|Lucky Mobile)\b/i;

/** Read plan codes from SOC table columns, not from discount or footnote codes. */
export function supportedCodesFromPage(cells: PdfCell[]): string[] {
  const socHeaders = cells.filter(cell => /^SOC(?: CODE)?$/i.test(cell.text));
  const dataHeaders = cells.filter(cell => /^Data$/i.test(cell.text));
  const sections = cells.filter(cell => section.test(cell.text));
  return cells.filter(cell => code.test(cell.text)).flatMap(cell => {
    const header = socHeaders
      .filter(item => item.y > cell.y && Math.abs(center(item) - center(cell)) < 28)
      .sort((a, b) => a.y - b.y)[0];
    if (!header) return [];
    const heading = sections.filter(item => item.y > cell.y)
      .sort((a, b) => a.y - b.y)[0];
    if (heading && excludedSection.test(heading.text)) return [];
    const dataHeader = dataHeaders.find(item => Math.abs(item.y - header.y) < 3);
    if (!dataHeader) return [];
    const rowData = cells.filter(item =>
      Math.abs(item.y - cell.y) < 3 &&
      Math.abs(center(item) - center(dataHeader)) < 46,
    ).map(item => item.text).join(' ');
    return hasData.test(rowData) ? [cell.text] : [];
  });
}
