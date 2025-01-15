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

// 메뉴 목록 조회 함수 수정
export const getAllMenus = async () => {
  const sheets = getGoogleSheetClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '메뉴!A2:A', // 메뉴명 컬럼만 조회
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING'
    });

    const rows = response.data.values || [];
    // 빈 값 제외하고 가나다순 정렬
    return rows
      .map(row => row[0])
      .filter(menu => menu) // 빈 값 제외
      .sort((a, b) => a.localeCompare(b, 'ko')); // 가나다순 정렬
  } catch (error) {
    console.error('메뉴 목록 조회 중 오류 발생:', error);
    throw error;
  }
};

// 새로운 메뉴 추가 함수
export const addNewMenu = async (menuName: string) => {
  const sheets = getGoogleSheetClient();
  
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '메뉴!A2:A',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[menuName]]
      },
    });
  } catch (error) {
    console.error('새로운 메뉴 추가 중 오류 발생:', error);
    throw error;
  }
};

// 사용 내역 등록 (마스터/디테일)
export const createExpense = async (expense: ExpenseForm & { registrant?: { email: string; name: string } }) => {
  const sheets = getGoogleSheetClient();
  
  try {
    const id = uuidv4();
    const totalAmount = expense.users.reduce((sum, user) => sum + user.amount, 0);

    const masterRow = [
      id,
      expense.date,
      expense.registrant?.name || expense.users[0].name,
      totalAmount,
      expense.memo,
      expense.registrant?.email || expense.users[0].email,
      expense.isCardUsage ? 'TRUE' : 'FALSE'
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역마스터!A2', // A2로만 지정
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [masterRow]
      },
    });

    // 디테일 데이터 등록
    const detailRows = expense.users.map(user => [
      id,
      user.name,
      user.amount,
      user.customMenu || user.menu || ''
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2', // A2로만 지정
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: detailRows
      },
    });

    // 새로운 메뉴인 경우 메뉴 시트에 추가
    if (expense.users.some(user => user.menu === '기타')) {
      const newMenus = expense.users
        .filter(user => user.customMenu) // customMenu가 있는 경우만
        .map(user => user.customMenu)
        .filter((menu): menu is string => menu !== undefined) // undefined 제거 및 타입 가드
        .filter((menu, index, self) => self.indexOf(menu) === index); // 중복 제거

      for (const menu of newMenus) {
        await addNewMenu(menu);
      }
    }

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
  selectedUser?: string,
  expenseTypes?: string,
  searchKeyword?: string
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

    // 사용내역 필터 함수 수정
    const memoFilter = (memo: string | undefined) => {
      if (!expenseTypes) return false;
      
      const types = expenseTypes.split(',');
      if (types.includes('전체')) return true;
      if (types.length === 0) return false;
      
      if (!memo) return false;
      
      return types.some(type => {
        if (type === '기타') {
          const basicTypes = ['점심식대', '저녁식대', '야근식대', '차대', '휴일근무'];
          const isNotBasicType = !basicTypes.includes(memo);
          return isNotBasicType && (searchKeyword ? memo.toLowerCase().includes(searchKeyword.toLowerCase()) : true);
        }
        return memo === type;
      });
    };

    if (viewType === 'admin-summary') {
      // 먼저 모든 활성 사용자 목록을 가져옴
      const activeUsers = users
        .filter(user => user[4] === 'TRUE') // isActive가 TRUE인 사용자만
        .map(user => user[1]); // 사용자 이름만 추출

      // 선택된 사용자가 있으면 해당 사용자만 포함
      const targetUsers = selectedUser ? [selectedUser] : activeUsers;

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
          const isMemoMatch = memoFilter(masterData[4]); // 사용내역 필터 추가

          if (!isDateInRange || !isCardUsageMatch || !isMemoMatch) return acc;

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
      // 금액 기준 정렬을 사용자 이름 기준 정렬로 변경
      .sort((a, b) => a.users[0].name.localeCompare(b.users[0].name, 'ko'));

    } else if (viewType === 'admin') {
      // 관리자는 모든 디테일 내역 조회
      const allDetails = details
        .filter(detail => {
          // selectedUser가 빈 문자열('')이면 모든 사용자 포함
          return !selectedUser || selectedUser === '' || detail[1] === selectedUser;
        })
        .map(detail => {
          const masterId = detail[0];
          const masterData = masters.find(m => m[0] === masterId);
          
          if (!masterData) return null;

          const rowDate = new Date(masterData[1]);
          const isDateInRange = rowDate >= start && rowDate <= end;
          const isCardUsageMatch = isCardUsage === undefined || isCardUsage === null 
            ? true 
            : (masterData[6] === 'TRUE') === isCardUsage;
          const isMemoMatch = memoFilter(masterData[4]); // 사용내역 필터 추가

          if (!isDateInRange || !isCardUsageMatch || !isMemoMatch) return null;

          return {
            id: masterId,
            date: masterData[1],
            registrant: {
              name: masterData[2],
              email: masterData[5]
            },
            amount: parseInt(detail[2]),
            memo: masterData[4],
            isCardUsage: masterData[6] === 'TRUE',
            users: [{
              name: detail[1],
              amount: parseInt(detail[2])
            }]
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => {
          // 1. 날짜 기준 내림차순
          const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          
          // 2. 날짜가 같으면 사용내역 기준 오름차순
          return (a.memo || '').localeCompare(b.memo || '', 'ko');
        });

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
          const isMemoMatch = memoFilter(master[4]); // 사용내역 필터 추가

          return isDateInRange && isRegistrantMatch && isCardUsageMatch && isMemoMatch;
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
        .sort((a, b) => {
          // 1. 날짜 기준 내림차순
          const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          
          // 2. 날짜가 같으면 사용내역 기준 오름차순
          return (a.memo || '').localeCompare(b.memo || '', 'ko');
        });
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
          const isMemoMatch = memoFilter(masterData[4]); // 사용내역 필터 추가

          if (!isDateInRange || !isCardUsageMatch || !isMemoMatch) return null;

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
        .sort((a, b) => {
          // 1. 날짜 기준 내림차순
          const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          
          // 2. 날짜가 같으면 사용내역 기준 오름차순
          return (a.memo || '').localeCompare(b.memo || '', 'ko');
        });

      return userDetails;
    }
  } catch (error) {
    console.error('사용 내역 조회 중 오류 발생:', error);
    throw error;
  }
};

