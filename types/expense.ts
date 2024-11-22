export interface Expense {
  id: string;
  date: string;
  registrant: {
    email: string;
    name: string;
  };
  users: ExpenseShare[];
  memo: string;
}

export interface ExpenseShare {
  email: string;
  name: string;
  amount: number;
}

export interface ExpenseForm {
  date: string;
  users: ExpenseShare[];
  memo: string;
}

export interface UserOption {
  email: string;
  name: string;
} 