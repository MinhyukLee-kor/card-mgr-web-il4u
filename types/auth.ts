export interface User {
    email: string;
    name: string;
    role: string;
    isActive: boolean;
  }
  
  export interface LoginForm {
    email: string;
    password: string;
  }
  
  export interface LoginResponse {
    message: string;
    user?: {
      email: string;
      name: string;
      role: string;
    };
  }
  
  export interface SignUpForm {
    email: string;
    name: string;
    password: string;
    confirmPassword: string;
  }