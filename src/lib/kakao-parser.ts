// 카카오톡 내보내기 파서
// CSV 형식: Date,User,Message
// TXT 형식: [이름] [오후 3:42] 메시지

export interface ParsedMessage {
  sender: string;
  message: string;
  chatDate: Date | null;
}

export interface ParseResult {
  roomName: string;
  messages: ParsedMessage[];
}

// 파일 확장자에 따라 자동으로 파서 선택
export function parseKakaoChat(text: string, fileName: string): ParseResult {
  if (fileName.toLowerCase().endsWith('.csv')) {
    return parseCSV(text, fileName);
  }
  return parseTXT(text);
}

// CSV 형식 파싱 (Date,User,Message)
function parseCSV(text: string, fileName: string): ParseResult {
  // 파일명에서 채팅방 이름 추출
  // 형식: KakaoTalk_Chat_채팅방이름_날짜.csv
  let roomName = '알 수 없는 채팅방';
  const nameMatch = fileName.match(/KakaoTalk_Chat_(.+?)_\d{4}/);
  if (nameMatch) {
    roomName = nameMatch[1];
  }

  const messages: ParsedMessage[] = [];
  const lines = text.split('\n');

  // 첫 줄이 헤더인지 확인
  const firstLine = lines[0]?.trim() || '';
  const startIndex = firstLine.startsWith('Date') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    // CSV 파싱 (쌍따옴표 안에 쉼표가 있을 수 있음)
    const fields = parseCSVLine(line);
    if (fields.length < 3) continue;

    const dateStr = fields[0].trim();
    const sender = fields[1].trim();
    const message = fields.slice(2).join(',').trim();

    if (!sender || !message) continue;
    if (isSystemMessage(message)) continue;

    let chatDate: Date | null = null;
    if (dateStr) {
      chatDate = new Date(dateStr);
      if (isNaN(chatDate.getTime())) chatDate = null;
    }

    messages.push({ sender, message, chatDate });
  }

  return { roomName, messages };
}

// CSV 한 줄을 필드로 분리 (따옴표 처리)
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // 이스케이프된 따옴표
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

// TXT 형식 파싱 (기존 방식)
function parseTXT(text: string): ParseResult {
  const lines = text.split('\n');
  const messages: ParsedMessage[] = [];
  let roomName = '';

  const firstLine = lines[0]?.trim() || '';
  const roomMatch = firstLine.match(/(.+?)(?:\s*님과)?\s*카카오톡\s*대화/);
  if (roomMatch) {
    roomName = roomMatch[1].trim();
  } else {
    roomName = '알 수 없는 채팅방';
  }

  let currentDate = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const dateLineMatch = line.match(
      /-+\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*?-+/
    );
    if (dateLineMatch) {
      currentDate = `${dateLineMatch[1]}-${dateLineMatch[2].padStart(2, '0')}-${dateLineMatch[3].padStart(2, '0')}`;
      continue;
    }

    const format1 = line.match(
      /\[(.+?)\]\s*\[(오전|오후)\s*(\d{1,2}):(\d{2})\]\s*(.*)/
    );
    if (format1) {
      const sender = format1[1];
      const ampm = format1[2];
      let hour = parseInt(format1[3]);
      const minute = format1[4];
      const message = format1[5];

      if (ampm === '오후' && hour !== 12) hour += 12;
      if (ampm === '오전' && hour === 12) hour = 0;

      let chatDate: Date | null = null;
      if (currentDate) {
        chatDate = new Date(
          `${currentDate}T${String(hour).padStart(2, '0')}:${minute}:00`
        );
      }

      if (message && !isSystemMessage(message)) {
        messages.push({ sender, message, chatDate });
      }
      continue;
    }

    const format2 = line.match(
      /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(오전|오후)\s*(\d{1,2}):(\d{2}),\s*(.+?)\s*:\s*(.*)/
    );
    if (format2) {
      const year = format2[1];
      const month = format2[2].padStart(2, '0');
      const day = format2[3].padStart(2, '0');
      const ampm = format2[4];
      let hour = parseInt(format2[5]);
      const minute = format2[6];
      const sender = format2[7];
      const message = format2[8];

      if (ampm === '오후' && hour !== 12) hour += 12;
      if (ampm === '오전' && hour === 12) hour = 0;

      const chatDate = new Date(
        `${year}-${month}-${day}T${String(hour).padStart(2, '0')}:${minute}:00`
      );

      if (message && !isSystemMessage(message)) {
        messages.push({ sender, message, chatDate });
      }
      continue;
    }

    if (messages.length > 0 && !line.startsWith('-') && !line.startsWith('[')) {
      messages[messages.length - 1].message += '\n' + line;
    }
  }

  return { roomName, messages };
}

function isSystemMessage(message: string): boolean {
  const systemPatterns = [
    '님이 들어왔습니다',
    '님이 나갔습니다',
    '님을 초대했습니다',
    '채팅방을 나갔습니다',
    '사진',
    '동영상',
    '삭제된 메시지입니다',
  ];
  return systemPatterns.some((p) => message.trim() === p || message.includes(p + '.'));
}
