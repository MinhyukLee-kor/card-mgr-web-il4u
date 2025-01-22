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
      range: '사용자!A2:G',  // G열(회사)까지 조회하도록 수정
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
      isActive: user[4] === 'TRUE',
      passwordChangedAt: user[5] || null,
      companyName: user[6] || null  // G열의 회사명
    };
  } catch (error) {
    console.error('구글 시트 조회 중 오류 발생:', error);
    throw error;
  }
};

// 모든 사용자 목록 조회 (회사별 필터링)
export const getAllUsers = async (companyName: string) => {
  const sheets = getGoogleSheetClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용자!A2:G',  // G열(회사)까지 조회
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
        // 활성 사용자만
        (row[4] === 'TRUE' || row[4] === true) &&
        // 같은 회사만
        row[6] === companyName
      )
      .map(row => ({
        email: row[0],
        name: row[1],
        companyName: row[6]  // 회사명 추가
      }));
  } catch (error) {
    console.error('사용자 목록 조회 중 오류 발생:', error);
    throw error;
  }
};

// 메뉴 목록 조회 (회사별 필터링)
export const getAllMenus = async (companyName: string) => {
  const sheets = getGoogleSheetClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '메뉴!A2:D',  // D열(회사)까지 조회
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING'
    });

    const rows = response.data.values || [];
    // 빈 값 제외, 같은 회사만, 가나다순 정렬
    return rows
      .filter(row => row[0] && row[3] === companyName)  // 메뉴명이 있고 같은 회사인 것만
      .map(row => row[0])
      .sort((a, b) => a.localeCompare(b, 'ko')); // 가나다순 정렬
  } catch (error) {
    console.error('메뉴 목록 조회 중 오류 발생:', error);
    throw error;
  }
};

// 새로운 메뉴 추가 함수
export const addNewMenu = async (menuName: string, companyName: string) => {
  const sheets = getGoogleSheetClient();
  
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '메뉴!A2:D',  // D열까지 범위 확장
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          menuName,    // A: 메뉴명
          '',         // B: 칼로리 (빈값)
          '',         // C: 알림주기 (빈값)
          companyName // D: 회사명
        ]]
      },
    });
  } catch (error) {
    console.error('새로운 메뉴 추가 중 오류 발생:', error);
    throw error;
  }
};

