import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { UserRole } from '../types/index'

import { Login } from '../pages/Login'

import { F01Home } from '../pages/funcionario/F01Home'
import { F02EnviarNF } from '../pages/funcionario/F02EnviarNF'
import { F03Historico } from '../pages/funcionario/F03Historico'
import { F04Detalhe } from '../pages/funcionario/F04Detalhe'
import { F05Perfil } from '../pages/funcionario/F05Perfil'

import { G01Dashboard } from '../pages/gerente/G01Dashboard'
import { G02Aprovacoes } from '../pages/gerente/G02Aprovacoes'
import { G03Alertas } from '../pages/gerente/G03Alertas'
import { G04Notas } from '../pages/gerente/G04Notas'
import { G05Funcionario } from '../pages/gerente/G05Funcionario'

import { C01Dashboard } from '../pages/cfo/C01Dashboard'
import { C02ROI } from '../pages/cfo/C02ROI'
import { C03Compliance } from '../pages/cfo/C03Compliance'
import { C04Notas } from '../pages/cfo/C04Notas'
import { C05Config } from '../pages/cfo/C05Config'

function RootRedirect() {
  const role = localStorage.getItem('reeva.role') as UserRole | null
  if (!role) return <Navigate to="/login" replace />
  if (role === 'FUNCIONARIO') return <Navigate to="/funcionario" replace />
  if (role === 'GERENTE') return <Navigate to="/gerente" replace />
  if (role === 'CFO') return <Navigate to="/cfo" replace />
  return <Navigate to="/login" replace />
}

function RequireRole({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const stored = localStorage.getItem('reeva.role') as UserRole | null
  if (!stored) return <Navigate to="/login" replace />
  if (stored !== role) return <RootRedirect />
  return <>{children}</>
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />

        {/* Funcionário */}
        <Route path="/funcionario" element={<RequireRole role="FUNCIONARIO"><F01Home /></RequireRole>} />
        <Route path="/funcionario/enviar" element={<RequireRole role="FUNCIONARIO"><F02EnviarNF /></RequireRole>} />
        <Route path="/funcionario/historico" element={<RequireRole role="FUNCIONARIO"><F03Historico /></RequireRole>} />
        <Route path="/funcionario/nota/:id" element={<RequireRole role="FUNCIONARIO"><F04Detalhe /></RequireRole>} />
        <Route path="/funcionario/perfil" element={<RequireRole role="FUNCIONARIO"><F05Perfil /></RequireRole>} />

        {/* Gerente */}
        <Route path="/gerente" element={<RequireRole role="GERENTE"><G01Dashboard /></RequireRole>} />
        <Route path="/gerente/aprovacoes" element={<RequireRole role="GERENTE"><G02Aprovacoes /></RequireRole>} />
        <Route path="/gerente/alertas" element={<RequireRole role="GERENTE"><G03Alertas /></RequireRole>} />
        <Route path="/gerente/notas" element={<RequireRole role="GERENTE"><G04Notas /></RequireRole>} />
        <Route path="/gerente/funcionario/:id" element={<RequireRole role="GERENTE"><G05Funcionario /></RequireRole>} />

        {/* CFO */}
        <Route path="/cfo" element={<RequireRole role="CFO"><C01Dashboard /></RequireRole>} />
        <Route path="/cfo/roi" element={<RequireRole role="CFO"><C02ROI /></RequireRole>} />
        <Route path="/cfo/compliance" element={<RequireRole role="CFO"><C03Compliance /></RequireRole>} />
        <Route path="/cfo/notas" element={<RequireRole role="CFO"><C04Notas /></RequireRole>} />
        <Route path="/cfo/configuracoes" element={<RequireRole role="CFO"><C05Config /></RequireRole>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
