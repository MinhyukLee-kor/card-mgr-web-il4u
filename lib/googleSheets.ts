import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { ExpenseForm } from '@/types/expense';
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
      .filter(row => 
        // 빈 행 제외
        row.length >= 2 && 
        // 이메일과 이름이 있는 행만
        row[0]?.trim() && 
        row[1]?.trim() && 
        // 활성 사용자만 (isActive가 TRUE인 경우)
        (row[4] === 'TRUE' || row[4] === true)
      )
      .map(row => ({
        email: row[0],
        name: row[1],
      }));
  } catch (error) {
    console.error('사용자 목록 조회 중 오류 발생:', error);
    throw error;
  }
};

// 사용 내역 등록 (마스터/디테일)
export const createExpense = async (expense: ExpenseForm, registrant: { email: string; name: string }) => {
  const sheets = getGoogleSheetClient();
  
  try {
    const id = uuidv4();
    const totalAmount = expense.users.reduce((sum, user) => sum + user.amount, 0);

    // 마스터 데이터 등록
    const masterRow = [
      id,
      expense.date,
      registrant.name,
      totalAmount,
      expense.memo,
      registrant.email,
      expense.isCardUsage ? 'TRUE' : 'FALSE'
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역마스터!A2:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [masterRow]
      },
    });

    // 디테일 데이터 등록
    const detailRows = expense.users.map(user => [
      id,
      user.name,
      user.amount
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2:C',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: detailRows
      },
    });

    return id;
  } catch (error) {
    console.error('사용 내역 등록 중 오류 발생:', error);
    throw error;
  }
};