// 사용 내역 등록 (마스터/디테일)
export const createExpense = async (expense: ExpenseForm) => {
  const sheets = getGoogleSheetClient();
  
  try {
    const id = uuidv4();
    const totalAmount = expense.users.reduce((sum, user) => sum + user.amount, 0);

    const masterRow = [
      id,                                    // A: ID
      expense.date,                          // B: 날짜
      expense.registrant?.name || '',        // C: 등록자 이름
      totalAmount,                           // D: 총액
      expense.memo,                          // E: 메모
      expense.registrant?.email || '',       // F: 등록자 이메일
      expense.isCardUsage ? 'TRUE' : 'FALSE',// G: 법인카드 여부
      expense.registrant?.companyName || ''  // H: 회사명
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역마스터!A2:H',  // H열까지 범위 확장
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [masterRow]
      },
    });

    // 디테일 데이터 등록
    const detailRows = expense.users.map(user => [
      id,                                    // A: ID
      user.name,                             // B: 사용자 이름
      user.amount,                           // C: 금액
      user.customMenu || user.menu || '',    // D: 메뉴
      expense.registrant?.companyName || ''  // E: 회사명
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2:E',  // E열까지 범위 확장
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
        await addNewMenu(menu, expense.registrant?.companyName || '');
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
    // 먼저 현재 사용자 정보를 조회하여 회사명 가져오기
    const userResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용자!A2:G',  // G열(회사)까지 조회
    });
    
    const users = userResponse.data.values || [];
    const currentUser = users.find(user => user[0] === userEmail);
    const companyName = currentUser ? currentUser[6] : '';  // 회사명

    // 마스터와 디테일 데이터 조회
    const masterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역마스터!A2:H',  // H열(회사)까지 조회
    });

    const detailResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2:E',  // E열(회사)까지 조회
    });

    const masters = masterResponse.data.values || [];
    const details = detailResponse.data.values || [];

    // 회사별 필터링 적용
    const filteredMasters = masters.filter(master => master[7] === companyName);  // H열이 회사명

    // 날짜 필터링을 위한 시작일과 종료일
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    // 기존 필터 로직 유지
    let filteredData = filteredMasters
      .filter(row => {
        const date = new Date(row[1]);
        const cardUsageMatch = isCardUsage === undefined ? true : (row[6] === 'TRUE') === isCardUsage;
        return date >= start && date <= end && cardUsageMatch;
      })
      .map(row => {
        const id = row[0];
        const rowDetails = details.filter(detail => detail[0] === id);
        const totalAmount = parseInt(row[3]);

        return {
          id,
          date: row[1],
          registrant: {
            name: row[2],
            email: row[5]
          },
          amount: totalAmount,
          memo: row[4],
          isCardUsage: row[6] === 'TRUE',
          users: rowDetails.map(detail => ({
            name: detail[1],
            amount: parseInt(detail[2]),
            menu: detail[3] || ''
          }))
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // expenseTypes 필터링 추가
    if (expenseTypes && expenseTypes !== '전체') {
      const types = expenseTypes.split(',');
      filteredData = filteredData.filter(expense => {
        // '기타'가 포함된 경우 특별 처리
        if (types.includes('기타')) {
          const standardTypes = ['점심식대', '저녁식대', '야근식대', '차대', '휴일근무'];
          if (!standardTypes.includes(expense.memo)) {
            return true;
          }
        }
        return types.includes(expense.memo);
      });
    }

    // 사용자별 합계 계산
    const userSummary = filteredData
      .reduce((acc: { [key: string]: number }, expense) => {
        const userName = expense.registrant.name;
        const amount = expense.amount;
        
        acc[userName] = (acc[userName] || 0) + amount;
        return acc;
      }, {});

    if (viewType === 'admin-summary') {
      // 사용자별 합계 조회
      const filteredData = filteredMasters
        .filter(master => {
          const date = new Date(master[1]);
          const cardUsageMatch = isCardUsage === undefined ? true : (master[6] === 'TRUE') === isCardUsage;
          
          // expenseTypes 필터링 추가
          let expenseTypeMatch = true;
          if (expenseTypes && expenseTypes !== '전체') {
            const types = expenseTypes.split(',');
            expenseTypeMatch = types.includes(master[4]) || // 기본 타입 체크
              (types.includes('기타') && // 기타 타입 체크
                !['점심식대', '저녁식대', '야근식대', '차대', '휴일근무'].includes(master[4]));
          }
          
          return date >= start && date <= end && cardUsageMatch && expenseTypeMatch;
        });

      // 디테일 데이터에서 사용자별 합계 계산
      const userSummary: { [key: string]: number } = {};
      
      filteredData.forEach(master => {
        const masterDetails = details.filter(detail => detail[0] === master[0]);
        masterDetails.forEach(detail => {
          const userName = detail[1];
          const amount = parseInt(detail[2]);
          userSummary[userName] = (userSummary[userName] || 0) + amount;
        });
      });

      // 선택된 사용자 필터링 적용
      const targetUsers = Object.keys(userSummary)
        .filter(userName => !selectedUser || selectedUser === '' || userName === selectedUser);

      // 모든 활성 사용자에 대해 결과 생성
      return targetUsers
        .map(userName => ({
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
        .sort((a, b) => a.users[0].name.localeCompare(b.users[0].name, 'ko'));
    } else if (viewType === 'admin') {
      // 디테일 테이블 기준으로 조회하도록 수정
      const filteredData = filteredMasters
        .filter(master => {
          const date = new Date(master[1]);
          const cardUsageMatch = isCardUsage === undefined ? true : (master[6] === 'TRUE') === isCardUsage;
          const userMatch = !selectedUser || selectedUser === '';  // 사용자 필터링은 디테일 단계에서 처리
          
          // expenseTypes 필터링 추가
          let expenseTypeMatch = true;
          if (expenseTypes && expenseTypes !== '전체') {
            const types = expenseTypes.split(',');
            expenseTypeMatch = types.includes(master[4]) || // 기본 타입 체크
              (types.includes('기타') && // 기타 타입 체크
                !['점심식대', '저녁식대', '야근식대', '차대', '휴일근무'].includes(master[4]));
          }
          
          return date >= start && date <= end && cardUsageMatch && expenseTypeMatch;
        })
        .flatMap(master => {
          // 해당 마스터 ID의 디테일 데이터 찾기
          const masterDetails = details.filter(detail => 
            detail[0] === master[0] && 
            // 사용자 필터링을 여기서 적용
            (!selectedUser || selectedUser === '' || detail[1] === selectedUser)
          );
          
          // 디테일 데이터 기준으로 변환
          return masterDetails.map(detail => ({
            id: master[0],
            date: master[1],
            registrant: {
              name: master[2],
              email: master[5]
            },
            amount: parseInt(detail[2]), // 디테일의 금액
            memo: master[4],
            isCardUsage: master[6] === 'TRUE',
            users: [{
              name: detail[1],  // 디테일의 사용자 이름
              amount: parseInt(detail[2]),  // 디테일의 금액
              menu: detail[3] || ''  // 디테일의 메뉴
            }]
          }));
        })
        .sort((a, b) => {
          // 1. 날짜 기준 내림차순
          const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          
          // 2. 날짜가 같으면 사용내역 기준 오름차순
          return (a.memo || '').localeCompare(b.memo || '', 'ko');
        });

      return filteredData;
    } else if (viewType === 'registrant') {
      // 등록자 기준 조회
      return filteredData
        .filter(expense => expense.registrant.email === userEmail)
        .map(expense => {
          const userDetails = details
            .filter(detail => detail[0] === expense.id)
            .map(detail => ({
              name: detail[1],
              amount: parseInt(detail[2])
            }));

          return {
            id: expense.id,
            date: expense.date,
            registrant: {
              name: expense.registrant.name,
              email: expense.registrant.email
            },
            amount: expense.amount,
            memo: expense.memo,
            isCardUsage: expense.isCardUsage,
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
      if (!currentUser) return [];  // 현재 사용자 정보가 없으면 빈 배열 반환

      return filteredData
        .filter(expense => {
          const userDetail = details.find(detail => 
            detail[0] === expense.id && 
            detail[1] === currentUser[1] && 
            detail[4] === companyName
          );
          return userDetail !== undefined;
        })
        .map(expense => {
          // 해당 사용자의 디테일 정보 찾기
          const userDetail = details.find(detail => 
            detail[0] === expense.id && 
            detail[1] === currentUser[1]
          );

          return {
            id: expense.id,
            date: expense.date,
            registrant: {
              name: expense.registrant.name,
              email: expense.registrant.email
            },
            amount: parseInt(userDetail?.[2] || '0'),  // 해당 사용자의 금액
            memo: expense.memo,
            isCardUsage: expense.isCardUsage,
            users: [{
              name: currentUser[1],
              amount: parseInt(userDetail?.[2] || '0'),
              menu: userDetail?.[3] || ''
            }]
          };
        })
        .sort((a, b) => {
          // 1. 날짜 기준 내림차순
          const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          
          // 2. 날짜가 같으면 사용내역 기준 오름차순
          return (a.memo || '').localeCompare(b.memo || '', 'ko');
        });
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
    const existingExpense = await getExpenseById(id, expense.registrant?.companyName || '');
    const registrant = expense.registrant || existingExpense.registrant;

    // 2. 기존 데이터 삭제
    const masterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역마스터!A2:H',  // H열(회사)까지 조회
    });

    const detailResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2:E',  // E열(회사)까지 조회
    });

    const masters = masterResponse.data.values || [];
    const details = detailResponse.data.values || [];

    const masterRowIndex = masters.findIndex(row => row[0] === id);
    const detailRowIndexes = details.reduce((acc: number[], row, index) => {
      if (row[0] === id) acc.push(index + 2);
      return acc;
    }, []);

    // 마스터 데이터 삭제 (H열까지)
    if (masterRowIndex !== -1) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.SHEET_ID,
        range: `사용내역마스터!A${masterRowIndex + 2}:H${masterRowIndex + 2}`,
      });
    }

    // 디테일 데이터 삭제 (E열까지)
    for (const rowIndex of detailRowIndexes) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.SHEET_ID,
        range: `사용내역디테일!A${rowIndex}:E${rowIndex}`,
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
      expense.isCardUsage ? 'TRUE' : 'FALSE',
      expense.registrant?.companyName  // 회사명 추가
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역마스터!A2:H',  // H열까지 범위 확장
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
      user.customMenu || user.menu || '',
      expense.registrant?.companyName  // 회사명 추가
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2:E',  // E열까지 범위 확장
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
        await addNewMenu(menu, expense.registrant?.companyName || '');
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
export const getExpenseById = async (id: string, companyName: string) => {
  const sheets = getGoogleSheetClient();
  
  try {
    // 마스터 데이터 조회
    const masterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역마스터!A2:H',  // H열(회사)까지 조회
    });

    // 디테일 데이터 조회
    const detailResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2:E',  // E열(회사)까지 조회
    });

    // 메뉴 목록 조회
    const menus = await getAllMenus(companyName);

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
        email: masterRow[5],
        companyName: masterRow[7]  // 회사명 추가
      },
      amount: parseInt(masterRow[3]),
      memo: masterRow[4],
      isCardUsage: masterRow[6] === 'TRUE',
      users: detailRows.map(row => ({
        name: row[1],
        amount: parseInt(row[2]),
        menu: row[3] || '',
        customMenu: row[3] && !menus.includes(row[3]) ? row[3] : undefined
      }))
    };
  } catch (error) {
    console.error('사용 내역 상세 조회 중 오류 발생:', error);
    throw error;
  }
};

