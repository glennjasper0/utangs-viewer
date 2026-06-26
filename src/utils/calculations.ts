import type { MonthDetail, Payment, Person, PersonSummary } from '../types/database';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

const monthFormatter = new Intl.DateTimeFormat('en', {
  month: 'long',
  year: 'numeric',
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function sortPeopleByName(people: Person[]) {
  return [...people].sort((a, b) => a.name.localeCompare(b.name));
}

export function createPersonSummary(
  person: Person,
  paymentsByPersonId: Map<string, Payment[]>,
): PersonSummary {
  const payments = paymentsByPersonId.get(person.id) ?? [];
  const paidMonths = payments.filter((payment) => payment.is_paid).length;
  const totalMonths = Math.max(Number(person.months_to_pay) || 0, 0);
  const totalAmount = Math.max(Number(person.amount) || 0, 0);
  const monthlyAmount = totalMonths > 0 ? totalAmount / totalMonths : 0;
  const paidAmount = Math.min(totalAmount, paidMonths * monthlyAmount);
  const remainingBalance = person.is_fully_paid
    ? 0
    : Math.max(totalAmount - paidAmount, 0);

  return {
    person,
    payments: sortPayments(payments),
    paidMonths,
    totalMonths,
    monthlyAmount,
    remainingBalance,
  };
}

export function groupPaymentsByPerson(payments: Payment[]) {
  return payments.reduce((grouped, payment) => {
    const existing = grouped.get(payment.person_id) ?? [];
    grouped.set(payment.person_id, [...existing, payment]);
    return grouped;
  }, new Map<string, Payment[]>());
}

export function getMonthDetails(summary: PersonSummary): MonthDetail[] {
  const expectedMonths = buildExpectedMonths(summary.person.start_month, summary.totalMonths);

  if (expectedMonths.length > 0) {
    return expectedMonths.map((month, index) => {
      const matchingPayment = summary.payments.find(
        (payment) => normalizeMonth(payment.month) === month.value,
      );

      return {
        label: month.label || `Month ${index + 1}`,
        isPaid: Boolean(matchingPayment?.is_paid),
        payment: matchingPayment,
      };
    });
  }

  if (summary.payments.length > 0) {
    return summary.payments.map((payment, index) => ({
      label: formatMonthLabel(payment.month) || `Month ${index + 1}`,
      isPaid: payment.is_paid,
      payment,
    }));
  }

  return Array.from({ length: summary.totalMonths }, (_, index) => ({
    label: `Month ${index + 1}`,
    isPaid: false,
  }));
}

function sortPayments(payments: Payment[]) {
  return [...payments].sort((a, b) => {
    const normalizedA = normalizeMonth(a.month);
    const normalizedB = normalizeMonth(b.month);

    if (normalizedA && normalizedB) {
      return normalizedA.localeCompare(normalizedB);
    }

    return a.month.localeCompare(b.month);
  });
}

function buildExpectedMonths(startMonth: string | null, totalMonths: number) {
  const startDate = parseMonth(startMonth);

  if (!startDate || totalMonths <= 0) {
    return [];
  }

  return Array.from({ length: totalMonths }, (_, index) => {
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + index, 1);

    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: monthFormatter.format(date),
    };
  });
}

function formatMonthLabel(month: string) {
  const parsed = parseMonth(month);
  return parsed ? monthFormatter.format(parsed) : month;
}

function normalizeMonth(month: string) {
  const parsed = parseMonth(month);
  return parsed
    ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
    : month;
}

function parseMonth(month: string | null) {
  if (!month) {
    return null;
  }

  const match = month.match(/^(\d{4})-(\d{1,2})/);

  if (match) {
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const date = new Date(year, monthIndex, 1);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(month);
  return Number.isNaN(parsed.getTime())
    ? null
    : new Date(parsed.getFullYear(), parsed.getMonth(), 1);
}
