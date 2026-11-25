import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCalendarAlt, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TR_WEEKDAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const EN_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function shiftDateStr(dateStr, deltaDays) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return dateStr;
    d.setUTCDate(d.getUTCDate() + deltaDays);
    return d.toISOString().slice(0, 10);
}

const MonthIndexTabs = ({ selectedDate, yearOverview, onSelectDate, isMobile = false }) => {
    const { i18n, t } = useTranslation('pages');
    const isTr = (i18n.language || 'tr').startsWith('tr');
    const monthNames = isTr ? TR_MONTHS : EN_MONTHS;
    const weekdayNames = isTr ? TR_WEEKDAYS : EN_WEEKDAYS;

    const [mobileExpanded, setMobileExpanded] = useState(false);

    const [yearStr, monthStr, dayStr] = selectedDate.split('-');
    const currentYear = Number(yearStr);
    const currentMonth = Number(monthStr); // 1..12
    const currentDay = Number(dayStr);

    const daysInMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
    const monthsSummary = yearOverview?.months || [];
    const daysMap = yearOverview?.days || {};

    const handleMonthClick = (monthNum) => {
        const maxDay = new Date(Date.UTC(currentYear, monthNum, 0)).getUTCDate();
        const safeDay = Math.min(currentDay, maxDay);
        const nextDate = `${currentYear}-${String(monthNum).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
        onSelectDate(nextDate);
    };

    const handleDayClick = (dayNum) => {
        const nextDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        onSelectDate(nextDate);
        if (isMobile) setMobileExpanded(false);
    };

    const sevenDayWindow = [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
        const dateKey = shiftDateStr(selectedDate, offset);
        const dObj = new Date(`${dateKey}T00:00:00Z`);
        const dayNum = dObj.getUTCDate();
        const weekdayLabel = weekdayNames[dObj.getUTCDay()];
        return { dateKey, dayNum, weekdayLabel, isSelected: dateKey === selectedDate };
    });

    const showFullCalendar = !isMobile || mobileExpanded;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: isMobile ? '12px' : '16px',
            }}
        >
            {/* Mobile Compact 7-Day Strip + Expand Full Calendar Toggle */}
            {isMobile && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        padding: '8px',
                        borderRadius: '12px',
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            gap: '4px',
                            overflowX: 'auto',
                            flex: 1,
                        }}
                    >
                        {sevenDayWindow.map((item) => {
                            const dayStat = daysMap[item.dateKey];
                            const hasOpen = (dayStat?.open || 0) > 0;
                            const hasAny = (dayStat?.total || 0) > 0 || dayStat?.hasNotes;
                            return (
                                <button
                                    key={item.dateKey}
                                    type="button"
                                    onClick={() => onSelectDate(item.dateKey)}
                                    style={{
                                        minWidth: '42px',
                                        minHeight: '48px',
                                        flex: 1,
                                        borderRadius: '10px',
                                        border: item.isSelected
                                            ? '2px solid var(--accent-primary)'
                                            : '1px solid transparent',
                                        background: item.isSelected
                                            ? 'var(--accent-primary)'
                                            : hasOpen
                                              ? 'rgba(245, 158, 11, 0.16)'
                                              : hasAny
                                                ? 'rgba(16, 185, 129, 0.14)'
                                                : 'var(--bg-card)',
                                        color: item.isSelected ? '#ffffff' : 'var(--text-primary)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '2px',
                                        cursor: 'pointer',
                                        padding: '4px 2px',
                                    }}
                                >
                                    <span style={{ fontSize: '0.66rem', opacity: 0.85, fontWeight: 600 }}>
                                        {item.weekdayLabel}
                                    </span>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>{item.dayNum}</span>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={() => setMobileExpanded((prev) => !prev)}
                        aria-expanded={mobileExpanded}
                        style={{
                            minHeight: '48px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            padding: '6px 10px',
                            borderRadius: '10px',
                            border: mobileExpanded
                                ? '1px solid var(--accent-warning)'
                                : '1px solid var(--glass-border)',
                            background: mobileExpanded ? 'rgba(245, 158, 11, 0.18)' : 'var(--bg-card)',
                            color: mobileExpanded ? 'var(--accent-warning)' : 'var(--text-primary)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0,
                        }}
                    >
                        <FaCalendarAlt size={12} />
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            {monthNames[currentMonth - 1]}
                            {mobileExpanded ? <FaChevronUp size={9} /> : <FaChevronDown size={9} />}
                        </span>
                    </button>
                </div>
            )}

            {showFullCalendar && (
                <>
                    {/* 12-Month Physical Binder Tabs */}
                    <div
                        role="tablist"
                        aria-label={t('agenda.monthsLabel', 'Yıllık Ajanda Ayları')}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(12, minmax(56px, 1fr))',
                            gap: '6px',
                            overflowX: 'auto',
                            paddingBottom: '4px',
                        }}
                    >
                        {monthNames.map((label, idx) => {
                            const monthNum = idx + 1;
                            const isSelected = monthNum === currentMonth;
                            const stat = monthsSummary.find((m) => m.month === monthNum);
                            const openCount = stat?.openEntries || 0;
                            const totalCount = stat?.totalEntries || 0;

                            return (
                                <button
                                    key={monthNum}
                                    type="button"
                                    role="tab"
                                    aria-selected={isSelected}
                                    onClick={() => handleMonthClick(monthNum)}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '8px 6px',
                                        borderRadius: '10px 10px 4px 4px',
                                        border: isSelected
                                            ? '2px solid var(--accent-warning)'
                                            : '1px solid var(--glass-border)',
                                        background: isSelected
                                            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(59, 130, 246, 0.12))'
                                            : 'var(--glass-bg)',
                                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        fontWeight: isSelected ? 700 : 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        position: 'relative',
                                    }}
                                >
                                    <span style={{ fontSize: '0.82rem' }}>{label}</span>
                                    {totalCount > 0 && (
                                        <span
                                            style={{
                                                fontSize: '0.68rem',
                                                marginTop: '2px',
                                                padding: '1px 6px',
                                                borderRadius: '999px',
                                                background:
                                                    openCount > 0
                                                        ? 'rgba(245, 158, 11, 0.25)'
                                                        : 'rgba(16, 185, 129, 0.2)',
                                                color:
                                                    openCount > 0 ? 'var(--accent-warning)' : 'var(--accent-success)',
                                                fontWeight: 700,
                                            }}
                                        >
                                            {openCount > 0 ? `${openCount}/${totalCount}` : totalCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Day Strip (1..daysInMonth) */}
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '4px',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                        }}
                    >
                        {Array.from({ length: daysInMonth }, (_, idx) => {
                            const dayNum = idx + 1;
                            const dateKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                            const isSelected = dayNum === currentDay;
                            const dayStat = daysMap[dateKey];
                            const hasOpen = (dayStat?.open || 0) > 0;
                            const hasAny = (dayStat?.total || 0) > 0 || dayStat?.hasNotes;

                            return (
                                <button
                                    key={dayNum}
                                    type="button"
                                    onClick={() => handleDayClick(dayNum)}
                                    title={dateKey}
                                    style={{
                                        width: isMobile ? '36px' : '30px',
                                        height: isMobile ? '36px' : '30px',
                                        borderRadius: '7px',
                                        border: isSelected
                                            ? '2px solid var(--accent-primary)'
                                            : '1px solid transparent',
                                        background: isSelected
                                            ? 'var(--accent-primary)'
                                            : hasOpen
                                              ? 'rgba(245, 158, 11, 0.18)'
                                              : hasAny
                                                ? 'rgba(16, 185, 129, 0.16)'
                                                : 'transparent',
                                        color: isSelected ? '#ffffff' : 'var(--text-primary)',
                                        fontSize: '0.78rem',
                                        fontWeight: isSelected || hasAny ? 700 : 400,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {dayNum}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default MonthIndexTabs;
