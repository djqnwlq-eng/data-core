import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// 텍스트 임베딩 생성 (의미 검색용)
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// 텍스트를 청크로 분할 (임베딩 생성 전처리)
export function splitIntoChunks(text: string, maxChunkSize = 500): string[] {
  const sentences = text.split(/(?<=[.!?\n])\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

// AI 매뉴얼 생성
export async function generateManual(
  topic: string,
  relatedContent: string[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `당신은 교육 기관의 CS(고객 서비스) 매뉴얼 작성 전문가입니다.
아래 관련 데이터를 기반으로 "${topic}" 주제에 대한 CS 매뉴얼을 작성해주세요.

관련 데이터:
${relatedContent.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}

매뉴얼 형식:
1. 주제 요약
2. 자주 묻는 질문 (FAQ)
3. 답변 가이드 (상황별 대응 방법)
4. 주의사항

한국어로 작성하고, 신입 직원도 바로 사용할 수 있도록 쉽고 친절하게 작성해주세요.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// AI 기반 답변 추천
export async function generateAnswer(
  question: string,
  context: string[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `당신은 교육 기관의 CS 담당자입니다.
교육생의 질문에 대해 아래 참고 자료를 기반으로 답변을 작성해주세요.

질문: ${question}

참고 자료:
${context.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}

친절하고 정확한 한국어로 답변해주세요. 참고 자료에 없는 내용은 추측하지 마세요.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