// 사용 내역 조회 (마스터/디테일 조인)
export const getExpenses = async (
  userEmail: string,
  startDate?: string,
  endDate?: string,
  isCardUsage?: boolean,
  viewType: 'registrant' | 'user' | 'admin' | 'admin-summary' = 'registrant',
  selectedUser?: string
) => {
  const sheets = getGoogleSheetClient();
  
  try {
    // 먼저 사용자 정보를 조회하여 이름 가져오기
    const userResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용자!A2:E',
    });
    
    const users = userResponse.data.values || [];
    const currentUser = users.find(user => user[0] === userEmail);
    const userName = currentUser ? currentUser[1] : '';

    // 마스터와 디테일 데이터 조회
    const masterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역마스터!A2:G',
    });

    const detailResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2:C',
    });

    const masters = masterResponse.data.values || [];
    const details = detailResponse.data.values || [];

    // 날짜 필터링을 위한 시작일과 종료일
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    if (viewType === 'admin-summary') {
      // 먼저 모든 활성 사용자 목록을 가져옴
      const activeUsers = users
        .filter(user => user[4] === 'TRUE') // isActive가 TRUE인 사용자만
        .map(user => user[1]); // 사용자 이름만 추출

      // 선택된 사용자가 있으면 해당 사용자만 포함
      const targetUsers = selectedUser ? activeUsers.filter(name => name === selectedUser) : activeUsers;

      // 사용자별 합계 계산
      const userSummary = details
        .reduce((acc: { [key: string]: number }, detail) => {
          const masterId = detail[0];
          const masterData = masters.find(m => m[0] === masterId);
          
          if (!masterData) return acc;

          const rowDate = new Date(masterData[1]);
          const isDateInRange = rowDate >= start && rowDate <= end;
          const isCardUsageMatch = isCardUsage === undefined || isCardUsage === null 
            ? true 
            : (masterData[6] === 'TRUE') === isCardUsage;

          if (!isDateInRange || !isCardUsageMatch) return acc;

          const userName = detail[1];
          const amount = parseInt(detail[2]);
          
          acc[userName] = (acc[userName] || 0) + amount;
          return acc;
        }, {});

      // 모든 활성 사용자에 대해 결과 생성 (사용 내역이 없는 경우 0원으로 표시)
      return targetUsers.map(userName => ({
        id: userName,
        date: '',
        registrant: {
          name: '',
          email: ''
        },
        amount: userSummary[userName] || 0,
        memo: '',
        isCardUsage: false,
        users: [{
          name: userName,
          amount: userSummary[userName] || 0
        }]
      }))
      .sort((a, b) => b.amount - a.amount); // 금액 기준 내림차순 정렬

    } else if (viewType === 'admin') {
      // 관리자는 모든 디테일 내역 조회
      const allDetails = details
        .filter(detail => !selectedUser || detail[1] === selectedUser) // 선택된 사용자 필터링
        .map(detail => {
          const masterId = detail[0];
          const masterData = masters.find(m => m[0] === masterId);
          
          if (!masterData) return null;

          const rowDate = new Date(masterData[1]);
          const isDateInRange = rowDate >= start && rowDate <= end;
          const isCardUsageMatch = isCardUsage === undefined || isCardUsage === null 
            ? true 
            : (masterData[6] === 'TRUE') === isCardUsage;

          if (!isDateInRange || !isCardUsageMatch) return null;

          return {
            id: masterId,
            date: masterData[1],
            registrant: {
              name: masterData[2],
              email: masterData[5]
            },
            amount: parseInt(detail[2]), // 개별 사용자 금액
            memo: masterData[4],
            isCardUsage: masterData[6] === 'TRUE',
            users: [{
              name: detail[1],
              amount: parseInt(detail[2])
            }]
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return allDetails;
    } else if (viewType === 'registrant') {
      // 등록자 기준 조회
      return masters
        .filter(master => {
          const rowDate = new Date(master[1]);
          const isDateInRange = rowDate >= start && rowDate <= end;
          const isRegistrantMatch = master[5] === userEmail;
          const isCardUsageMatch = isCardUsage === undefined || isCardUsage === null 
            ? true 
            : (master[6] === 'TRUE') === isCardUsage;

          return isDateInRange && isRegistrantMatch && isCardUsageMatch;
        })
        .map(master => {
          const userDetails = details
            .filter(detail => detail[0] === master[0])
            .map(detail => ({
              name: detail[1],
              amount: parseInt(detail[2])
            }));

          return {
            id: master[0],
            date: master[1],
            registrant: {
              name: master[2],
              email: master[5]
            },
            amount: parseInt(master[3]),
            memo: master[4],
            isCardUsage: master[6] === 'TRUE',
            users: userDetails
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      // 사용자 기준 조회 (디테일 테이블 기준)
      const userDetails = details
        .filter(detail => detail[1] === userName) // 이메일 대신 이름으로 필터링
        .map(detail => {
          const masterId = detail[0];
          const masterData = masters.find(m => m[0] === masterId);
          
          if (!masterData) return null;

          const rowDate = new Date(masterData[1]);
          const isDateInRange = rowDate >= start && rowDate <= end;
          const isCardUsageMatch = isCardUsage === undefined || isCardUsage === null 
            ? true 
            : (masterData[6] === 'TRUE') === isCardUsage;

          if (!isDateInRange || !isCardUsageMatch) return null;

          // 현재 사용자의 내역만 포함
          const userDetail = {
            name: userName,
            amount: parseInt(detail[2])
          };

          return {
            id: masterId,
            date: masterData[1],
            registrant: {
              name: masterData[2],
              email: masterData[5]
            },
            amount: parseInt(detail[2]), // 사용자 본인의 금액만 표시
            memo: masterData[4],
            isCardUsage: masterData[6] === 'TRUE',
            users: [userDetail] // 현재 사용자의 내역만 포함
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return userDetails;
    }
  } catch (error) {
    console.error('사용 내역 조회 중 오류 발생:', error);
    throw error;
  }
};

// 사용 내역 수정
export const updateExpense = async (id: string, expense: ExpenseForm, registrant: { email: string; name: string }) => {
  const sheets = getGoogleSheetClient();
  
  try {
    // 총액 계산
    const totalAmount = expense.users.reduce((sum, user) => sum + user.amount, 0);

    // 1. 마스터 데이터 수정
    const masterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역마스터!A2:G',
    });

    const masterRows = masterResponse.data.values || [];
    const masterRowIndex = masterRows.findIndex(row => row[0] === id);

    if (masterRowIndex === -1) {
      throw new Error('수정할 마스터 데이터를 찾을 수 없습니다.');
    }

    // 마스터 데이터 업데이트
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: `사용내역마스터!A${masterRowIndex + 2}:G${masterRowIndex + 2}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          id,
          expense.date,
          registrant.name,
          totalAmount,
          expense.memo,
          registrant.email,
          expense.isCardUsage ? 'TRUE' : 'FALSE'
        ]]
      },
    });

    // 2. 기존 디테일 데이터 삭제
    const detailResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2:C',
    });

    const existingDetailRows = detailResponse.data.values || [];
    const detailRowIndexes = existingDetailRows.reduce((acc: number[], row, index) => {
      if (row[0] === id) acc.push(index + 2);
      return acc;
    }, []);

    // 디테일 데이터 삭제 (각 행을 빈 값으로 업데이트)
    for (const rowIndex of detailRowIndexes) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.SHEET_ID,
        range: `사용내역디테일!A${rowIndex}:C${rowIndex}`,
      });
    }

    // 3. 새로운 디테일 데이터 추가
    const newDetailRows = expense.users.map(user => [
      id,
      user.name,
      user.amount
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2:C',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: newDetailRows
      },
    });

    return id;
  } catch (error) {
    console.error('사용 내역 수�� 중 오류 발생:', error);
    throw error;
  }
};

// 사용 내역 삭제
export const deleteExpense = async (id: string) => {
  const sheets = getGoogleSheetClient();
  
  try {
    // 1. 마스터 데이터 삭제
    const masterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역마스터!A2:G',
    });

    const masterRows = masterResponse.data.values || [];
    const masterRowIndex = masterRows.findIndex(row => row[0] === id);

    if (masterRowIndex !== -1) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.SHEET_ID,
        range: `사용내역마스터!A${masterRowIndex + 2}:G${masterRowIndex + 2}`,
      });
    }

    // 2. 디테일 데이터 삭제
    const detailResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2:C',
    });

    const detailRows = detailResponse.data.values || [];
    const detailRowIndexes = detailRows.reduce((acc: number[], row, index) => {
      if (row[0] === id) acc.push(index + 2);
      return acc;
    }, []);

    // 디테일 데이터 삭제
    for (const rowIndex of detailRowIndexes) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.SHEET_ID,
        range: `사용내역디테일!A${rowIndex}:C${rowIndex}`,
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
    // 마스터 데이터 조회
    const masterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역마스터!A2:G',
    });

    const masterRows = masterResponse.data.values || [];
    const masterRow = masterRows.find(row => row[0] === id);

    if (!masterRow) return null;

    // 디테일 데이터 조회
    const detailResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2:C',
    });

    const detailRows = detailResponse.data.values || [];
    const userDetails = detailRows
      .filter(row => row[0] === id)
      .map(row => ({
        name: row[1],
        amount: parseInt(row[2])
      }));

    return {
      id: masterRow[0],
      date: masterRow[1],
      registrant: {
        name: masterRow[2],
        email: masterRow[5]
      },
      amount: parseInt(masterRow[3]),
      memo: masterRow[4],
      isCardUsage: masterRow[6] === 'TRUE',
      users: userDetails
    };
  } catch (error) {
    console.error('사용 내역 조회 중 오류 발생:', error);
    throw error;
  }
}; 