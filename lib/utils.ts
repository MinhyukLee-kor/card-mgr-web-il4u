import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 숫자에 천 단위 콤마를 추가하는 함수
export const formatAmount = (value: number | string): string => {
  if (!value) return '';
  // 숫자만 추출
  const number = value.toString().replace(/[^\d]/g, '');
  // 천 단위 콤마 추가
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// 콤마가 포함된 문자열에서 숫자만 추출하는 함수
export const parseAmount = (value: string): number => {
  return parseInt(value.replace(/[^\d]/g, '')) || 0;
};
