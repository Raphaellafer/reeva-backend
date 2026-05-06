import { useEffect, useState } from 'react';
import {
  approveExpense,
  getAttachmentBlob,
  getManagerDashboard,
  getTeamExpenses,
  rejectExpense,
  requestRevision
} from './api';
import type {
  AttachmentItem,
  AuthResponse,
  DashboardResponse,
  ExpenseResponse,
  ExpenseStatus
} from './types';

const statusLabels: Record<ExpenseStatus, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Enviada',
  AI_APPROVED: 'Aprovada pela IA',
  PENDING_REVIEW: 'Em revisao',
  MANAGER_APPROVED: 'Aprovada',
  MANAGER_REJECTED: 'Rejeitada',
  FINANCE_APPROVED: 'Aprovada fin.',
  FINANCE_REJECTED: 'Rejeitada fin.',
  PAID: 'Paga',
  CANCELLED: 'Cancelada',
  NEEDS_REVISION: 'Revisao necessaria'
};

const categoryLabels: Record<string, string> = {
  FOOD: 'Alimentacao',
  TRANSPORT: 'Transporte',
  LODGING: 'Hospedagem',
  PURCHASE: 'Compras'
};

const REVIEWABLE_STATUSES: ExpenseStatus[] = ['SUBMITTED', 'PENDING_REVIEW'];

const aiDecisionLabels: Record<string, string> = {
  AUTO_APPROVED: 'Autoaprovado',
  READY_FOR_MANAGER: 'Revisao do gestor',
  NEEDS_EMPLOYEE_CORRECTION: 'Correcao do funcionario',
  REJECTED_BY_POLICY: 'Fora da politica',
  PENDING_MANUAL_REVIEW: 'Revisao manual'
};

const sefazLabels: Record<string, string> = {
  NOT_APPLICABLE: 'Nao aplicavel',
  PENDING: 'Pendente',
  VALID: 'Valida',
  INVALID: 'Invalida',
  UNAVAILABLE: 'Indisponivel'
};

function formatCurrency(amount: number | null, currency = 'BRL') {
  if (amount == null) return 'Valor pendente';
  return Number(amount).toLocaleString('pt-BR', {
    style: 'currency',
    currency
  });
}

interface ReceiptLineItem {
  name: string;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
}

type OcrField<T> = {
  value?: T | null;
  raw_text?: string | null;
};

type NestedOcrLineItem = {
  name?: OcrField<string>;
  quantity?: OcrField<number | string>;
  unit_price?: OcrField<number | string>;
  total_price?: OcrField<number | string>;
};

function getReceiptLineItems(expense: ExpenseResponse): ReceiptLineItem[] {
  if (!expense.ocrData) return [];

  try {
    const parsed = JSON.parse(expense.ocrData) as {
      line_items?: ReceiptLineItem[];
      extraction?: { line_items?: NestedOcrLineItem[] };
    };
    if (Array.isArray(parsed.extraction?.line_items)) {
      return parsed.extraction.line_items.map((item) => ({
        name: readTextField(item.name) ?? '',
        quantity: readNumberField(item.quantity),
        unit_price: readNumberField(item.unit_price),
        total_price: readNumberField(item.total_price)
      })).filter((item) => item.name.trim().length > 0);
    }
    if (!Array.isArray(parsed.line_items)) return [];
    return parsed.line_items.filter((item) => item.name && item.name.trim().length > 0);
  } catch {
    return [];
  }
}

function readTextField(field: OcrField<string> | undefined) {
  return field?.value ?? field?.raw_text ?? null;
}

