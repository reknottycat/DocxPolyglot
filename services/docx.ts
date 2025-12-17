import JSZip from 'jszip';
import { translateBatch } from './gemini';
import { TranslationProgress } from '../types';

// Batch size for translation requests
const BATCH_SIZE = 50;

/**
 * Main function to handle the docx translation process.
 * Returns the translated blob and total token usage.
 */
export const translateDocx = async (
  file: File,
  targetLanguage: string,
  onProgress: (progress: TranslationProgress) => void
): Promise<{ blob: Blob, totalTokens: number }> => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);

  // The main content of a .docx file usually lives in word/document.xml
  const documentXmlFile = loadedZip.file("word/document.xml");
  if (!documentXmlFile) {
    throw new Error("Invalid .docx file: word/document.xml not found.");
  }

  const contentXml = await documentXmlFile.async("string");
  
  // Parse XML
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(contentXml, "application/xml");
  const errorNode = xmlDoc.querySelector("parsererror");
  if (errorNode) {
    throw new Error("Error parsing XML content of the document.");
  }

  // Find all text nodes (<w:t>)
  const textNodes = Array.from(xmlDoc.getElementsByTagName("w:t"));
  
  // Filter nodes that actually have content to translate
  const activeNodes: Element[] = [];
  const originalTexts: string[] = [];

  for (const node of textNodes) {
    const text = node.textContent;
    if (text && text.trim().length > 0) {
      activeNodes.push(node);
      originalTexts.push(text);
    }
  }

  const totalSegments = activeNodes.length;
  let translatedCount = 0;
  let totalTokens = 0;

  // Process in batches
  for (let i = 0; i < totalSegments; i += BATCH_SIZE) {
    const batchNodes = activeNodes.slice(i, i + BATCH_SIZE);
    const batchTexts = originalTexts.slice(i, i + BATCH_SIZE);

    onProgress({
      totalSegments,
      translatedSegments: translatedCount,
      currentAction: `Translating segments ${i + 1} to ${Math.min(i + BATCH_SIZE, totalSegments)}...`
    });

    const { items: translatedBatch, tokens } = await translateBatch(batchTexts, targetLanguage);
    totalTokens += tokens;

    // Update the XML DOM with translated text
    batchNodes.forEach((node, index) => {
      // Use textContent to safely escape XML entities
      if (translatedBatch[index] !== undefined) {
         node.textContent = translatedBatch[index];
      }
    });

    translatedCount += batchNodes.length;
    
    // Small delay to be nice to the event loop
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  onProgress({
    totalSegments,
    translatedSegments: totalSegments,
    currentAction: "Rebuilding document structure..."
  });

  // Serialize back to XML string
  const serializer = new XMLSerializer();
  const newContentXml = serializer.serializeToString(xmlDoc);

  // Update the file in the zip
  loadedZip.file("word/document.xml", newContentXml);

  // Generate new blob
  const outputBlob = await loadedZip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });

  return { blob: outputBlob, totalTokens };
};