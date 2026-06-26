export type Person = {
  id: string;
  user_id: string | null;
  name: string;
  amount: number;
  months_to_pay: number;
  is_fully_paid: boolean;
  start_month: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  user_id: string | null;
  person_id: string;
  month: string;
  is_paid: boolean;
  created_at: string;
};

export type PersonSummary = {
  person: Person;
  payments: Payment[];
  paidMonths: number;
  totalMonths: number;
  monthlyAmount: number;
  remainingBalance: number;
};

export type MonthDetail = {
  label: string;
  isPaid: boolean;
  payment?: Payment;
};
