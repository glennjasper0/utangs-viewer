import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from './lib/supabase';
import type { Payment, Person, PersonSummary } from './types/database';
import {
  createPersonSummary,
  formatCurrency,
  getMonthDetails,
  groupPaymentsByPerson,
  sortPeopleByName,
} from './utils/calculations';

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

function App() {
  const [people, setPeople] = useState<Person[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [status, setStatus] = useState<LoadingState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [openPersonId, setOpenPersonId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRecords() {
      setStatus('loading');
      setErrorMessage('');

      const supabase = getSupabaseClient();

      const [peopleResult, paymentsResult] = await Promise.all([
        supabase.from('people').select('*').order('name', { ascending: true }),
        supabase.from('payments').select('*').order('month', { ascending: true }),
      ]);

      if (!isMounted) {
        return;
      }

      if (peopleResult.error || paymentsResult.error) {
        setStatus('error');
        setErrorMessage(
          peopleResult.error?.message ??
            paymentsResult.error?.message ??
            'Unable to load records.',
        );
        return;
      }

      setPeople((peopleResult.data ?? []) as Person[]);
      setPayments((paymentsResult.data ?? []) as Payment[]);
      setStatus('success');
    }

    loadRecords().catch((error: unknown) => {
      if (!isMounted) {
        return;
      }

      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load records.',
      );
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const summaries = useMemo(() => {
    const paymentsByPersonId = groupPaymentsByPerson(payments);
    return sortPeopleByName(people).map((person) =>
      createPersonSummary(person, paymentsByPersonId),
    );
  }, [payments, people]);

  const unpaidPeople = summaries.filter((summary) => !summary.person.is_fully_paid);
  const paidPeople = summaries.filter((summary) => summary.person.is_fully_paid);
  const totalBalance = unpaidPeople.reduce(
    (total, summary) => total + summary.remainingBalance,
    0,
  );

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Read-only Supabase viewer</p>
          <h1>Utangs Viewer</h1>
        </div>
        <div className="summary-strip" aria-label="Record summary">
          <span>
            <strong>{people.length}</strong>
            people
          </span>
          <span>
            <strong>{formatCurrency(totalBalance)}</strong>
            unpaid balance
          </span>
        </div>
      </header>

      {status === 'loading' && <StateMessage title="Loading records" />}

      {status === 'error' && (
        <StateMessage title="Could not load records" message={errorMessage} />
      )}

      {status === 'success' && summaries.length === 0 && (
        <StateMessage title="No records found" message="There are no people to show yet." />
      )}

      {status === 'success' && summaries.length > 0 && (
        <div className="sections">
          <PeopleSection
            title="Unpaid"
            summaries={unpaidPeople}
            openPersonId={openPersonId}
            onTogglePerson={setOpenPersonId}
          />
          <PeopleSection
            title="Paid"
            summaries={paidPeople}
            openPersonId={openPersonId}
            onTogglePerson={setOpenPersonId}
          />
        </div>
      )}
    </main>
  );
}

type PeopleSectionProps = {
  title: string;
  summaries: PersonSummary[];
  openPersonId: string | null;
  onTogglePerson: (personId: string | null) => void;
};

function PeopleSection({
  title,
  summaries,
  openPersonId,
  onTogglePerson,
}: PeopleSectionProps) {
  return (
    <section className="people-section" aria-labelledby={`${title}-heading`}>
      <div className="section-heading">
        <h2 id={`${title}-heading`}>{title}</h2>
        <span>{summaries.length}</span>
      </div>

      {summaries.length === 0 ? (
        <p className="empty-section">No {title.toLowerCase()} records.</p>
      ) : (
        <div className="person-list">
          {summaries.map((summary) => (
            <PersonCard
              key={summary.person.id}
              summary={summary}
              isOpen={openPersonId === summary.person.id}
              onToggle={() =>
                onTogglePerson(
                  openPersonId === summary.person.id ? null : summary.person.id,
                )
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

type PersonCardProps = {
  summary: PersonSummary;
  isOpen: boolean;
  onToggle: () => void;
};

function PersonCard({ summary, isOpen, onToggle }: PersonCardProps) {
  const { person } = summary;
  const monthDetails = getMonthDetails(summary);

  return (
    <article className="person-card">
      <button
        className="person-toggle"
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>
          <strong>{person.name}</strong>
          <small>{isOpen ? 'Hide months' : 'View months'}</small>
        </span>
        <span className={person.is_fully_paid ? 'status paid' : 'status unpaid'}>
          {person.is_fully_paid ? 'Paid' : 'Unpaid'}
        </span>
      </button>

      <dl className="money-grid">
        <div>
          <dt>Total</dt>
          <dd>{formatCurrency(person.amount)}</dd>
        </div>
        <div>
          <dt>Monthly</dt>
          <dd>{formatCurrency(summary.monthlyAmount)}</dd>
        </div>
        <div>
          <dt>Paid months</dt>
          <dd>
            {summary.paidMonths} / {summary.totalMonths}
          </dd>
        </div>
        <div>
          <dt>Remaining</dt>
          <dd>{formatCurrency(summary.remainingBalance)}</dd>
        </div>
      </dl>

      {isOpen && (
        <div className="month-list" aria-label={`${person.name} month details`}>
          {monthDetails.length === 0 ? (
            <p className="empty-section">No month details available.</p>
          ) : (
            monthDetails.map((month, index) => (
              <div className="month-row" key={`${month.label}-${index}`}>
                <span>{month.label}</span>
                <span className={month.isPaid ? 'month-paid' : 'month-unpaid'}>
                  {month.isPaid ? 'Paid' : 'Unpaid'}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </article>
  );
}

type StateMessageProps = {
  title: string;
  message?: string;
};

function StateMessage({ title, message }: StateMessageProps) {
  return (
    <section className="state-message" role="status">
      <h2>{title}</h2>
      {message && <p>{message}</p>}
    </section>
  );
}

export default App;
