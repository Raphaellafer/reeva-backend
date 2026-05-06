UPDATE expenses
SET status = 'MANAGER_APPROVED',
    manager_notes = COALESCE(manager_notes, 'Aprovado automaticamente pela IA.')
WHERE status = 'AI_APPROVED'
  AND ai_decision = 'AUTO_APPROVED'
  AND is_deleted = false;
