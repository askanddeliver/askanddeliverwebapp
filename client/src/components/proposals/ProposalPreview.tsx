import type { CSSProperties } from 'react';
import type { CompanyInfo, ProposalInvestment, ProposalPhase, ThemeColors } from '../../types';
import { formatCurrency, formatDate } from '../../utils/calculations';
import { ProposalMarkdownBody } from './ProposalMarkdownBody';
import { ProposalWordmark } from './ProposalWordmark';

export interface ProposalPreviewModel {
  proposalNumber: string;
  title: string;
  proposalDate: string;
  companyInfo: CompanyInfo;
  clientInfo: {
    name: string;
    company?: string;
    email?: string;
    businessEntity?: string;
    address?: string;
  };
  projectTitle?: string;
  introduction: string;
  challenge: string;
  solution: string;
  assumptions?: string;
  phases: ProposalPhase[];
  investment: ProposalInvestment;
  terms: string;
  accentSnapshot: ThemeColors;
}

function accentVars(c: ThemeColors): CSSProperties {
  return {
    ['--prop-accent' as string]: c.brandSage,
    ['--prop-accent-dark' as string]: c.brandSageDark,
    ['--prop-accent-light' as string]: c.brandSageLight,
    ['--prop-warm' as string]: c.accentWarm,
    ['--prop-cool' as string]: c.accentCool,
    ['--prop-charcoal' as string]: c.brandCharcoal,
    ['--prop-cream' as string]: c.brandCream,
    ['--prop-cream-dark' as string]: c.brandCreamDark,
  };
}

interface ProposalPreviewProps {
  model: ProposalPreviewModel;
}

function formatContactBlock(info: CompanyInfo): string[] {
  const lines: string[] = [];
  if (info.name?.trim()) lines.push(info.name.trim());
  if (info.phone?.trim()) lines.push(info.phone.trim());
  if (info.email?.trim()) lines.push(info.email.trim());
  if (info.address?.trim()) lines.push(info.address.trim());
  return lines;
}