// 메뉴 분석 데이터 조회
export const getMenuAnalysis = async (startDate: string, endDate: string, viewType: string, companyName: string, userName?: string) => {
  const sheets = getGoogleSheetClient();
  
  try {
    // 마스터 데이터 조회
    const masterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역마스터!A2:H',  // H열(회사)까지 조회
    });

    // 디테일 데이터 조회
    const detailResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용내역디테일!A2:E',  // E열(회사)까지 조회
    });

    const masters = masterResponse.data.values || [];
    const details = detailResponse.data.values || [];

    // 날짜 범위
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 메뉴별 사용 횟수와 마지막 사용 날짜 계산
    const menuStats = new Map<string, { count: number; lastUsed: string }>();
    let totalCount = 0;

    // 필터링된 디테일 데이터만 사용
    const filteredDetails = details.filter(detail => {
      const masterId = detail[0];
      const detailUserName = detail[1];  // 사용자 이름
      const menu = detail[3];            // 메뉴
      const detailCompany = detail[4];   // 회사명
      
      // 기본 필터: 메뉴가 있고, 같은 회사여야 함
      if (!menu || detailCompany !== companyName) return false;

      // 개인별 조회인 경우 사용자 이름으로 필터링
      if (viewType === 'personal' && userName && detailUserName !== userName) {
        return false;
      }

      // 날짜 범위 체크
      const masterData = masters.find(m => m[0] === masterId);
      if (!masterData) return false;

      const useDate = new Date(masterData[1]);
      return useDate >= start && useDate <= end;
    });

    // 필터링된 데이터로 통계 계산
    filteredDetails.forEach(detail => {
      const masterId = detail[0];
      const menu = detail[3];
      const masterData = masters.find(m => m[0] === masterId);
      if (!masterData) return;

      const stats = menuStats.get(menu) || { count: 0, lastUsed: masterData[1] };
      stats.count++;
      stats.lastUsed = new Date(stats.lastUsed) > new Date(masterData[1]) ? stats.lastUsed : masterData[1];
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
export const getNotices = async (companyName: string) => {
  const sheets = getGoogleSheetClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '공지!A2:C',  // C열(회사)까지 조회
    });

    const rows = response.data.values || [];
    
    return rows
      .filter(row => row[2] === companyName)  // 회사명으로 필터링
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
  passwordChangedAt: string;
  companyName: string;
}) => {
  const sheets = getGoogleSheetClient();
  
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용자!A2:F',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          user.email,
          user.name,
          user.password,
          user.role,
          user.isActive ? 'TRUE' : 'FALSE',
          user.passwordChangedAt,
          user.companyName
        ]]
      }
    });
  } catch (error) {
    console.error('사용자 생성 중 오류 발생:', error);
    throw error;
  }
};

