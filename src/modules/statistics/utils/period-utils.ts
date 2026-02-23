/**
 * Utility functions for calculating date ranges from period strategies
 */

export type PeriodType = 'calendar' | 'custom';

export interface CalendarPeriodConfig {
    reference: 'today' | 'yesterday' | 'wtd' | 'lastweek' | 'mtd' | 'lastmonth' | 'qtd' | 'lastquarter' | 'ytd' | 'lastyear';
}

export interface CustomPeriodConfig {
    start: string | Date;
    end: string | Date;
}

export interface PeriodStrategy {
    type: PeriodType;
    config: CalendarPeriodConfig | CustomPeriodConfig;
}

export interface DateRange {
    start: Date;
    end: Date;
}

/**
 * Calculate date range from a period strategy
 */
export function calculateDatesFromPeriod(period: PeriodStrategy, referenceDate: Date = new Date()): DateRange {
    const now = new Date(referenceDate);
    let start = new Date(now);
    let end = new Date(now);

    if (period.type === 'calendar') {
        const config = period.config as CalendarPeriodConfig;
        switch (config.reference) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'yesterday':
                start.setDate(now.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                end.setDate(now.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                break;
            case 'wtd':
                const dayOfWeek = now.getDay();
                const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                start.setDate(now.getDate() - daysToMonday);
                start.setHours(0, 0, 0, 0);
                break;
            case 'lastweek':
                const lastWeekStart = new Date(now);
                const lastWeekDay = lastWeekStart.getDay();
                const daysToLastMonday = lastWeekDay === 0 ? 13 : lastWeekDay + 6;
                lastWeekStart.setDate(now.getDate() - daysToLastMonday);
                lastWeekStart.setHours(0, 0, 0, 0);
                start = lastWeekStart;
                end = new Date(lastWeekStart);
                end.setDate(lastWeekStart.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                break;
            case 'mtd':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'lastmonth':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                break;
            case 'qtd':
                const quarter = Math.floor(now.getMonth() / 3);
                start = new Date(now.getFullYear(), quarter * 3, 1);
                break;
            case 'lastquarter':
                const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
                const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
                const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3;
                start = new Date(lastQuarterYear, lastQuarterMonth, 1);
                end = new Date(lastQuarterYear, lastQuarterMonth + 3, 0, 23, 59, 59, 999);
                break;
            case 'ytd':
                start = new Date(now.getFullYear(), 0, 1);
                break;
            case 'lastyear':
                start = new Date(now.getFullYear() - 1, 0, 1);
                end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
                break;
        }
    } else if (period.type === 'custom') {
        const config = period.config as CustomPeriodConfig;
        start = new Date(config.start);
        end = new Date(config.end);
    }

    return { start, end };
}
