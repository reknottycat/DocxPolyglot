import JSZip from 'jszip';
import { translateBatch } from './ai';
import { TranslationProgress, APIConfig } from '../types';

const BATCH_SIZE = 40; // Slightly smaller batch for better third-party compatibility
const FONT_NAME = "Times New Roman";

export const translateDocx = async (
  file: File,
  targetLanguage: string,
  apiConfig: APIConfig,
  onProgress: (progress: TranslationProgress) => void
): Promise<{ blob: Blob, totalTokens: number }> => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);

  const documentXmlFile = loadedZip.file("word/document.xml");
  if (!documentXmlFile) throw new Error("Invalid .docx");

  const contentXml = await documentXmlFile.async("string");
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(contentXml, "application/xml");
  const wNS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

  // Force Times New Roman
  const runs = Array.from(xmlDoc.getElementsByTagName("w:r"));
  runs.forEach(run => {
    let rPr = run.getElementsByTagName("w:rPr")[0];
    if (!rPr) {
      rPr = xmlDoc.createElementNS(wNS, "w:rPr");
      run.insertBefore(rPr, run.firstChild);
    }
    let rFonts = rPr.getElementsByTagName("w:rFonts")[0];
    if (!rFonts) {
      rFonts = xmlDoc.createElementNS(wNS, "w:rFonts");
      rPr.appendChild(rFonts);
    }
    rFonts.setAttribute("w:ascii", FONT_NAME);
    rFonts.setAttribute("w:hAnsi", FONT_NAME);
    rFonts.setAttribute("w:eastAsia", FONT_NAME);
    rFonts.setAttribute("w:cs", FONT_NAME);
  });

  const textNodes = Array.from(xmlDoc.getElementsByTagName("w:t"));
  const activeNodes: Element[] = [];
  const originalTexts: string[] = [];

  textNodes.forEach(node => {
    const text = node.textContent;
    if (text && text.trim().length > 0) {
      activeNodes.push(node);
      originalTexts.push(text);
    }
  });

  const totalSegments = activeNodes.length;
  let translatedCount = 0;
  let totalTokens = 0;

  for (let i = 0; i < totalSegments; i += BATCH_SIZE) {
    const batchNodes = activeNodes.slice(i, i + BATCH_SIZE);
    const batchTexts = originalTexts.slice(i, i + BATCH_SIZE);

    onProgress({
      totalSegments,
      translatedSegments: translatedCount,
      currentAction: `Translating (${i + 1}/${totalSegments})...`
    });

    const { items, tokens } = await translateBatch(batchTexts, targetLanguage, apiConfig);
    totalTokens += tokens;

    batchNodes.forEach((node, index) => {
      if (items[index] !== undefined) node.textContent = items[index];
    });

    translatedCount += batchNodes.length;
    await new Promise(r => setTimeout(r, 100));
  }

  onProgress({ totalSegments, translatedSegments: totalSegments, currentAction: "Finalizing..." });

  const serializer = new XMLSerializer();
  loadedZip.file("word/document.xml", serializer.serializeToString(xmlDoc));

  return {
    blob: await loadedZip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }),
    totalTokens
  };
};