export const updateUserPassword = async (email: string, hashedPassword: string) => {
  const sheets = getGoogleSheetClient();
  
  try {
    // 사용자 목록 조회
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '사용자!A2:F',
    });

    const rows = response.data.values || [];
    const userRowIndex = rows.findIndex(row => row[0] === email);

    if (userRowIndex === -1) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    // 한국 시간으로 현재 날짜 가져오기
    const today = new Date();
    const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
    const passwordChangedAt = koreaTime.toISOString().split('T')[0];

    // 비밀번호와 변경일자 업데이트
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: `사용자!C${userRowIndex + 2}:F${userRowIndex + 2}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          hashedPassword,
          rows[userRowIndex][3] || 'USER',  // 기존 role 유지
          rows[userRowIndex][4] || 'TRUE',  // 기존 isActive 유지
          passwordChangedAt  // 한국 시간 기준 날짜
        ]]
      }
    });
  } catch (error) {
    console.error('비밀번호 업데이트 중 오류 발생:', error);
    throw error;
  }
};

export const getAllCompanies = async () => {
  const sheets = getGoogleSheetClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: '회사!A2:A',  // A열의 회사명만 조회
    });

    const rows = response.data.values || [];
    return rows
      .filter(row => row[0]?.trim())  // 빈 값 제외
      .map((row, index) => ({
        id: index + 1,  // 순서대로 ID 부여
        name: row[0]
      }))
      .sort((a, b) => a.name.localeCompare(b, 'ko'));  // 가나다순 정렬
  } catch (error) {
    console.error('회사 목록 조회 중 오류 발생:', error);
    throw error;
  }
}; 