function readNumberField(field: OcrField<number | string> | undefined) {
  const raw = field?.raw_text ?? field?.value;
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') return raw;
  const normalized = raw.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

type FilterStatus = 'ALL' | ExpenseStatus;

interface Props {
  token: string;
  user: AuthResponse;
  onLogout: () => void;
}

interface ModalState {
  expense: ExpenseResponse;
  rejectNotes: string;
  revisionNotes: string;
  action: 'none' | 'reject' | 'revision';
}

function AttachmentPreview({ attachment, token }: { attachment: AttachmentItem; token: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    getAttachmentBlob(token, attachment.id)
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Falha ao carregar anexo.');
      });

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachment.id, token]);

  if (error) {
    return <div className="attachment-error">{error}</div>;
  }

  if (!objectUrl) {
    return <div className="attachment-loading">Carregando anexo...</div>;
  }

  return attachment.mimeType?.startsWith('image/') ? (
    <a href={objectUrl} target="_blank" rel="noopener noreferrer">
      <img src={objectUrl} alt={attachment.fileName} className="attachment-preview" />
    </a>
  ) : (
    <a href={objectUrl} target="_blank" rel="noopener noreferrer">
      Abrir documento
    </a>
  );
}

export default function ManagerDashboard({ token, user, onLogout }: Props) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);

  async function loadDashboard() {
    try {
      const data = await getManagerDashboard(token);
      setDashboard(data);
    } catch {
      /* non-blocking */
    }
  }

  async function loadExpenses(page = 0, status: FilterStatus = filterStatus) {
    setLoading(true);
    setError(null);
    try {
      const result = await getTeamExpenses(
        token,
        status === 'ALL' ? undefined : status,
        page,
        20
      );
      setExpenses(result.content);
      setTotalPages(result.totalPages);
      setCurrentPage(result.number);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar despesas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
    void loadExpenses(0, filterStatus);
  }, []);

  function handleFilterChange(status: FilterStatus) {
    setFilterStatus(status);
    void loadExpenses(0, status);
  }

  async function handleApprove(expenseId: string) {
    setActionLoading(true);
    setError(null);
    try {
      await approveExpense(token, expenseId);
      setSuccess('Despesa aprovada.');
      setModal(null);
      await Promise.all([loadDashboard(), loadExpenses(currentPage)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao aprovar.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(expenseId: string, notes: string) {
    if (!notes.trim()) { setError('Informe o motivo da rejeicao.'); return; }
    setActionLoading(true);
    setError(null);
    try {
      await rejectExpense(token, expenseId, notes);
      setSuccess('Despesa rejeitada.');
      setModal(null);
      await Promise.all([loadDashboard(), loadExpenses(currentPage)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao rejeitar.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRequestRevision(expenseId: string, notes: string) {
    if (!notes.trim()) { setError('Informe o motivo da revisao.'); return; }
    setActionLoading(true);
    setError(null);
    try {
      await requestRevision(token, expenseId, notes);
      setSuccess('Revisao solicitada ao colaborador.');
      setModal(null);
      await Promise.all([loadDashboard(), loadExpenses(currentPage)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao solicitar revisao.');
    } finally {
      setActionLoading(false);
    }
  }

  function openModal(expense: ExpenseResponse) {
    setModal({ expense, rejectNotes: '', revisionNotes: '', action: 'none' });
    setError(null);
    setSuccess(null);
  }

  const filterOptions: Array<{ value: FilterStatus; label: string }> = [
    { value: 'ALL', label: 'Todas' },
    { value: 'SUBMITTED', label: 'Enviadas' },
    { value: 'AI_APPROVED', label: 'Aprovadas IA' },
    { value: 'PENDING_REVIEW', label: 'Em revisao' },
    { value: 'MANAGER_APPROVED', label: 'Aprovadas' },
    { value: 'MANAGER_REJECTED', label: 'Rejeitadas' },
    { value: 'NEEDS_REVISION', label: 'Aguardando revisao' }
  ];

  const modalLineItems = modal ? getReceiptLineItems(modal.expense) : [];

  return (
    <div className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Reeva Finance OS</span>
          <h1>Controle de reembolsos com IA, politica e ROI.</h1>
          <p>Priorize excecoes, acompanhe economia operacional e transforme notas fiscais em decisao financeira.</p>
        </div>

        {dashboard && (
          <div className="hero-stats">
            <div className="stat-card">
              <strong>{dashboard.pendingCount}</strong>
              <span>pendentes</span>
            </div>
            <div className="stat-card">
              <strong>{dashboard.approvedCount}</strong>
              <span>aprovadas</span>
            </div>
            <div className="stat-card">
              <strong>
                {Number(dashboard.approvedTotalAmount).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </strong>
              <span>total aprovado</span>
            </div>
            <div className="stat-card">
              <strong>{dashboard.teamSize}</strong>
              <span>pessoas no time</span>
            </div>
            <div className="stat-card accent">
              <strong>{dashboard.automationRate}%</strong>
              <span>taxa de automacao</span>
            </div>
            <div className="stat-card accent">
              <strong>
                {Number(dashboard.estimatedSavingsAmount).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </strong>
              <span>economia estimada</span>
            </div>
          </div>
        )}
      </section>

      <section className="workspace-panel">
        <div className="card dashboard-header">
          <div>
            <span className="eyebrow">Sessao ativa</span>
            <h2>{user.name}</h2>
            <p>{user.email} - Gestor financeiro</p>
          </div>
          <div className="header-actions">
            <button className="secondary-button" onClick={() => void loadExpenses(currentPage)} type="button">
              Atualizar
            </button>
            <button className="ghost-button" onClick={onLogout} type="button">
              Sair
            </button>
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <h3>Fila inteligente de reembolsos</h3>
            <p>Casos com maior risco aparecem com score, politica e validacao fiscal para decisao rapida.</p>
          </div>

          {dashboard && (
            <div className="insight-grid">
              <div className="insight-card">
                <span>Autoaprovadas</span>
                <strong>{dashboard.autoApprovedCount}</strong>
              </div>
              <div className="insight-card">
                <span>Revisao manual</span>
                <strong>{dashboard.manualReviewCount}</strong>
              </div>
              <div className="insight-card danger">
                <span>Fora da politica</span>
                <strong>{dashboard.policyViolationCount}</strong>
              </div>
            </div>
          )}

          <div className="filter-row">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={filterStatus === opt.value ? 'filter-btn active' : 'filter-btn'}
                onClick={() => handleFilterChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="empty-state">Carregando...</div>
          ) : expenses.length === 0 ? (
            <div className="empty-state">Nenhuma despesa encontrada.</div>
          ) : (
            <div className="expense-list">
              {expenses.map((expense) => (
                <article className="expense-item" key={expense.id}>
                  <div className="expense-topline">
                    <div>
                      <h4>{expense.title}</h4>
                      <p>
                        {expense.userName} &middot;{' '}
                        {categoryLabels[expense.category] ?? expense.category} &middot;{' '}
                        {new Date(`${expense.expenseDate}T00:00:00`).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className={`status-pill status-${expense.status.toLowerCase()}`}>
                      {statusLabels[expense.status]}
                    </span>
                  </div>

                  <div className="expense-meta">
                    <strong>{formatCurrency(expense.amount, expense.currency || 'BRL')}</strong>
                    {expense.aiScore != null && (
                      <span className={`score-chip ${expense.aiScore > 90 ? 'score-good' : expense.aiScore > 70 ? 'score-warn' : 'score-risk'}`}>
                        Score IA {expense.aiScore}
                      </span>
                    )}
                    {expense.aiAlertLevel && expense.aiAlertLevel !== 'NONE' && (
                      <span className={`alert-badge alert-${expense.aiAlertLevel.toLowerCase()}`}>
                        Alerta IA: {expense.aiAlertLevel}
                      </span>
                    )}
                  </div>

                  <div className="decision-strip">
                    <span>{expense.aiDecision ? aiDecisionLabels[expense.aiDecision] ?? expense.aiDecision : 'Aguardando IA'}</span>
                    <span>Politica: {expense.policyCompliant == null ? 'pendente' : expense.policyCompliant ? 'ok' : 'violacao'}</span>
                    <span>SEFAZ: {expense.sefazStatus ? sefazLabels[expense.sefazStatus] ?? expense.sefazStatus : 'pendente'}</span>
                  </div>

                  {expense.aiAnalysis && (
                    <p className="ai-analysis">{expense.aiAnalysis}</p>
                  )}

                  <div className="expense-actions">
                    <button className="secondary-button" type="button" onClick={() => openModal(expense)}>
                      Ver detalhes
                    </button>
                    {REVIEWABLE_STATUSES.includes(expense.status) && (
                      <>
                        <button
                          className="primary-button"
                          type="button"
                          disabled={actionLoading}
                          onClick={() => void handleApprove(expense.id)}
                        >
                          Aprovar
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => { openModal(expense); setModal(m => m ? { ...m, action: 'reject' } : null); }}
                        >
                          Rejeitar
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => { openModal(expense); setModal(m => m ? { ...m, action: 'revision' } : null); }}
                        >
                          Pedir revisao
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                disabled={currentPage === 0}
                className="secondary-button"
                onClick={() => void loadExpenses(currentPage - 1)}
              >
                Anterior
              </button>
              <span>{currentPage + 1} / {totalPages}</span>
              <button
                type="button"
                disabled={currentPage >= totalPages - 1}
                className="secondary-button"
                onClick={() => void loadExpenses(currentPage + 1)}
              >
                Proximo
              </button>
            </div>
          )}
        </div>

        {success && <div className="feedback success">{success}</div>}
        {error && <div className="feedback error">{error}</div>}
      </section>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal.expense.title}</h3>
              <button type="button" className="ghost-button" onClick={() => setModal(null)}>
                Fechar
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-grid">
                <div>
                  <span className="detail-label">Colaborador</span>
                  <span>{modal.expense.userName}</span>
                </div>
                <div>
                  <span className="detail-label">Categoria</span>
                  <span>{categoryLabels[modal.expense.category] ?? modal.expense.category}</span>
                </div>
                <div>
                  <span className="detail-label">Valor</span>
                  <span>{formatCurrency(modal.expense.amount, modal.expense.currency || 'BRL')}</span>
                </div>
                <div>
                  <span className="detail-label">Data</span>
                  <span>{new Date(`${modal.expense.expenseDate}T00:00:00`).toLocaleDateString('pt-BR')}</span>
                </div>
                <div>
                  <span className="detail-label">Status</span>
                  <span className={`status-pill status-${modal.expense.status.toLowerCase()}`}>
                    {statusLabels[modal.expense.status]}
                  </span>
                </div>
                {modal.expense.aiScore != null && (
                  <div>
                    <span className="detail-label">Score IA</span>
                    <span>{modal.expense.aiScore}/100</span>
                  </div>
                )}
                <div>
                  <span className="detail-label">Decisao IA</span>
                  <span>{modal.expense.aiDecision ? aiDecisionLabels[modal.expense.aiDecision] ?? modal.expense.aiDecision : 'Pendente'}</span>
                </div>
                <div>
                  <span className="detail-label">Politica</span>
                  <span>{modal.expense.policyCompliant == null ? 'Pendente' : modal.expense.policyCompliant ? 'Dentro da politica' : 'Fora da politica'}</span>
                </div>
                <div>
                  <span className="detail-label">SEFAZ</span>
                  <span>{modal.expense.sefazStatus ? sefazLabels[modal.expense.sefazStatus] ?? modal.expense.sefazStatus : 'Pendente'}</span>
                </div>
                <div>
                  <span className="detail-label">Autoaprovavel</span>
                  <span>{modal.expense.autoApprovalEligible ? 'Sim' : 'Nao'}</span>
                </div>
              </div>

              {modal.expense.description && (
                <div className="detail-section">
                  <span className="detail-label">Descricao</span>
                  <p>{modal.expense.description}</p>
                </div>
              )}

              {modal.expense.aiAnalysis && (
                <div className="detail-section">
                  <span className="detail-label">Analise da IA</span>
                  <p className="ai-analysis">{modal.expense.aiAnalysis}</p>
                </div>
              )}

              {(modal.expense.policyViolationReason || modal.expense.sefazValidationMessage || modal.expense.manualReviewReason) && (
                <div className="risk-panel">
                  {modal.expense.policyViolationReason && <p><strong>Politica:</strong> {modal.expense.policyViolationReason}</p>}
                  {modal.expense.sefazValidationMessage && <p><strong>SEFAZ:</strong> {modal.expense.sefazValidationMessage}</p>}
                  {modal.expense.manualReviewReason && <p><strong>Revisao:</strong> {modal.expense.manualReviewReason}</p>}
                </div>
              )}

              <div className="detail-section">
                <span className="detail-label">Produtos da nota</span>
                {modalLineItems.length > 0 ? (
                  <div className="line-item-list">
                    {modalLineItems.map((item, index) => (
                      <div className="line-item-row" key={`${item.name}-${index}`}>
                        <div>
                          <strong>{item.name}</strong>
                          {item.quantity != null && (
                            <span>Qtd. {Number(item.quantity).toLocaleString('pt-BR')}</span>
                          )}
                        </div>
                        <div className="line-item-price">
                          {item.total_price != null
                            ? formatCurrency(item.total_price, modal.expense.currency || 'BRL')
                            : item.unit_price != null
                              ? formatCurrency(item.unit_price, modal.expense.currency || 'BRL')
                              : 'Preco pendente'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-inline">
                    Itens ainda nao extraidos. Quando o OCR estiver ativo, eles aparecerao aqui.
                  </div>
                )}
              </div>

              {modal.expense.attachments.length > 0 && (
                <div className="detail-section">
                  <span className="detail-label">Anexos</span>
                  <div className="attachment-list">
                    {modal.expense.attachments.map((att) => (
                      <div key={att.id} className="attachment-item">
                        <AttachmentPreview attachment={att} token={token} />
                        <span className="attachment-name">{att.fileName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-section">
                <span className="detail-label">Historico</span>
                <div className="timeline">
                  {modal.expense.statusHistory.map((item, i) => (
                    <div className="timeline-row" key={i}>
                      <span>{statusLabels[item.toStatus]}</span>
                      {item.notes && <small>{item.notes}</small>}
                      <small>{new Date(item.changedAt).toLocaleString('pt-BR')}</small>
                    </div>
                  ))}
                </div>
              </div>

              {REVIEWABLE_STATUSES.includes(modal.expense.status) && (
                <div className="modal-actions">
                  {modal.action === 'none' && (
                    <div className="action-row">
                      <button
                        className="primary-button"
                        type="button"
                        disabled={actionLoading}
                        onClick={() => void handleApprove(modal.expense.id)}
                      >
                        {actionLoading ? 'Processando...' : 'Aprovar'}
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => setModal(m => m ? { ...m, action: 'reject' } : null)}
                      >
                        Rejeitar
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => setModal(m => m ? { ...m, action: 'revision' } : null)}
                      >
                        Pedir revisao
                      </button>
                    </div>
                  )}

                  {modal.action === 'reject' && (
                    <div className="form-grid">
                      <label>
                        Motivo da rejeicao
                        <textarea
                          rows={3}
                          value={modal.rejectNotes}
                          onChange={(e) => setModal(m => m ? { ...m, rejectNotes: e.target.value } : null)}
                          placeholder="Descreva o motivo..."
                        />
                      </label>
                      <div className="action-row">
                        <button
                          className="primary-button"
                          type="button"
                          disabled={actionLoading}
                          onClick={() => void handleReject(modal.expense.id, modal.rejectNotes)}
                        >
                          {actionLoading ? 'Processando...' : 'Confirmar rejeicao'}
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => setModal(m => m ? { ...m, action: 'none' } : null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {modal.action === 'revision' && (
                    <div className="form-grid">
                      <label>
                        O que precisa ser revisado?
                        <textarea
                          rows={3}
                          value={modal.revisionNotes}
                          onChange={(e) => setModal(m => m ? { ...m, revisionNotes: e.target.value } : null)}
                          placeholder="Ex: foto da nota muito escura, valor incorreto..."
                        />
                      </label>
                      <div className="action-row">
                        <button
                          className="primary-button"
                          type="button"
                          disabled={actionLoading}
                          onClick={() => void handleRequestRevision(modal.expense.id, modal.revisionNotes)}
                        >
                          {actionLoading ? 'Processando...' : 'Solicitar revisao'}
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => setModal(m => m ? { ...m, action: 'none' } : null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
