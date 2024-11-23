export interface ExpenseMaster {
  id: string;
  date: string;
  registrant: {
    email: string;
    name: string;
  };
  amount: number;
  memo: string;
  isCardUsage: boolean;
}

export interface ExpenseDetail {
  id: string;
  user: {
    email: string;
    name: string;
  };
  amount: number;
}

export interface ExpenseForm {
  date: string;
  memo: string;
  isCardUsage: boolean;
  users: {
    email: string;
    name: string;
    amount: number;
  }[];
}

export interface UserOption {
  email: string;
  name: string;
}

export interface ExpenseShare {
  email: string;
  name: string;
  amount: number;
} 