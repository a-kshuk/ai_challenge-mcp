import { RagService } from "../ragService";

const rag = new RagService("nomic-embed-text");

const test = async () => {
  try {
    await rag.ingestPdf("./fnp.pdf");

    const results = await rag.search("Федеральные нормы и правила", 3);
    results.forEach((r) => {
      console.log(`[Схожесть: ${r.score.toFixed(4)}] ${r.text}`);
    });

    await rag.saveIndex("./data/rag-index.json");
  } catch (error) {
    console.error("Ошибка в тесте:", error);
  }
};

test();
