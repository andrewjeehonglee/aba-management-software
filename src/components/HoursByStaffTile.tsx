import { TriangleAlert } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { mockStaff } from "@/data/mockStaff"
import { isStaffFlagged } from "@/lib/staff"

export function HoursByStaffTile() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Hours by Staff (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {mockStaff.map((staff) => {
            const flagged = isStaffFlagged(staff)
            return (
              <li
                key={staff.name}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  {flagged && (
                    <>
                      <TriangleAlert
                        className="h-4 w-4 text-amber-500"
                        aria-hidden="true"
                      />
                      <span className="sr-only">
                        Flagged: less than 50% direct hours
                      </span>
                    </>
                  )}
                  <span>{staff.name}</span>
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {staff.totalHours} hrs
                </span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
