import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createExpense, getMyExpenses, login, register, submitExpense } from './api';
import type {
  AuthResponse,
  ExpenseCategory,
  ExpenseResponse,
  ExpenseStatus,
  PaymentMethod
} from './types';

const TOKEN_KEY = 'reeva.auth.token';
const USER_KEY = 'reeva.auth.user';

const categoryOptions: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'FOOD', label: 'Alimentacao' },
  { value: 'TRANSPORT', label: 'Transporte' },
  { value: 'LODGING', label: 'Hospedagem' },
  { value: 'PURCHASE', label: 'Compras' }
];

const paymentOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'PIX', label: 'Pix' },
  { value: 'CREDIT_CARD', label: 'Cartao de credito' },
  { value: 'DEBIT_CARD', label: 'Cartao de debito' },
  { value: 'CORPORATE_CARD', label: 'Cartao corporativo' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'OTHER', label: 'Outro' }
];

const statusLabels: Record<ExpenseStatus, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Enviada',
  AI_APPROVED: 'Aprovada pela IA',
  PENDING_REVIEW: 'Em revisao',
  MANAGER_APPROVED: 'Aprovada pelo gestor',
  MANAGER_REJECTED: 'Rejeitada pelo gestor',
  FINANCE_APPROVED: 'Aprovada pelo financeiro',
  FINANCE_REJECTED: 'Rejeitada pelo financeiro',
  PAID: 'Paga',
  CANCELLED: 'Cancelada'
};

function buildExpensePayload(file: File) {
  const title = file.name.replace(/\.[^/.]+$/, '').trim() || 'Nota fiscal';

  return {
    title,
    category: 'PURCHASE' as ExpenseCategory,
    amount: '1.00',
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'OTHER' as PaymentMethod,
    description: 'Enviado pelo app com preenchimento automatico.'
  };
}