// 사용 내역 수정
export const updateExpense = async (id: string, expense: ExpenseForm & { registrant?: { email: string; name: string } }) => {
  const sheets = getGoogleSheetClient();
  
  try {
    // 1. 기존 데이터 조회하여 등록자 정보 가져오기
    const existingExpense = await getExpenseById(id);
    const registrant = expense.registrant || existingExpense.registrant;

    // 2. 기존 데이터 삭제
    const masterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역마스터!A2:G',
    });

    const detailResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2:D',
    });

    const masters = masterResponse.data.values || [];
    const details = detailResponse.data.values || [];

    const masterRowIndex = masters.findIndex(row => row[0] === id);
    const detailRowIndexes = details.reduce((acc: number[], row, index) => {
      if (row[0] === id) acc.push(index + 2);
      return acc;
    }, []);

    // 마스터 데이터 삭제
    if (masterRowIndex !== -1) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.SHEET_ID,
        range: `사용내역마스터!A${masterRowIndex + 2}:G${masterRowIndex + 2}`,
      });
    }

    // 디테일 데이터 삭제
    for (const rowIndex of detailRowIndexes) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.SHEET_ID,
        range: `사용내역디테일!A${rowIndex}:D${rowIndex}`,
      });
    }

    // 3. 새로운 마스터 데이터 추가
    const totalAmount = expense.users.reduce((sum, user) => sum + user.amount, 0);

    const masterRow = [
      id,
      expense.date,
      expense.registrant?.name || expense.users[0].name,
      totalAmount,
      expense.memo,
      expense.registrant?.email || expense.users[0].email,
      expense.isCardUsage ? 'TRUE' : 'FALSE'
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역마스터!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [masterRow]
      },
    });

    // 4. 새로운 디테일 데이터 추가
    const detailRows = expense.users.map(user => [
      id,
      user.name,
      user.amount,
      user.customMenu || user.menu || ''
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: detailRows
      },
    });

    // 새로운 메뉴인 경우 메뉴 시트에 추가
    if (expense.users.some(user => user.menu === '기타')) {
      const newMenus = expense.users
        .filter(user => user.customMenu)
        .map(user => user.customMenu)
        .filter((menu): menu is string => menu !== undefined)
        .filter((menu, index, self) => self.indexOf(menu) === index);

      for (const menu of newMenus) {
        await addNewMenu(menu);
      }
    }

    return true;
  } catch (error) {
    console.error('사용 내역 수정 중 오류 발생:', error);
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
      range: '사용내역디테일!A2:D', // D열까지 조회
    });

    const detailRows = detailResponse.data.values || [];
    const detailRowIndexes = detailRows.reduce((acc: number[], row, index) => {
      if (row[0] === id) acc.push(index + 2);
      return acc;
    }, []);

    // 디테일 데이터 삭제 (D열까지 포함)
    for (const rowIndex of detailRowIndexes) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.SHEET_ID,
        range: `사용내역디테일!A${rowIndex}:D${rowIndex}`,
      });
    }

    return true;
  } catch (error) {
    console.error('사용 내역 삭제 중 오류 발생:', error);
    throw error;
  }
};

