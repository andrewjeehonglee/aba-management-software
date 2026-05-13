export interface ClientAuthorization {
  clientName: string
  utilizationPct: number       // 0-100, percentage of authorized hours used this period
  totalAuthorizedHours: number // total hours authorized by insurance this period
}