export function ProposalPreview({ model }: ProposalPreviewProps) {
  const { companyInfo, clientInfo, accentSnapshot } = model;
  const contactLines = formatContactBlock(companyInfo);
  const year = new Date().getFullYear();

  const phaseShowHours = model.phases.some((p) => p.estimatedHours != null);
  const phaseShowDuration = model.phases.some((p) => p.duration?.trim());
  const invShowHours = model.investment.lineItems.some((r) => r.hours != null);
  const invShowDuration = model.investment.lineItems.some((r) => r.duration?.trim());
  const invColCount =
    1 + (invShowHours ? 1 : 0) + (invShowDuration ? 1 : 0) + 1;

  return (
    <div
      id="proposal-preview"
      data-proposal-theme
      className="card print:p-0 print:overflow-visible proposal-doc bg-white overflow-x-clip"
      style={accentVars(accentSnapshot)}
    >
      {/* Cover: full-bleed palette header + title only (contact → last page) */}
      <header className="proposal-cover-header mb-8 print:mb-6 break-inside-avoid shadow-sm print:shadow-none proposal-print-color">
        <div className="proposal-full-bleed">
          <div
            className="proposal-full-bleed-pad proposal-cover-brandribbon py-4 print:py-3.5 flex flex-wrap items-end justify-between gap-4"
            style={{
              background: `linear-gradient(118deg, var(--prop-accent-dark) 0%, var(--prop-accent) 52%, var(--prop-warm) 100%)`,
              borderBottom: '3px solid rgba(255, 255, 255, 0.28)',
            }}
          >
            <div className="min-w-0">
              <ProposalWordmark fill="var(--prop-cream)" className="proposal-wordmark--hero" />
              <p className="text-white/80 text-[11px] mt-2 font-medium">Creative collective</p>
            </div>
            <div className="text-right text-white shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/75">Proposal</p>
              <p className="text-xl font-bold leading-tight print:text-lg">
                {model.proposalNumber || 'Draft'}
              </p>
            </div>
          </div>
        </div>
        <div className="proposal-full-bleed">
          <div
            className="proposal-full-bleed-pad py-5 print:py-4"
            style={{
              backgroundColor: 'var(--prop-cream)',
              borderBottom: '2px solid var(--prop-accent-light)',
            }}
          >
            <h2
              className="text-2xl font-bold print:text-xl leading-tight"
              style={{ color: 'var(--prop-charcoal)' }}
            >
              {model.title}
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-medium">{formatDate(model.proposalDate)}</p>
            {model.projectTitle ? (
              <p className="text-sm font-semibold mt-2" style={{ color: 'var(--prop-accent)' }}>
                Project: {model.projectTitle}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <section className="mb-8 print:mb-6 break-inside-avoid">
        <h4
          className="text-sm font-bold uppercase tracking-wide mb-2 pb-1 border-b"
          style={{ borderColor: 'var(--prop-accent-light)', color: 'var(--prop-accent-dark)' }}
        >
          Introduction
        </h4>
        <ProposalMarkdownBody content={model.introduction} />
      </section>

      <section className="mb-8 print:mb-6 break-inside-avoid">
        <h4
          className="text-sm font-bold uppercase tracking-wide mb-2 pb-1 border-b"
          style={{ borderColor: 'var(--prop-accent-light)', color: 'var(--prop-accent-dark)' }}
        >
          Challenge
        </h4>
        <ProposalMarkdownBody content={model.challenge} />
      </section>

      <section className="mb-8 print:mb-6 break-inside-avoid">
        <h4
          className="text-sm font-bold uppercase tracking-wide mb-2 pb-1 border-b"
          style={{ borderColor: 'var(--prop-accent-light)', color: 'var(--prop-accent-dark)' }}
        >
          Solution
        </h4>
        <ProposalMarkdownBody content={model.solution} />
      </section>

      {model.phases.length > 0 && (
        <section className="mb-8 print:mb-6">
          <h4
            className="text-sm font-bold uppercase tracking-wide mb-4 pb-1 border-b break-inside-avoid"
            style={{ borderColor: 'var(--prop-accent-light)', color: 'var(--prop-accent-dark)' }}
          >
            Phase breakdown
          </h4>
          {(phaseShowHours || phaseShowDuration || model.phases.some((p) => p.estimatedCost != null)) && (
            <div className="overflow-x-auto print:overflow-visible mb-6">
              <table className="proposal-data-table w-full text-sm break-inside-avoid">
                <thead>
                  <tr
                    className="border-b-2 border-gray-200"
                    style={{ borderColor: 'var(--prop-accent-light)' }}
                  >
                    <th className="proposal-tcol-item text-left py-2 font-bold text-gray-600">Phase</th>
                    {phaseShowHours && (
                      <th className="proposal-tcol-hours text-right py-2 font-bold text-gray-600 whitespace-nowrap">
                        Hours
                      </th>
                    )}
                    {phaseShowDuration && (
                      <th className="proposal-tcol-timeline text-left py-2 font-bold text-gray-600 whitespace-nowrap">
                        Timeline
                      </th>
                    )}
                    <th className="proposal-tcol-amount text-right py-2 font-bold text-gray-600 whitespace-nowrap">
                      Est. investment
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {model.phases.map((phase, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="proposal-tcol-item py-2 text-gray-900 font-medium align-top">
                        {phase.name}
                      </td>
                      {phaseShowHours && (
                        <td className="proposal-tcol-hours py-2 text-right text-gray-700 align-top whitespace-nowrap">
                          {phase.estimatedHours != null ? `${phase.estimatedHours}\u00A0h` : '—'}
                        </td>
                      )}
                      {phaseShowDuration && (
                        <td className="proposal-tcol-timeline py-2 text-gray-700 align-top whitespace-nowrap">
                          {phase.duration?.trim() ||
                            (phase.startDate || phase.endDate
                              ? `${phase.startDate || '—'} – ${phase.endDate || '—'}`
                              : '—')}
                        </td>
                      )}
                      <td className="proposal-tcol-amount py-2 text-right font-medium align-top whitespace-nowrap">
                        {phase.estimatedCost != null ? formatCurrency(phase.estimatedCost) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ol className="space-y-6 list-decimal list-inside marker:font-bold marker:text-[var(--prop-accent)]">
            {model.phases.map((phase, idx) => (
              <li key={idx} className="break-inside-avoid pl-1">
                <span className="font-semibold text-gray-900">{phase.name}</span>
                {phase.summary ? (
                  <div className="mt-1 ml-6 text-gray-700">
                    <ProposalMarkdownBody content={phase.summary} />
                  </div>
                ) : null}
                {phase.bullets.length > 0 && (
                  <ul className="mt-2 ml-6 list-disc text-gray-700 text-sm space-y-1">
                    {phase.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mb-8 print:mb-6">
        <h4
          className="text-sm font-bold uppercase tracking-wide mb-3 pb-1 border-b break-inside-avoid"
          style={{ borderColor: 'var(--prop-accent-light)', color: 'var(--prop-accent-dark)' }}
        >
          Investment
        </h4>
        <div className="overflow-x-auto print:overflow-visible">
          <table className="proposal-data-table w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200" style={{ borderColor: 'var(--prop-accent-light)' }}>
                <th className="proposal-tcol-item text-left py-2 font-bold text-gray-600">Item</th>
                {invShowHours && (
                  <th className="proposal-tcol-hours text-right py-2 font-bold text-gray-600 whitespace-nowrap">
                    Hours
                  </th>
                )}
                {invShowDuration && (
                  <th className="proposal-tcol-timeline text-left py-2 font-bold text-gray-600 whitespace-nowrap">
                    Timeline
                  </th>
                )}
                <th className="proposal-tcol-amount text-right py-2 font-bold text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody>
              {model.investment.lineItems.length === 0 ? (
                <tr>
                  <td colSpan={invColCount} className="py-3 text-gray-400 italic">
                    No line items
                  </td>
                </tr>
              ) : (
                model.investment.lineItems.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="proposal-tcol-item py-2 text-gray-800">{row.label}</td>
                    {invShowHours && (
                      <td className="proposal-tcol-hours py-2 text-right text-gray-700 whitespace-nowrap">
                        {row.hours != null ? `${row.hours}\u00A0h` : '—'}
                      </td>
                    )}
                    {invShowDuration && (
                      <td className="proposal-tcol-timeline py-2 text-gray-700 whitespace-nowrap">
                        {row.duration?.trim() || '—'}
                      </td>
                    )}
                    <td className="proposal-tcol-amount py-2 text-right font-medium whitespace-nowrap">
                      {formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td
                  colSpan={Math.max(1, invColCount - 1)}
                  className="py-2 text-right font-semibold text-gray-600"
                >
                  Subtotal
                </td>
                <td className="py-2 text-right font-semibold">{formatCurrency(model.investment.subtotal)}</td>
              </tr>
              {(model.investment.fees ?? 0) !== 0 && (
                <tr>
                  <td
                    colSpan={Math.max(1, invColCount - 1)}
                    className="py-2 text-right text-gray-600"
                  >
                    Fees
                  </td>
                  <td className="py-2 text-right">{formatCurrency(model.investment.fees)}</td>
                </tr>
              )}
              <tr className="border-t-2" style={{ borderColor: 'var(--prop-accent)' }}>
                <td
                  colSpan={Math.max(1, invColCount - 1)}
                  className="py-3 text-right font-bold text-gray-800"
                >
                  Total
                </td>
                <td className="py-3 text-right text-lg font-bold" style={{ color: 'var(--prop-accent-dark)' }}>
                  {formatCurrency(model.investment.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {model.investment.notes?.trim() ? (
          <div className="mt-3 text-sm text-gray-600">
            <ProposalMarkdownBody content={model.investment.notes} />
          </div>
        ) : null}
      </section>

      {model.terms.trim() ? (
        <section className="mb-6 print:mb-4 break-inside-avoid">
          <h4
            className="text-sm font-bold uppercase tracking-wide mb-2 pb-1 border-b"
            style={{ borderColor: 'var(--prop-accent-light)', color: 'var(--prop-accent-dark)' }}
          >
            Terms
          </h4>
          <ProposalMarkdownBody content={model.terms} />
        </section>
      ) : null}

      {model.assumptions?.trim() ? (
        <section className="mb-6 print:mb-4 break-inside-avoid">
          <h4
            className="text-sm font-bold uppercase tracking-wide mb-2 pb-1 border-b"
            style={{ borderColor: 'var(--prop-accent-light)', color: 'var(--prop-accent-dark)' }}
          >
            Assumptions & exclusions
          </h4>
          <ProposalMarkdownBody content={model.assumptions} />
        </section>
      ) : null}

      {/* Last page: party contacts (full bleed) + branded closing bar */}
      <footer className="proposal-closing-footer mt-14 print:mt-12 break-inside-avoid proposal-print-color">
        <div className="proposal-full-bleed">
          <div
            className="proposal-full-bleed-pad py-8 print:py-7 border-t-2"
            style={{
              backgroundColor: 'var(--prop-cream)',
              borderColor: 'var(--prop-accent-light)',
            }}
          >
            <h3
              className="text-xs font-bold uppercase tracking-wider mb-6"
              style={{ color: 'var(--prop-accent-dark)' }}
            >
              Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Prepared for
                </p>
                <p className="font-semibold text-gray-900 text-base">
                  {clientInfo.businessEntity || clientInfo.name}
                </p>
                {clientInfo.businessEntity && clientInfo.name !== clientInfo.businessEntity && (
                  <p className="text-gray-700 mt-1">{clientInfo.name}</p>
                )}
                {clientInfo.company && <p className="text-gray-600 mt-1">{clientInfo.company}</p>}
                {clientInfo.address && (
                  <p className="text-gray-700 mt-2 whitespace-pre-line">{clientInfo.address}</p>
                )}
                {clientInfo.email && <p className="text-gray-600 mt-2">{clientInfo.email}</p>}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Prepared by
                </p>
                {contactLines.length > 0 ? (
                  <div className="space-y-1.5 text-gray-800">
                    {contactLines.map((line, i) => (
                      <p key={i} className={i === 0 ? 'font-semibold text-gray-900' : ''}>
                        {line}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Add company details in Site Config.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="proposal-full-bleed">
          <div
            className="overflow-hidden"
            style={{
              background: `linear-gradient(180deg, var(--prop-charcoal) 0%, var(--prop-accent-dark) 100%)`,
              borderTop: '4px solid var(--prop-accent)',
            }}
          >
            <div className="proposal-full-bleed-pad py-6 print:py-5 flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-4 min-w-0">
                <ProposalWordmark fill="var(--prop-cream)" className="proposal-wordmark--footer" />
                <p className="text-white/75 text-[11px] pb-0.5 font-medium">Creative collective</p>
              </div>
            </div>
            <div className="proposal-full-bleed-pad text-center py-3 text-[10px] sm:text-[11px] border-t border-white/10 bg-black/25">
              <p className="text-white/90 font-medium">
                Thank you for your consideration &middot; We look forward to working with you.
              </p>
              <p className="text-white/55 mt-1">&copy; {year} Ask+Deliver. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