// 사용 내역 상세 조회
export const getExpenseById = async (id: string) => {
  const sheets = getGoogleSheetClient();
  
  try {
    // 마스터 데이터 조회
    const masterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역마스터!A2:G',
    });

    // 디테일 데이터 조회
    const detailResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2:D',
    });

    // 메뉴 목록 조회
    const menus = await getAllMenus();

    const masters = masterResponse.data.values || [];
    const details = detailResponse.data.values || [];

    const masterRow = masters.find(row => row[0] === id);
    if (!masterRow) throw new Error('데이터를 찾을 수 없습니다.');

    const detailRows = details.filter(row => row[0] === id);

    return {
      id,
      date: masterRow[1],
      registrant: {
        name: masterRow[2],
        email: masterRow[5]
      },
      amount: parseInt(masterRow[3]),
      memo: masterRow[4],
      isCardUsage: masterRow[6] === 'TRUE',
      users: detailRows.map(row => ({
        name: row[1],
        amount: parseInt(row[2]),
        menu: row[3] || '', // 메뉴 정보 추가
        customMenu: row[3] && !menus.includes(row[3]) ? row[3] : undefined // 기타 메뉴인 경우
      }))
    };
  } catch (error) {
    console.error('사용 내역 상세 조회 중 오류 발생:', error);
    throw error;
  }
};

// 메뉴 분석 데이터 조회
export const getMenuAnalysis = async (startDate: string, endDate: string, viewType: string, userEmail?: string) => {
  const sheets = getGoogleSheetClient();
  
  try {
    // 마스터 데이터 조회
    const masterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역마스터!A2:G',
    });

    // 디테일 데이터 조회
    const detailResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2:D',
    });

    const masters = masterResponse.data.values || [];
    const details = detailResponse.data.values || [];

    // 날짜 범위 내의 데이터만 필터링
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 메뉴별 사용 횟수와 마지막 사용 날짜 계산
    const menuStats = new Map<string, { count: number; lastUsed: string }>();
    let totalCount = 0;

    details.forEach(detail => {
      const masterId = detail[0];
      const menu = detail[3];
      const userName = detail[1];
      if (!menu) return;

      const masterData = masters.find(m => m[0] === masterId);
      if (!masterData) return;

      // 개인별 조회인 경우 해당 사용자의 데이터만 필터링
      if (viewType === 'personal' && userEmail) {
        const detailEmail = masters.find(m => m[0] === masterId)?.[5];
        if (detailEmail !== userEmail) return;
      }

      const useDate = new Date(masterData[1]);
      if (useDate < start || useDate > end) return;

      const stats = menuStats.get(menu) || { count: 0, lastUsed: masterData[1] };
      stats.count++;
      stats.lastUsed = new Date(stats.lastUsed) > useDate ? stats.lastUsed : masterData[1];
      menuStats.set(menu, stats);
      totalCount++;
    });

    // 결과 데이터 생성
    const menuRanking = Array.from(menuStats.entries()).map(([menu, stats]) => ({
      menu,
      count: stats.count,
      percentage: (stats.count / totalCount * 100).toFixed(1),
      lastUsed: stats.lastUsed
    }));

    // 선호도 순위 (사용 횟수 기준 내림차순)
    const popularity = [...menuRanking].sort((a, b) => b.count - a.count);

    // 오래된 메뉴 순위 (마지막 사용일 기준 오름차순)
    const oldestUsed = [...menuRanking].sort((a, b) => 
      new Date(a.lastUsed).getTime() - new Date(b.lastUsed).getTime()
    );

    return {
      popularity,
      oldestUsed
    };
  } catch (error) {
    console.error('메뉴 분석 데이터 조회 중 오류 발생:', error);
    throw error;
  }
};

// 공지사항 조회 함수 추가
export const getNotices = async () => {
  const sheets = getGoogleSheetClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '공지!A2:B', // A2부터 B열까지 데이터 조회
    });

    const rows = response.data.values || [];
    
    // 날짜 기준으로 정렬하고 최근 5개만 반환
    return rows
      .map(row => ({
        content: row[0],
        date: row[1]
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  } catch (error) {
    console.error('공지사항 조회 중 오류 발생:', error);
    throw error;
  }
};

export const createUser = async (user: {
  email: string;
  name: string;
  password: string;
  role: string;
  isActive: boolean;
}) => {
  const sheets = getGoogleSheetClient();
  
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용자!A2:E',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          user.email,
          user.name,
          user.password,
          user.role,
          user.isActive ? 'TRUE' : 'FALSE'
        ]]
      }
    });
  } catch (error) {
    console.error('사용자 생성 중 오류 발생:', error);
    throw error;
  }
}; 