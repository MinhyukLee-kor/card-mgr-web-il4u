import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// 구글 시트 클라이언트 설정
const getGoogleSheetClient = () => {
  try {
    console.log('Raw credentials:', process.env.GOOGLE_SHEETS_CREDENTIALS);
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS || '{}');
    
    // credentials가 비어있는지 확인
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('Google Sheets 인증 정보가 올바르지 않습니다.');
    }

    const client = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth: client });
  } catch (error) {
    console.error('Credentials parsing error:', process.env.GOOGLE_SHEETS_CREDENTIALS);
    console.error('Google Sheets 클라이언트 초기화 오류:', error);
    throw error;
  }
};

// 사용자 정보 조회
export const getUserByEmail = async (email: string) => {
  const sheets = getGoogleSheetClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용자!A2:E', // A2부터 E열까지 데이터 조회
    });

    const rows = response.data.values;
    if (!rows) return null;

    // 이메일로 사용자 찾기
    const user = rows.find(row => row[0] === email);
    if (!user) return null;

    return {
      email: user[0],
      name: user[1],
      password: user[2],
      role: user[3],
      isActive: user[4] === 'TRUE'
    };
  } catch (error) {
    console.error('구글 시트 조회 중 오류 발생:', error);
    throw error;
  }
};

// 모든 사용자 목록 조회
export const getAllUsers = async () => {
  const sheets = getGoogleSheetClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용자!A2:E',
    });

    const rows = response.data.values;
    if (!rows) return [];

    return rows
      .filter(row => row[4] === 'TRUE') // 활성 사용자만 필터링
      .map(row => ({
        email: row[0],
        name: row[1],
      }));
  } catch (error) {
    console.error('사용자 목록 조회 중 오류 발생:', error);
    throw error;
  }
};

// 사용 내역 등록
export const createExpense = async (expense: ExpenseForm, registrant: { email: string; name: string }) => {
  const sheets = getGoogleSheetClient();
  
  try {
    const id = Date.now().toString();
    const rows = expense.users.map(user => [
      expense.date,
      registrant.name,
      user.name,
      user.amount,
      expense.memo,
      id,
      registrant.email,
      user.email
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역!A2:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows
      },
    });

    return id;
  } catch (error) {
    console.error('사용 내역 등록 중 오류 발생:', error);
    throw error;
  }
}; 