function App() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthResponse | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthResponse) : null;
  });
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function loadExpenses(currentToken: string) {
    setLoadingExpenses(true);
    setError(null);

    try {
      const page = await getMyExpenses(currentToken);
      setExpenses(page.content);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar historico.');
    } finally {
      setLoadingExpenses(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    void loadExpenses(token);
  }, [token]);

  const totalAmount = useMemo(
    () => expenses.reduce((sum, item) => sum + Number(item.amount), 0),
    [expenses]
  );

  function persistSession(auth: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, auth.token);
    localStorage.setItem(USER_KEY, JSON.stringify(auth));
    setToken(auth.token);
    setUser(auth);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setExpenses([]);
    setMessage(null);
    setError(null);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setError(null);
    setMessage(null);

    try {
      const auth = await login(loginForm.email, loginForm.password);
      persistSession(auth);
      setMessage('Login realizado com sucesso.');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Nao foi possivel entrar.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setError(null);
    setMessage(null);

    try {
      const auth = await register(
        registerForm.name,
        registerForm.email,
        registerForm.password
      );
      persistSession(auth);
      setMessage('Conta criada com sucesso.');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Nao foi possivel criar a conta.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError('Voce precisa estar autenticado para enviar notas.');
      return;
    }

    if (!selectedFile) {
      setError('Escolha um arquivo da galeria ou tire uma foto antes de enviar.');
      return;
    }

    setSubmitLoading(true);
    setError(null);
    setMessage(null);

    try {
      const created = await createExpense(
        token,
        buildExpensePayload(selectedFile),
        selectedFile
      );
      await submitExpense(token, created.id);
      await loadExpenses(token);
      setSelectedFile(null);
      setMessage('Nota enviada com sucesso e adicionada ao historico.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao enviar nota.');
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Reeva</span>
          <h1>Notas fiscais em um fluxo simples para o colaborador.</h1>
          <p>
            O usuario pode tirar a foto na hora, escolher um arquivo da galeria e
            acompanhar o historico completo de envios em um unico painel.
          </p>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <strong>{expenses.length}</strong>
            <span>notas no historico</span>
          </div>
          <div className="stat-card">
            <strong>
              {totalAmount.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </strong>
            <span>valor total enviado</span>
          </div>
        </div>
      </section>

      <section className="workspace-panel">
        {!token || !user ? (
          <div className="card auth-card">
            <div className="segmented">
              <button
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => setAuthMode('login')}
                type="button"
              >
                Entrar
              </button>
              <button
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => setAuthMode('register')}
                type="button"
              >
                Criar conta
              </button>
            </div>

            {authMode === 'login' ? (
              <form className="form-grid" onSubmit={handleLogin}>
                <label>
                  Email
                  <input
                    required
                    type="email"
                    value={loginForm.email}
                    onChange={(event) =>
                      setLoginForm((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Senha
                  <input
                    required
                    type="password"
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm((current) => ({ ...current, password: event.target.value }))
                    }
                  />
                </label>
                <button className="primary-button" disabled={authLoading} type="submit">
                  {authLoading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            ) : (
              <form className="form-grid" onSubmit={handleRegister}>
                <label>
                  Nome
                  <input
                    required
                    value={registerForm.name}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Email
                  <input
                    required
                    type="email"
                    value={registerForm.email}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Senha
                  <input
                    required
                    minLength={8}
                    type="password"
                    value={registerForm.password}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, password: event.target.value }))
                    }
                  />
                </label>
                <p className="helper-text">
                  O cadastro usa a empresa demo ja existente no backend.
                </p>
                <button className="primary-button" disabled={authLoading} type="submit">
                  {authLoading ? 'Criando...' : 'Criar conta'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            <div className="card dashboard-header">
              <div>
                <span className="eyebrow">Sessao ativa</span>
                <h2>{user.name}</h2>
                <p>{user.email}</p>
              </div>

              <div className="header-actions">
                <button
                  className="secondary-button"
                  onClick={() => void loadExpenses(token)}
                  type="button"
                >
                  Atualizar historico
                </button>
                <button className="ghost-button" onClick={logout} type="button">
                  Sair
                </button>
              </div>
            </div>

            <div className="dashboard-grid">
              <form className="card upload-card" onSubmit={handleExpenseSubmit}>
                <div className="section-heading">
                  <h3>Novo envio</h3>
                  <p>Escolha um comprovante da galeria ou tire a foto na hora.</p>
                </div>

                <div className="form-grid">
                  <div className="quick-upload-note">
                    Os dados da nota sao preenchidos automaticamente por enquanto. Basta
                    enviar a foto e acompanhar no historico.
                  </div>

                  <div className="upload-actions">
                    <label className="picker-button">
                      Escolher da galeria
                      <input
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        hidden
                        type="file"
                        onChange={(event) =>
                          setSelectedFile(event.target.files?.[0] ?? null)
                        }
                      />
                    </label>

                    <label className="picker-button subtle">
                      Tirar foto agora
                      <input
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        hidden
                        type="file"
                        onChange={(event) =>
                          setSelectedFile(event.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                  </div>

                  <div className="file-preview">
                    <span>Arquivo selecionado</span>
                    <strong>{selectedFile ? selectedFile.name : 'Nenhum arquivo escolhido'}</strong>
                  </div>
                </div>

                <button className="primary-button" disabled={submitLoading} type="submit">
                  {submitLoading ? 'Enviando...' : 'Enviar nota'}
                </button>
              </form>

              <div className="card history-card">
                <div className="section-heading">
                  <h3>Historico de notas</h3>
                  <p>As ultimas despesas enviadas aparecem aqui.</p>
                </div>

                {loadingExpenses ? (
                  <div className="empty-state">Carregando historico...</div>
                ) : expenses.length === 0 ? (
                  <div className="empty-state">
                    Nenhuma nota enviada ainda. O primeiro envio aparecera aqui.
                  </div>
                ) : (
                  <div className="expense-list">
                    {expenses.map((expense) => (
                      <article className="expense-item" key={expense.id}>
                        <div className="expense-topline">
                          <div>
                            <h4>{expense.title}</h4>
                            <p>
                              {categoryOptions.find((item) => item.value === expense.category)?.label}
                              {' - '}
                              {new Date(`${expense.expenseDate}T00:00:00`).toLocaleDateString(
                                'pt-BR'
                              )}
                            </p>
                          </div>
                          <span className={`status-pill status-${expense.status.toLowerCase()}`}>
                            {statusLabels[expense.status]}
                          </span>
                        </div>

                        <div className="expense-meta">
                          <strong>
                            {Number(expense.amount).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: expense.currency || 'BRL'
                            })}
                          </strong>
                          <span>
                            {paymentOptions.find(
                              (item) => item.value === expense.paymentMethod
                            )?.label ?? expense.paymentMethod}
                          </span>
                        </div>

                        {expense.description ? <p>{expense.description}</p> : null}

                        <div className="timeline">
                          {expense.statusHistory.map((item, index) => (
                            <div className="timeline-row" key={`${expense.id}-${index}`}>
                              <span>{statusLabels[item.toStatus]}</span>
                              <small>
                                {new Date(item.changedAt).toLocaleString('pt-BR')}
                              </small>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {message ? <div className="feedback success">{message}</div> : null}
        {error ? <div className="feedback error">{error}</div> : null}
      </section>
    </div>
  );
}

export default App;
