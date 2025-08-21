/**
 * Service for calculating logical dates based on custom day boundaries
 * Supports local timezone and configurable day boundary times
 */
export class DateCalculator {
    /**
     * Get logical date based on current time and boundary configuration
     * @param now Current date/time
     * @param boundaryTime Day boundary in HH:MM format (e.g., "02:00")
     * @returns Logical date in YYYY-MM-DD format
     */
    public getLogicalDate(now: Date, boundaryTime: string): string {
        const { hour, minute } = this.parseBoundaryTime(boundaryTime);
        const logicalDate = this.calculateLogicalDate(now, hour, minute);
        return this.formatLocalDate(logicalDate);
    }

    /**
     * Format date in local timezone as YYYY-MM-DD
     * @param date Date to format
     * @returns Formatted date string
     */
    public formatLocalDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Format date and time in local timezone
     * @param date Date to format
     * @returns Formatted datetime string with timezone info
     */
    public formatLocalDateTime(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        // Get timezone offset in format +09:00 or -05:00
        const offsetMinutes = -date.getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
        const offsetMins = Math.abs(offsetMinutes) % 60;
        const offsetSign = offsetMinutes >= 0 ? '+' : '-';
        const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetString}`;
    }

    /**
     * Validate boundary time format
     * @param boundaryTime Time string to validate
     * @returns True if valid format
     */
    public isValidBoundaryTime(boundaryTime: string): boolean {
        const pattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
        return pattern.test(boundaryTime);
    }

    /**
     * Calculate logical date based on boundary time
     * @param now Current date/time
     * @param boundaryHour Boundary hour (0-23)
     * @param boundaryMinute Boundary minute (0-59)
     * @returns Logical date
     */
    private calculateLogicalDate(now: Date, boundaryHour: number, boundaryMinute: number): Date {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Convert to minutes since start of day for comparison
        const currentMinutes = currentHour * 60 + currentMinute;
        const boundaryMinutes = boundaryHour * 60 + boundaryMinute;
        
        // If current time is before boundary, subtract one day
        if (currentMinutes < boundaryMinutes) {
            const logicalDate = new Date(now);
            logicalDate.setDate(logicalDate.getDate() - 1);
            return logicalDate;
        }
        
        return new Date(now);
    }

    /**
     * Parse boundary time string into hour and minute
     * @param boundaryTime Time string in HH:MM format
     * @returns Object with hour and minute
     * @throws Error if format is invalid
     */
    private parseBoundaryTime(boundaryTime: string): { hour: number; minute: number } {
        const trimmedBoundaryTime = boundaryTime.trim();
        if (!this.isValidBoundaryTime(trimmedBoundaryTime)) {
            throw new Error(`Invalid boundary time format: ${boundaryTime}. Expected HH:MM format (e.g., 02:00)`);
        }
        
        const [hourStr, minuteStr] = trimmedBoundaryTime.split(':');
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);
        
        return { hour, minute };
    }
}