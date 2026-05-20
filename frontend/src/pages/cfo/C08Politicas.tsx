import {
  deleteCfoPolicy,
  getCfoPolicies,
  getCfoPolicyAuditLogs,
  saveCfoPolicy,
  uploadPolicyFile,
} from '../../api'
import { PolicyManagementPage } from '../gerente/G06Politicas'
import type { PolicyAuditLogResponse, PolicyPayload, PolicyResponse } from '../../types'

const cfoPolicyApi = {
  getPolicies: getCfoPolicies,
  getPolicyAuditLogs: getCfoPolicyAuditLogs,
  savePolicy: saveCfoPolicy,
  deletePolicy: deleteCfoPolicy,
  uploadPolicyFile,
} satisfies {
  getPolicies: (token: string) => Promise<PolicyResponse[]>
  getPolicyAuditLogs: (token: string) => Promise<PolicyAuditLogResponse[]>
  savePolicy: (token: string, payload: PolicyPayload) => Promise<PolicyResponse>
  deletePolicy: (token: string, policyId: string) => Promise<void>
  uploadPolicyFile: (token: string, file: File) => Promise<PolicyResponse[]>
}

export function C08Politicas() {
  return (
    <PolicyManagementPage
      role="CFO"
      title="Políticas de reembolso"
      responsibleFallback="CFO responsável"
      api={cfoPolicyApi}
    />
  )
}
