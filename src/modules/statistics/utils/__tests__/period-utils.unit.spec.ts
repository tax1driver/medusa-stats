process.env.TZ = "UTC"

import { calculateDatesFromPeriod } from "../period-utils"

describe("calculateDatesFromPeriod", () => {
    it("calculates today range", () => {
        const referenceDate = new Date("2026-02-23T12:00:00.000Z")

        const { start, end } = calculateDatesFromPeriod(
            { type: "calendar", config: { reference: "today" } },
            referenceDate
        )

        expect(start.toISOString()).toBe("2026-02-23T00:00:00.000Z")
        expect(end.toISOString()).toBe("2026-02-23T23:59:59.999Z")
    })

    it("calculates custom range", () => {
        const { start, end } = calculateDatesFromPeriod({
            type: "custom",
            config: {
                start: "2026-01-01T00:00:00.000Z",
                end: "2026-01-31T23:59:59.999Z",
            },
        })

        expect(start.toISOString()).toBe("2026-01-01T00:00:00.000Z")
        expect(end.toISOString()).toBe("2026-01-31T23:59:59.999Z")
    })
})

