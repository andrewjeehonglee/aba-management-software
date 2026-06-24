import { Download } from "lucide-react"
import type { AuditNoteBundleItem } from "@/lib/auditPull"
import {
  auditFilename,
  buildAuditCsvBundle,
  buildAuditTextBundle,
  downloadAuditPdfPacket,
  downloadTextFile,
} from "@/lib/auditExport"
import { P } from "@/pages/ClientOverviewPage/profileTokens"

interface AuditExportMenuProps {
  clientCode: string
  clientName: string
  startDate: string
  endDate: string
  items: AuditNoteBundleItem[]
  disabled?: boolean
}

export function AuditExportMenu({
  clientCode,
  clientName,
  startDate,
  endDate,
  items,
  disabled = false,
}: AuditExportMenuProps) {
  function handleTxt() {
    const content = buildAuditTextBundle(clientCode, clientName, startDate, endDate, items)
    downloadTextFile(auditFilename(clientCode, startDate, endDate, "txt"), content)
  }

  function handleCsv() {
    const content = buildAuditCsvBundle(clientCode, startDate, endDate, items)
    downloadTextFile(
      auditFilename(clientCode, startDate, endDate, "csv"),
      content,
      "text/csv;charset=utf-8",
    )
  }

  function handlePdf() {
    downloadAuditPdfPacket(clientCode, clientName, startDate, endDate, items)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 hidden text-[13px] font-medium sm:inline" style={{ color: P.faint }}>
        Export bundle
      </span>
      <ExportButton label=".txt" onClick={handleTxt} disabled={disabled} />
      <ExportButton label=".csv" onClick={handleCsv} disabled={disabled} variant="outline" />
      <ExportButton
        label="PDF packet"
        onClick={handlePdf}
        disabled={disabled}
        variant="primary"
        icon
      />
    </div>
  )
}

function ExportButton({
  label,
  onClick,
  disabled,
  variant = "outline",
  icon = false,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: "outline" | "primary"
  icon?: boolean
}) {
  const primary = variant === "primary"

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold disabled:opacity-50"
      style={
        primary
          ? { backgroundColor: P.sage, color: "#fff" }
          : { border: `1px solid ${P.rule}`, backgroundColor: P.sageBg, color: P.sageInk }
      }
    >
      {icon && <Download className="size-3.5" aria-hidden />}
      {label}
    </button>
  )
}
