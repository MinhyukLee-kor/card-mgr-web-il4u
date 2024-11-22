import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { ExpenseForm, ExpenseShare } from '@/types/expense';
import { v4 as uuidv4 } from 'uuid';

// 구글 시트 클라이언트 설정
const getGoogleSheetClient = () => {
  try {
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
    // 각 사용자별로 고유한 ID 생성
    const rows = expense.users.map((user: ExpenseShare) => {
      const id = uuidv4();  // 각 행마다 새로운 UUID 생성
      return [
        expense.date,
        registrant.name,
        user.name,
        user.amount,
        expense.memo,
        id,          // 각각 다른 UUID 사용
        registrant.email,
        user.email
      ];
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역!A2:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows
      },
    });

    return rows[0][5]; // 첫 번째 ID 반환 (참조용)
  } catch (error) {
    console.error('사용 내역 등록 중 오류 발생:', error);
    throw error;
  }
};

// 사용 내역 조회
export const getExpenses = async (email: string, startDate?: string, endDate?: string) => {
  const sheets = getGoogleSheetClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역!A2:H',
    });

    const rows = response.data.values;
    if (!rows) return [];

    // 날짜 필터링을 위한 시작일과 종료일
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    // 이메일과 관련된 내역만 필터링 (등록자 또는 사용자)
    return rows
      .filter(row => {
        const rowDate = new Date(row[0]);
        return (
          (row[6] === email || row[7] === email) && // 등록자이메일 또는 사용자이메일 확인
          rowDate >= start &&
          rowDate <= end
        );
      })
      .map(row => ({
        id: row[5],
        date: row[0],
        registrant: {
          name: row[1],
          email: row[6]
        },
        user: {
          name: row[2],
          email: row[7]
        },
        amount: parseInt(row[3]),
        memo: row[4]
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // 날짜 기준 내림차순 정렬
  } catch (error) {
    console.error('사용 내역 조회 중 오류 발생:', error);
    throw error;
  }
};

// 사용 내역 수정
export const updateExpense = async (id: string, expense: ExpenseForm, registrant: { email: string; name: string }) => {
  const sheets = getGoogleSheetClient();
  
  try {
    // 기존 데이터 삭제
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역!A2:H',
    });

    const rows = response.data.values;
    if (!rows) throw new Error('데이터를 찾을 수 없습니다.');

    // 해당 ID의 행 찾기
    const rowIndexes = rows.reduce((acc: number[], row, index) => {
      if (row[5] === id) acc.push(index + 2); // +2는 헤더와 0-based index 보정
      return acc;
    }, []);

    if (rowIndexes.length === 0) throw new Error('수정할 데이터를 찾을 수 없습니다.');

    // 기존 데이터 삭제
    for (const rowIndex of rowIndexes) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.SHEET_ID,
        range: `사용내역!A${rowIndex}:H${rowIndex}`,
      });
    }

    // 새 데이터 추가
    const newRows = expense.users.map(user => [
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
        values: newRows
      },
    });

    return id;
  } catch (error) {
    console.error('사용 내역 수정 중 오류 발생:', error);
    throw error;
  }
};

// 사용 내역 삭제
export const deleteExpense = async (id: string) => {
  const sheets = getGoogleSheetClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역!A2:H',
    });

    const rows = response.data.values;
    if (!rows) throw new Error('데이터를 찾을 수 없습니다.');

    // 해당 ID의 행 찾기
    const rowIndexes = rows.reduce((acc: number[], row, index) => {
      if (row[5] === id) acc.push(index + 2);
      return acc;
    }, []);

    if (rowIndexes.length === 0) throw new Error('삭제할 데이터를 찾을 수 없습니다.');

    // 데이터 삭제
    for (const rowIndex of rowIndexes) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.SHEET_ID,
        range: `사용내역!A${rowIndex}:H${rowIndex}`,
      });
    }

    return true;
  } catch (error) {
    console.error('사용 내역 삭제 중 오류 발생:', error);
    throw error;
  }
};

// 단일 사용 내역 조회
export const getExpenseById = async (id: string) => {
  const sheets = getGoogleSheetClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역!A2:H',
    });

    const rows = response.data.values;
    if (!rows) return null;

    // ID로 관련 행들 찾기
    const expenseRows = rows.filter(row => row[5] === id);
    if (expenseRows.length === 0) return null;

    // 첫 번째 행에서 공통 정보 추출
    const firstRow = expenseRows[0];
    
    return {
      id: firstRow[5],
      date: firstRow[0],
      registrant: {
        name: firstRow[1],
        email: firstRow[6]
      },
      users: expenseRows.map(row => ({
        name: row[2],
        email: row[7],
        amount: parseInt(row[3])
      })),
      memo: firstRow[4]
    };
  } catch (error) {
    console.error('사용 내역 조회 중 오류 발생:', error);
    throw error;
  }
}; 