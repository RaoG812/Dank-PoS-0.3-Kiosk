export const formatUtcToBangkok = (utcIsoString: string) => {
    try {
        if (!utcIsoString) return "Invalid Date (Missing)";
        let iso = utcIsoString.trim().replace(' ', 'T');
        if (!iso.endsWith('Z') && !iso.match(/[+-]\d\d:\d\d$/)) {
            iso += 'Z';
        }
        iso = iso.replace(/\.\d+Z$/, 'Z');
        const date = new Date(iso);
        if (isNaN(date.getTime())) throw new Error("Invalid date string after formatting attempt.");
        return date.toLocaleString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Bangkok'
        });
    } catch (e) {
        console.error("Error formatting date:", e, "Original Input:", utcIsoString);
        return "Invalid Date";
    }
};
