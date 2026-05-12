import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { mockStaff } from "@/data/mockStaff"

export function HoursByStaffTile() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Hours by Staff (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {mockStaff.map((staff) => (
            <li
              key={staff.name}
              className="flex justify-between text-sm"
            >
              <span>{staff.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {staff.totalHours} hrs
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
