const path = require('path');
const PDFDocument = require('pdfkit-table');
const { Op } = require('sequelize');
const {
    sequelize,
    AgendaPage,
    AgendaEntry,
    AgendaEntryContact,
    AgendaEntryTag,
    BusinessCard,
    Tag,
    User,
} = require('../models');
const { logAction } = require('../utils/logger');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidDateString(dateStr) {
    if (!DATE_REGEX.test(String(dateStr || ''))) return false;
    const d = new Date(`${dateStr}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr;
}

function addDays(dateStr, days) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

/**
 * Parses secretary-friendly single-line input:
 * e.g. "14:30 @Ahmet Yılmaz bütçe görüşmesi #finans !yarın 10:00"
 */
function parseInlineSyntax(rawText, baseDate) {
    let text = String(rawText || '').trim();
    let timeSlot = null;
    let entryType = null;
    let reminderAt = null;
    const inlineTagNames = [];

    // 1. Leading time: "14:30 " or "9.15 "
    const timeMatch = text.match(/^([01]?\d|2[0-3])[:.]([0-5]\d)\s+([\s\S]+)$/);
    if (timeMatch) {
        const hh = timeMatch[1].padStart(2, '0');
        const mm = timeMatch[2];
        timeSlot = `${hh}:${mm}`;
        text = timeMatch[3].trim();
        entryType = 'schedule';
    }

    // 2. Leading type symbol: "[] ", "[ ] ", "☎ "
    if (text.startsWith('[] ') || text.startsWith('[ ] ')) {
        entryType = 'task';
        text = text.replace(/^\[\s?\]\s+/, '').trim();
    } else if (text.startsWith('☎ ') || text.toLowerCase().startsWith('[arama] ')) {
        entryType = 'call';
        text = text.replace(/^(☎|\[arama\])\s+/i, '').trim();
    }

    // 3. Inline #etiket tokens
    const tagRegex = /(?:^|\s)#([\p{L}\p{N}_-]{2,32})/gu;
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
        inlineTagNames.push(match[1]);
    }

    // 4. Inline !hatırlatıcı: "!yarın", "!yarın 10:00", "!bugün 16:00", "!2026-11-30 09:00"
    const remMatch = text.match(
        /(?:^|\s)!(yarın|yarin|tomorrow|bugün|bugun|today|\d{4}-\d{2}-\d{2})(?:\s+([01]?\d|2[0-3])[:.]([0-5]\d))?(?=\s|$)/i,
    );
    if (remMatch) {
        const keyword = remMatch[1].toLowerCase();
        const hh = remMatch[2] ? remMatch[2].padStart(2, '0') : '09';
        const mm = remMatch[3] || '00';
        const refDate = isValidDateString(baseDate) ? baseDate : new Date().toISOString().slice(0, 10);
        let targetDate = refDate;
        if (keyword === 'yarın' || keyword === 'yarin' || keyword === 'tomorrow') {
            targetDate = addDays(refDate, 1);
        } else if (DATE_REGEX.test(keyword)) {
            targetDate = keyword;
        }
        reminderAt = new Date(`${targetDate}T${hh}:${mm}:00`);
    }

    return {
        cleanContent: text || String(rawText || '').trim(),
        timeSlot,
        entryType,
        reminderAt,
        inlineTagNames,
    };
}

function buildEntryIncludes() {
    return [
        { model: User, as: 'createdBy', attributes: ['id', 'username', 'displayName'] },
        { model: User, as: 'updatedBy', attributes: ['id', 'username', 'displayName'] },
        {
            model: AgendaEntryContact,
            as: 'contactLinks',
            attributes: ['id', 'cardId', 'displayNameSnapshot'],
            include: [
                {
                    model: BusinessCard,
                    as: 'card',
                    attributes: [
                        'id',
                        'firstName',
                        'lastName',
                        'company',
                        'title',
                        'phone',
                        'email',
                        'visibility',
                        'ownerId',
                        'deletedAt',
                    ],
                    where: { deletedAt: null },
                    required: false,
                },
            ],
        },
        {
            model: Tag,
            as: 'tags',
            attributes: ['id', 'name', 'color'],
            through: { attributes: [] },
        },
    ];
}

/**
 * Prevents private card PII leakage in both directions (Principal <-> Substitute):
 * - Soft-deleted cards or private cards not owned by the viewing actor have their `card` details masked (`card: null`),
 *   preserving only `displayNameSnapshot`.
 */
function sanitizeEntryForAccess(entryInstance, access) {
    const entry = entryInstance.toJSON ? entryInstance.toJSON() : { ...entryInstance };
    if (Array.isArray(entry.contactLinks)) {
        entry.contactLinks = entry.contactLinks.map((link) => {
            if (!link.card) return link;
            const isCardDeleted = Boolean(link.card.deletedAt);
            const isCardVisibleToActor =
                link.card.visibility === 'public' || Number(link.card.ownerId) === Number(access.actorUserId);
            if (isCardDeleted || !isCardVisibleToActor) {
                return { ...link, card: null };
            }
            return link;
        });
    }
    return entry;
}

exports.getDailyPage = async (req, res) => {
    try {
        const { date } = req.params;
        if (!isValidDateString(date)) {
            return res.status(400).json({ errorCode: 'INVALID_AGENDA_DATE' });
        }

        const { ownerId, isOwner } = req.agendaAccess;

        const [owner, page, entries] = await Promise.all([
            User.findByPk(ownerId, { attributes: ['id', 'username', 'displayName'] }),
            AgendaPage.findOne({
                where: { ownerId, date },
                include: [{ model: User, as: 'updatedBy', attributes: ['id', 'username', 'displayName'] }],
            }),
            AgendaEntry.findAll({
                where: {
                    ownerId,
                    date,
                    deletedAt: null,
                    ...(isOwner ? {} : { isPrivate: false }),
                },
                include: buildEntryIncludes(),
                order: [
                    ['timeSlot', 'ASC'],
                    ['sortOrder', 'ASC'],
                    ['id', 'ASC'],
                ],
            }),
        ]);

        if (!owner) {
            return res.status(404).json({ errorCode: 'AGENDA_OWNER_NOT_FOUND' });
        }

        const pageData = page
            ? {
                  id: page.id,
                  ownerId: page.ownerId,
                  date: page.date,
                  freeformNotes: page.freeformNotes,
                  ...(isOwner ? { privateNotes: page.privateNotes } : {}),
                  moodOrPriority: page.moodOrPriority,
                  version: page.version,
                  updatedBy: page.updatedBy || null,
                  updatedAt: page.updatedAt,
              }
            : {
                  id: null,
                  ownerId,
                  date,
                  freeformNotes: '',
                  ...(isOwner ? { privateNotes: '' } : {}),
                  moodOrPriority: null,
                  version: 1,
                  updatedBy: null,
                  updatedAt: null,
              };

        return res.json({
            owner,
            access: {
                ownerId,
                actorUserId: req.agendaAccess.actorUserId,
                isOwner,
                isDelegate: req.agendaAccess.isDelegate,
                permission: req.agendaAccess.permission,
                handoverNote: req.agendaAccess.delegation?.note || null,
            },
            page: pageData,
            entries: entries.map((e) => sanitizeEntryForAccess(e, req.agendaAccess)),
        });
    } catch (error) {
        console.error('[AGENDA GET DAY ERROR]', error);
        return res.status(500).json({ errorCode: 'AGENDA_DAY_LOAD_FAILED' });
    }
};

exports.updateDailyPageNotes = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { date } = req.params;
        if (!isValidDateString(date)) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'INVALID_AGENDA_DATE' });
        }

        const { ownerId, actorUserId, isOwner } = req.agendaAccess;
        const { freeformNotes, privateNotes, moodOrPriority, version } = req.body;

        if (!isOwner && privateNotes !== undefined) {
            await t.rollback();
            return res.status(403).json({ errorCode: 'PRIVATE_NOTES_OWNER_ONLY' });
        }

        const safeMood =
            moodOrPriority === null
                ? null
                : moodOrPriority !== undefined
                  ? String(moodOrPriority).trim().slice(0, 32)
                  : undefined;

        let page = await AgendaPage.findOne({
            where: { ownerId, date },
            lock: t.LOCK.UPDATE,
            transaction: t,
        });

        if (!page) {
            page = await AgendaPage.create(
                {
                    ownerId,
                    date,
                    freeformNotes: typeof freeformNotes === 'string' ? freeformNotes : '',
                    privateNotes: isOwner && typeof privateNotes === 'string' ? privateNotes : '',
                    moodOrPriority: safeMood !== undefined ? safeMood : null,
                    version: 1,
                    updatedByUserId: actorUserId,
                },
                { transaction: t },
            );
        } else {
            if (version !== undefined && Number(version) !== page.version) {
                await t.rollback();
                return res.status(409).json({
                    errorCode: 'AGENDA_VERSION_CONFLICT',
                    currentVersion: page.version,
                });
            }

            if (typeof freeformNotes === 'string') page.freeformNotes = freeformNotes;
            if (isOwner && typeof privateNotes === 'string') page.privateNotes = privateNotes;
            if (safeMood !== undefined) page.moodOrPriority = safeMood;
            page.version += 1;
            page.updatedByUserId = actorUserId;
            await page.save({ transaction: t });
        }

        await t.commit();

        await logAction({
            action: 'AGENDA_PAGE_NOTES_UPDATE',
            details: `Ajanda sayfa notu güncellendi (${date}, ownerId=${ownerId}, actorId=${actorUserId})`,
            req,
        });

        const responsePage = {
            id: page.id,
            ownerId: page.ownerId,
            date: page.date,
            freeformNotes: page.freeformNotes,
            ...(isOwner ? { privateNotes: page.privateNotes } : {}),
            moodOrPriority: page.moodOrPriority,
            version: page.version,
            updatedByUserId: page.updatedByUserId,
            updatedAt: page.updatedAt,
        };

        return res.json({ page: responsePage });
    } catch (error) {
        if (t && !t.finished) await t.rollback();
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ errorCode: 'AGENDA_VERSION_CONFLICT' });
        }
        console.error('[AGENDA UPDATE NOTES ERROR]', error);
        return res.status(500).json({ errorCode: 'AGENDA_NOTES_SAVE_FAILED' });
    }
};

exports.createEntry = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { ownerId, actorUserId, isOwner } = req.agendaAccess;
        const {
            date,
            content,
            timeSlot: rawTimeSlot,
            endTime: rawEndTime,
            entryType: rawEntryType,
            priority: rawPriority,
            isPrivate: rawIsPrivate,
            reminderAt: rawReminderAt,
            contactIds,
            contactSnapshots,
            tagIds,
        } = req.body;

        if (!isValidDateString(date)) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'INVALID_AGENDA_DATE' });
        }
        if (!content || !String(content).trim()) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'AGENDA_CONTENT_REQUIRED' });
        }

        if (!isOwner && rawIsPrivate === true) {
            await t.rollback();
            return res.status(403).json({ errorCode: 'AGENDA_OWNER_ONLY' });
        }

        const parsed = parseInlineSyntax(content, date);
        const finalTimeSlot = rawTimeSlot !== undefined ? rawTimeSlot : parsed.timeSlot;
        if (finalTimeSlot && !TIME_REGEX.test(finalTimeSlot)) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'INVALID_TIME_SLOT' });
        }
        const finalEndTime = rawEndTime || null;
        if (finalEndTime && !TIME_REGEX.test(finalEndTime)) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'INVALID_TIME_SLOT' });
        }
        if (finalTimeSlot && finalEndTime && finalEndTime < finalTimeSlot) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'INVALID_TIME_RANGE' });
        }

        const allowedTypes = ['schedule', 'call', 'note', 'task', 'follow_up'];
        const finalType = allowedTypes.includes(rawEntryType)
            ? rawEntryType
            : parsed.entryType || (finalTimeSlot ? 'schedule' : 'note');

        const finalPriority = Math.min(5, Math.max(1, Number(rawPriority) || 3));
        const finalReminderAt = rawReminderAt ? new Date(rawReminderAt) : parsed.reminderAt;
        if (rawReminderAt && Number.isNaN(finalReminderAt.getTime())) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'INVALID_REMINDER_DATE' });
        }

        const entry = await AgendaEntry.create(
            {
                ownerId,
                createdByUserId: actorUserId,
                updatedByUserId: actorUserId,
                date,
                timeSlot: finalTimeSlot || null,
                endTime: finalEndTime,
                entryType: finalType,
                content: parsed.cleanContent,
                status: 'open',
                priority: finalPriority,
                reminderAt: finalReminderAt && !Number.isNaN(finalReminderAt.getTime()) ? finalReminderAt : null,
                isPrivate: isOwner ? Boolean(rawIsPrivate) : false,
            },
            { transaction: t },
        );

        // Link contacts via cardIds (only cards accessible to the actor and agenda owner)
        const linkedCardIds = Array.isArray(contactIds)
            ? [...new Set(contactIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(0, 20)
            : [];

        const contactRowsToInsert = [];

        if (linkedCardIds.length > 0) {
            const accessibleCards = await BusinessCard.findAll({
                where: {
                    id: { [Op.in]: linkedCardIds },
                    deletedAt: null,
                    [Op.or]: [{ ownerId: actorUserId }, { visibility: 'public' }],
                },
                transaction: t,
            });

            for (const card of accessibleCards) {
                const displayName = (
                    `${card.firstName || ''} ${card.lastName || ''}`.trim() ||
                    card.company ||
                    `#${card.id}`
                ).slice(0, 255);
                contactRowsToInsert.push({
                    entryId: entry.id,
                    cardId: card.id,
                    displayNameSnapshot: displayName,
                });
            }
        }

        if (Array.isArray(contactSnapshots)) {
            for (const snap of contactSnapshots.slice(0, 20)) {
                const name = (typeof snap === 'string' ? snap.trim() : String(snap?.displayName || '').trim()).slice(
                    0,
                    255,
                );
                if (name) {
                    contactRowsToInsert.push({
                        entryId: entry.id,
                        cardId: null,
                        displayNameSnapshot: name,
                    });
                }
            }
        }

        if (contactRowsToInsert.length > 0) {
            await AgendaEntryContact.bulkCreate(contactRowsToInsert, { transaction: t });
        }

        // Link tags via tagIds and inline #tag names — strictly verified against ownerId/global tags (prevents Tag IDOR)
        const candidateTagIds = Array.isArray(tagIds)
            ? [...new Set(tagIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(0, 20)
            : [];

        const tagOrConditions = [];
        if (candidateTagIds.length > 0) {
            tagOrConditions.push({ id: { [Op.in]: candidateTagIds } });
        }
        if (parsed.inlineTagNames.length > 0) {
            tagOrConditions.push({ name: { [Op.in]: parsed.inlineTagNames } });
        }

        if (tagOrConditions.length > 0) {
            const verifiedTags = await Tag.findAll({
                where: {
                    [Op.and]: [
                        { [Op.or]: tagOrConditions },
                        { [Op.or]: [{ ownerId }, { ownerId: actorUserId }, { ownerId: null }] },
                    ],
                },
                transaction: t,
            });

            if (verifiedTags.length > 0) {
                await AgendaEntryTag.bulkCreate(
                    verifiedTags.map((tag) => ({ entryId: entry.id, tagId: tag.id })),
                    { transaction: t, ignoreDuplicates: true },
                );
            }
        }

        await t.commit();

        const fullEntry = await AgendaEntry.findByPk(entry.id, {
            include: buildEntryIncludes(),
        });

        await logAction({
            action: 'AGENDA_ENTRY_CREATE',
            details: `Ajanda kaydı eklendi (${date}, id=${entry.id}, ownerId=${ownerId}, actorId=${actorUserId})`,
            req,
        });

        return res.status(201).json(sanitizeEntryForAccess(fullEntry, req.agendaAccess));
    } catch (error) {
        if (t && !t.finished) await t.rollback();
        console.error('[AGENDA CREATE ENTRY ERROR]', error);
        return res.status(500).json({ errorCode: 'AGENDA_ENTRY_CREATE_FAILED' });
    }
};

exports.updateEntry = async (req, res) => {
    const entryId = Number(req.params.id);
    if (!Number.isInteger(entryId) || entryId <= 0) {
        return res.status(400).json({ errorCode: 'INVALID_ENTRY_ID' });
    }

    const t = await sequelize.transaction();
    try {
        const { ownerId, actorUserId, isOwner } = req.agendaAccess;
        const entry = await AgendaEntry.findOne({
            where: {
                id: entryId,
                ownerId,
                deletedAt: null,
            },
            lock: t.LOCK.UPDATE,
            transaction: t,
        });

        // Return 404 if not found OR if substitute probes an isPrivate entry
        if (!entry || (!isOwner && entry.isPrivate)) {
            await t.rollback();
            return res.status(404).json({ errorCode: 'AGENDA_ENTRY_NOT_FOUND' });
        }

        const { content, timeSlot, endTime, entryType, status, priority, isPrivate, reminderAt, date } = req.body;

        // Substitute restrictions
        if (!isOwner) {
            if (isPrivate !== undefined) {
                await t.rollback();
                return res.status(403).json({ errorCode: 'AGENDA_OWNER_ONLY' });
            }

            const isEditingFieldsOtherThanStatus =
                content !== undefined ||
                timeSlot !== undefined ||
                endTime !== undefined ||
                entryType !== undefined ||
                priority !== undefined ||
                reminderAt !== undefined ||
                date !== undefined;

            if (isEditingFieldsOtherThanStatus && Number(entry.createdByUserId) !== Number(actorUserId)) {
                await t.rollback();
                return res.status(403).json({ errorCode: 'SUBSTITUTE_CANNOT_EDIT_OWNER_TEXT' });
            }
        }

        if (date !== undefined) {
            if (!isValidDateString(date)) {
                await t.rollback();
                return res.status(400).json({ errorCode: 'INVALID_AGENDA_DATE' });
            }
            entry.date = date;
        }
        if (timeSlot !== undefined) {
            if (timeSlot !== null && timeSlot !== '' && !TIME_REGEX.test(timeSlot)) {
                await t.rollback();
                return res.status(400).json({ errorCode: 'INVALID_TIME_SLOT' });
            }
            entry.timeSlot = timeSlot || null;
        }
        if (endTime !== undefined) {
            if (endTime !== null && endTime !== '' && !TIME_REGEX.test(endTime)) {
                await t.rollback();
                return res.status(400).json({ errorCode: 'INVALID_TIME_SLOT' });
            }
            entry.endTime = endTime || null;
        }
        if (entry.timeSlot && entry.endTime && entry.endTime < entry.timeSlot) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'INVALID_TIME_RANGE' });
        }
        if (content !== undefined) {
            if (!String(content).trim()) {
                await t.rollback();
                return res.status(400).json({ errorCode: 'AGENDA_CONTENT_REQUIRED' });
            }
            entry.content = String(content).trim();
        }
        if (entryType !== undefined) {
            const allowedTypes = ['schedule', 'call', 'note', 'task', 'follow_up'];
            if (allowedTypes.includes(entryType)) entry.entryType = entryType;
        }
        if (status !== undefined) {
            const allowedStatuses = ['open', 'done', 'migrated', 'cancelled'];
            if (!allowedStatuses.includes(status)) {
                await t.rollback();
                return res.status(400).json({ errorCode: 'INVALID_AGENDA_STATUS' });
            }
            entry.status = status;
        }
        if (priority !== undefined) {
            entry.priority = Math.min(5, Math.max(1, Number(priority) || 3));
        }
        if (isOwner && isPrivate !== undefined) {
            entry.isPrivate = Boolean(isPrivate);
        }
        if (reminderAt !== undefined) {
            if (reminderAt === null || reminderAt === '') {
                entry.reminderAt = null;
            } else {
                const parsedRem = new Date(reminderAt);
                if (Number.isNaN(parsedRem.getTime())) {
                    await t.rollback();
                    return res.status(400).json({ errorCode: 'INVALID_REMINDER_DATE' });
                }
                entry.reminderAt = parsedRem;
            }
            entry.reminderSent = false;
        }

        entry.updatedByUserId = actorUserId;
        await entry.save({ transaction: t });
        await t.commit();

        const fullEntry = await AgendaEntry.findOne({
            where: {
                id: entry.id,
                ownerId,
                deletedAt: null,
                ...(isOwner ? {} : { isPrivate: false }),
            },
            include: buildEntryIncludes(),
        });

        await logAction({
            action: 'AGENDA_ENTRY_UPDATE',
            details: `Ajanda kaydı güncellendi (id=${entry.id}, status=${entry.status}, ownerId=${ownerId}, actorId=${actorUserId})`,
            req,
        });

        return res.json(sanitizeEntryForAccess(fullEntry, req.agendaAccess));
    } catch (error) {
        if (t && !t.finished) await t.rollback();
        console.error('[AGENDA UPDATE ENTRY ERROR]', error);
        return res.status(500).json({ errorCode: 'AGENDA_ENTRY_UPDATE_FAILED' });
    }
};

exports.deleteEntry = async (req, res) => {
    const entryId = Number(req.params.id);
    if (!Number.isInteger(entryId) || entryId <= 0) {
        return res.status(400).json({ errorCode: 'INVALID_ENTRY_ID' });
    }

    const t = await sequelize.transaction();
    try {
        const { ownerId, actorUserId, isOwner } = req.agendaAccess;
        const entry = await AgendaEntry.findOne({
            where: {
                id: entryId,
                ownerId,
                deletedAt: null,
            },
            lock: t.LOCK.UPDATE,
            transaction: t,
        });

        if (!entry || (!isOwner && entry.isPrivate)) {
            await t.rollback();
            return res.status(404).json({ errorCode: 'AGENDA_ENTRY_NOT_FOUND' });
        }

        const isPermanent = req.query.permanent === 'true';

        if (!isOwner) {
            if (isPermanent) {
                await t.rollback();
                return res.status(403).json({ errorCode: 'SUBSTITUTE_CANNOT_PERMANENT_DELETE' });
            }
            if (Number(entry.createdByUserId) !== Number(actorUserId)) {
                await t.rollback();
                return res.status(403).json({ errorCode: 'SUBSTITUTE_CANNOT_DELETE_OWNER_ENTRY' });
            }
        }

        if (isOwner && isPermanent) {
            await entry.destroy({ transaction: t });
        } else {
            entry.deletedAt = new Date();
            entry.updatedByUserId = actorUserId;
            await entry.save({ transaction: t });
        }

        await t.commit();

        await logAction({
            action: 'AGENDA_ENTRY_DELETE',
            details: `Ajanda kaydı silindi (id=${entryId}, permanent=${isPermanent}, ownerId=${ownerId}, actorId=${actorUserId})`,
            req,
        });

        return res.json({ messageCode: 'AGENDA_ENTRY_DELETED' });
    } catch (error) {
        if (t && !t.finished) await t.rollback();
        console.error('[AGENDA DELETE ENTRY ERROR]', error);
        return res.status(500).json({ errorCode: 'AGENDA_ENTRY_DELETE_FAILED' });
    }
};

exports.migrateUnfinishedEntries = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { ownerId, actorUserId, isOwner } = req.agendaAccess;
        const { fromDate, toDate: rawToDate } = req.body;

        if (!isValidDateString(fromDate)) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'INVALID_AGENDA_DATE' });
        }

        const toDate = rawToDate && isValidDateString(rawToDate) ? rawToDate : addDays(fromDate, 1);
        if (toDate === fromDate) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'MIGRATE_TARGET_SAME_DATE' });
        }
        if (toDate < fromDate) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'MIGRATE_TARGET_PAST_DATE' });
        }

        // Lock source rows first (without outer join includes)
        const lockedSources = await AgendaEntry.findAll({
            where: {
                ownerId,
                date: fromDate,
                status: 'open',
                deletedAt: null,
                ...(isOwner ? {} : { isPrivate: false }),
            },
            order: [
                ['timeSlot', 'ASC'],
                ['sortOrder', 'ASC'],
                ['id', 'ASC'],
            ],
            lock: t.LOCK.UPDATE,
            transaction: t,
        });

        const migratedIds = [];

        for (const source of lockedSources) {
            const [contactLinks, tags] = await Promise.all([
                AgendaEntryContact.findAll({ where: { entryId: source.id }, transaction: t }),
                source.getTags({ transaction: t }),
            ]);

            const existingClone = await AgendaEntry.findOne({
                where: {
                    migratedFromEntryId: source.id,
                    date: toDate,
                },
                transaction: t,
            });

            if (!existingClone) {
                // CRITICAL SECURITY FIX (K3): Preserve original createdByUserId so a substitute rolling over
                // the principal's entry cannot gain authorship to edit/delete the principal's text on the next day!
                const clone = await AgendaEntry.create(
                    {
                        ownerId,
                        createdByUserId: source.createdByUserId,
                        updatedByUserId: actorUserId,
                        date: toDate,
                        timeSlot: source.timeSlot,
                        endTime: source.endTime,
                        entryType: source.entryType,
                        content: source.content,
                        status: 'open',
                        priority: source.priority,
                        migratedFromEntryId: source.id,
                        isPrivate: source.isPrivate,
                        sortOrder: source.sortOrder,
                    },
                    { transaction: t },
                );

                if (contactLinks.length > 0) {
                    await AgendaEntryContact.bulkCreate(
                        contactLinks.map((link) => ({
                            entryId: clone.id,
                            cardId: link.cardId,
                            displayNameSnapshot: link.displayNameSnapshot,
                        })),
                        { transaction: t },
                    );
                }

                if (tags.length > 0) {
                    await AgendaEntryTag.bulkCreate(
                        tags.map((tag) => ({ entryId: clone.id, tagId: tag.id })),
                        { transaction: t, ignoreDuplicates: true },
                    );
                }

                migratedIds.push(clone.id);
            } else if (existingClone.deletedAt !== null) {
                existingClone.deletedAt = null;
                existingClone.status = 'open';
                existingClone.updatedByUserId = actorUserId;
                await existingClone.save({ transaction: t });
                migratedIds.push(existingClone.id);
            }

            source.status = 'migrated';
            source.migratedToDate = toDate;
            source.updatedByUserId = actorUserId;
            await source.save({ transaction: t });
        }

        await t.commit();

        await logAction({
            action: 'AGENDA_ENTRIES_MIGRATE',
            details: `${migratedIds.length} tamamlanmayan kayıt ${fromDate} -> ${toDate} tarihine devredildi (ownerId=${ownerId}, actorId=${actorUserId})`,
            req,
        });

        return res.json({
            messageCode: 'AGENDA_ENTRIES_MIGRATED',
            fromDate,
            toDate,
            migratedCount: migratedIds.length,
        });
    } catch (error) {
        if (t && !t.finished) await t.rollback();
        console.error('[AGENDA MIGRATE ERROR]', error);
        return res.status(500).json({ errorCode: 'AGENDA_MIGRATE_FAILED' });
    }
};

exports.searchAgenda = async (req, res) => {
    try {
        const { ownerId, isOwner } = req.agendaAccess;
        const { q, cardId, status, fromDate, toDate } = req.query;

        const whereClause = {
            ownerId,
            deletedAt: null,
            ...(isOwner ? {} : { isPrivate: false }),
        };

        if (status && ['open', 'done', 'migrated', 'cancelled'].includes(status)) {
            whereClause.status = status;
        }
        if (fromDate && isValidDateString(fromDate) && toDate && isValidDateString(toDate)) {
            whereClause.date = { [Op.between]: [fromDate, toDate] };
        } else if (fromDate && isValidDateString(fromDate)) {
            whereClause.date = { [Op.gte]: fromDate };
        } else if (toDate && isValidDateString(toDate)) {
            whereClause.date = { [Op.lte]: toDate };
        }

        if (q && String(q).trim()) {
            const escaped = String(q)
                .trim()
                .slice(0, 100)
                .replace(/[%_\\]/g, '\\$&');
            whereClause.content = { [Op.iLike]: `%${escaped}%` };
        }

        const include = buildEntryIncludes();
        if (cardId && Number.isInteger(Number(cardId))) {
            include[2] = {
                ...include[2],
                where: { cardId: Number(cardId) },
                required: true,
            };
        }

        const entries = await AgendaEntry.findAll({
            where: whereClause,
            include,
            order: [
                ['date', 'DESC'],
                ['timeSlot', 'ASC'],
                ['id', 'DESC'],
            ],
            limit: 100,
        });

        return res.json({
            entries: entries.map((e) => sanitizeEntryForAccess(e, req.agendaAccess)),
        });
    } catch (error) {
        console.error('[AGENDA SEARCH ERROR]', error);
        return res.status(500).json({ errorCode: 'AGENDA_SEARCH_FAILED' });
    }
};

exports.getYearOverview = async (req, res) => {
    try {
        const { ownerId, isOwner } = req.agendaAccess;
        const year = Number(req.params.year);
        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
            return res.status(400).json({ errorCode: 'INVALID_AGENDA_YEAR' });
        }

        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const [entryCounts, pagesWithNotes] = await Promise.all([
            AgendaEntry.findAll({
                attributes: ['date', 'status', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
                where: {
                    ownerId,
                    deletedAt: null,
                    date: { [Op.between]: [startDate, endDate] },
                    ...(isOwner ? {} : { isPrivate: false }),
                },
                group: ['date', 'status'],
                raw: true,
            }),
            AgendaPage.findAll({
                attributes: ['date'],
                where: {
                    ownerId,
                    date: { [Op.between]: [startDate, endDate] },
                    [Op.or]: [
                        sequelize.where(sequelize.fn('LENGTH', sequelize.fn('TRIM', sequelize.col('freeformNotes'))), {
                            [Op.gt]: 0,
                        }),
                        ...(isOwner
                            ? [
                                  sequelize.where(
                                      sequelize.fn('LENGTH', sequelize.fn('TRIM', sequelize.col('privateNotes'))),
                                      { [Op.gt]: 0 },
                                  ),
                              ]
                            : []),
                    ],
                },
                raw: true,
            }),
        ]);

        const daysMap = {};
        const monthsSummary = Array.from({ length: 12 }, (_, idx) => ({
            month: idx + 1,
            totalEntries: 0,
            openEntries: 0,
            doneEntries: 0,
            activeDays: 0,
        }));

        for (const row of entryCounts) {
            const cnt = Number(row.cnt) || 0;
            if (!daysMap[row.date]) {
                daysMap[row.date] = { total: 0, open: 0, done: 0, hasNotes: false };
            }
            daysMap[row.date].total += cnt;
            if (row.status === 'open') daysMap[row.date].open += cnt;
            if (row.status === 'done') daysMap[row.date].done += cnt;
        }

        for (const p of pagesWithNotes) {
            if (!daysMap[p.date]) {
                daysMap[p.date] = { total: 0, open: 0, done: 0, hasNotes: true };
            } else {
                daysMap[p.date].hasNotes = true;
            }
        }

        Object.entries(daysMap).forEach(([dateStr, info]) => {
            const mIdx = Number(dateStr.slice(5, 7)) - 1;
            if (monthsSummary[mIdx]) {
                monthsSummary[mIdx].totalEntries += info.total;
                monthsSummary[mIdx].openEntries += info.open;
                monthsSummary[mIdx].doneEntries += info.done;
                monthsSummary[mIdx].activeDays += 1;
            }
        });

        return res.json({
            year,
            months: monthsSummary,
            days: daysMap,
        });
    } catch (error) {
        console.error('[AGENDA YEAR OVERVIEW ERROR]', error);
        return res.status(500).json({ errorCode: 'AGENDA_YEAR_OVERVIEW_FAILED' });
    }
};

exports.getContactAgendaHistory = async (req, res) => {
    try {
        const { ownerId, isOwner } = req.agendaAccess;
        const cardId = Number(req.params.cardId);
        if (!Number.isInteger(cardId) || cardId <= 0) {
            return res.status(400).json({ errorCode: 'INVALID_CARD_ID' });
        }

        // Strict KVKK guard: only return agenda entries owned by req.agendaAccess.ownerId
        const entries = await AgendaEntry.findAll({
            where: {
                ownerId,
                deletedAt: null,
                ...(isOwner ? {} : { isPrivate: false }),
            },
            include: [
                { model: User, as: 'createdBy', attributes: ['id', 'username', 'displayName'] },
                {
                    model: AgendaEntryContact,
                    as: 'contactLinks',
                    where: { cardId },
                    required: true,
                },
                { model: Tag, as: 'tags', attributes: ['id', 'name', 'color'], through: { attributes: [] } },
            ],
            order: [
                ['date', 'DESC'],
                ['timeSlot', 'ASC'],
                ['id', 'DESC'],
            ],
            limit: 50,
        });

        return res.json({
            entries: entries.map((e) => sanitizeEntryForAccess(e, req.agendaAccess)),
        });
    } catch (error) {
        console.error('[AGENDA CONTACT HISTORY ERROR]', error);
        return res.status(500).json({ errorCode: 'AGENDA_CONTACT_HISTORY_FAILED' });
    }
};

exports.getRangePages = async (req, res) => {
    try {
        const { ownerId, isOwner } = req.agendaAccess;
        const { startDate, endDate: rawEndDate } = req.query;

        if (!isValidDateString(startDate)) {
            return res.status(400).json({ errorCode: 'INVALID_AGENDA_DATE' });
        }
        const endDate = rawEndDate ? String(rawEndDate) : startDate;
        if (!isValidDateString(endDate) || endDate < startDate) {
            return res.status(400).json({ errorCode: 'INVALID_AGENDA_DATE_RANGE' });
        }

        const diffDays =
            (new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) /
            (1000 * 60 * 60 * 24);
        if (diffDays > 31) {
            return res.status(400).json({ errorCode: 'AGENDA_RANGE_TOO_LARGE' });
        }

        const [owner, pages, entries] = await Promise.all([
            User.findByPk(ownerId, { attributes: ['id', 'username', 'displayName'] }),
            AgendaPage.findAll({
                attributes: ['id', 'date', 'freeformNotes', ...(isOwner ? ['privateNotes'] : []), 'moodOrPriority'],
                where: {
                    ownerId,
                    date: { [Op.between]: [startDate, endDate] },
                },
                order: [['date', 'ASC']],
            }),
            AgendaEntry.findAll({
                where: {
                    ownerId,
                    date: { [Op.between]: [startDate, endDate] },
                    deletedAt: null,
                    ...(isOwner ? {} : { isPrivate: false }),
                },
                include: buildEntryIncludes(),
                order: [
                    ['date', 'ASC'],
                    ['timeSlot', 'ASC'],
                    ['sortOrder', 'ASC'],
                    ['id', 'ASC'],
                ],
            }),
        ]);

        return res.json({
            owner,
            startDate,
            endDate,
            pages,
            entries: entries.map((e) => sanitizeEntryForAccess(e, req.agendaAccess)),
        });
    } catch (error) {
        console.error('[AGENDA GET RANGE ERROR]', error);
        return res.status(500).json({ errorCode: 'AGENDA_RANGE_LOAD_FAILED' });
    }
};

exports.exportAgendaPdf = async (req, res) => {
    try {
        const { ownerId, isOwner } = req.agendaAccess;
        const {
            startDate,
            endDate: rawEndDate,
            includePrivate: rawIncludePrivate,
            includeContactPhones: rawIncludePhones,
            includeBlankLines: rawIncludeBlankLines,
        } = req.query;

        if (!isValidDateString(startDate)) {
            return res.status(400).json({ errorCode: 'INVALID_AGENDA_DATE' });
        }
        const endDate = rawEndDate ? String(rawEndDate) : startDate;
        if (!isValidDateString(endDate) || endDate < startDate) {
            return res.status(400).json({ errorCode: 'INVALID_AGENDA_DATE_RANGE' });
        }

        const diffDays =
            (new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) /
            (1000 * 60 * 60 * 24);
        if (diffDays > 31) {
            return res.status(400).json({ errorCode: 'AGENDA_RANGE_TOO_LARGE' });
        }

        // Only the actual agenda owner can opt into including private notes in the PDF
        const includePrivate = isOwner && rawIncludePrivate === 'true';
        const includeContactPhones = rawIncludePhones !== 'false';
        const includeBlankLines = rawIncludeBlankLines !== 'false';

        const [owner, pages, rawEntries] = await Promise.all([
            User.findByPk(ownerId, { attributes: ['id', 'username', 'displayName'] }),
            AgendaPage.findAll({
                attributes: ['date', 'freeformNotes', ...(includePrivate ? ['privateNotes'] : []), 'moodOrPriority'],
                where: {
                    ownerId,
                    date: { [Op.between]: [startDate, endDate] },
                },
                order: [['date', 'ASC']],
            }),
            AgendaEntry.findAll({
                where: {
                    ownerId,
                    date: { [Op.between]: [startDate, endDate] },
                    deletedAt: null,
                    ...(includePrivate ? {} : { isPrivate: false }),
                },
                include: buildEntryIncludes(),
                order: [
                    ['date', 'ASC'],
                    ['timeSlot', 'ASC'],
                    ['sortOrder', 'ASC'],
                    ['id', 'ASC'],
                ],
            }),
        ]);

        const entries = rawEntries.map((e) => sanitizeEntryForAccess(e, req.agendaAccess));

        const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'portrait' });
        const buffers = [];

        const fontPathRegular = path.join(__dirname, '../fonts/Roboto-Regular.ttf');
        const fontPathBold = path.join(__dirname, '../fonts/Roboto-Bold.ttf');

        try {
            doc.registerFont('Roboto-Regular', fontPathRegular);
            doc.registerFont('Roboto-Bold', fontPathBold);
        } catch (fontErr) {
            console.error('[AGENDA PDF FONT ERROR]', fontErr.message);
        }

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            const filename = startDate === endDate ? `ajanda_${startDate}.pdf` : `ajanda_${startDate}_${endDate}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfData.length);
            res.setHeader('Cache-Control', 'no-store');
            res.send(pdfData);
        });

        const statusSymbol = (st) => {
            if (st === 'done') return '[✓]';
            if (st === 'migrated') return '[→]';
            if (st === 'cancelled') return '[✗]';
            return '[ ]';
        };

        // Header Banner
        const ownerTitle = owner?.displayName || owner?.username || 'Ajanda';
        const headerRangeText =
            startDate === endDate
                ? new Date(`${startDate}T00:00:00`).toLocaleDateString('tr-TR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                  })
                : `${startDate} — ${endDate} Programı`;

        doc.font('Roboto-Bold').fontSize(16).fillColor('#0f172a').text(headerRangeText, { align: 'left' });
        doc.font('Roboto-Regular')
            .fontSize(10)
            .fillColor('#475569')
            .text(`Ajanda: ${ownerTitle} • Oluşturulma: ${new Date().toLocaleString('tr-TR')}`);
        doc.moveDown(0.6);
        doc.moveTo(36, doc.y).lineTo(559, doc.y).strokeColor('#cbd5e1').lineWidth(1).stroke();
        doc.moveDown(0.8);

        // Build dates list in range
        const dateList = [];
        let cursor = startDate;
        while (cursor <= endDate) {
            dateList.push(cursor);
            cursor = addDays(cursor, 1);
        }

        const pagesByDate = Object.fromEntries(pages.map((p) => [p.date, p]));

        for (const dStr of dateList) {
            const dayEntries = entries.filter((e) => e.date === dStr);
            const dayPage = pagesByDate[dStr];
            const hasFreeform = Boolean(dayPage?.freeformNotes && dayPage.freeformNotes.trim());
            const hasPrivate = Boolean(includePrivate && dayPage?.privateNotes && dayPage.privateNotes.trim());

            if (dateList.length > 1 && dayEntries.length === 0 && !hasFreeform && !hasPrivate) {
                continue;
            }

            if (dateList.length > 1) {
                const dayLabel = new Date(`${dStr}T00:00:00`).toLocaleDateString('tr-TR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                });
                doc.font('Roboto-Bold').fontSize(12).fillColor('#1e3a8a').text(dayLabel);
                doc.moveDown(0.3);
            }

            if (dayEntries.length > 0) {
                const rows = dayEntries.map((entry) => {
                    const contactText = (entry.contactLinks || [])
                        .map((link) => {
                            if (includeContactPhones && link.card) {
                                const extras = [link.card.company, link.card.phone].filter(Boolean).join(' • ');
                                return extras
                                    ? `@${link.displayNameSnapshot} (${extras})`
                                    : `@${link.displayNameSnapshot}`;
                            }
                            return `@${link.displayNameSnapshot}`;
                        })
                        .join(', ');

                    const tagText = (entry.tags || []).map((tItem) => `#${tItem.name}`).join(' ');
                    const delegateText =
                        entry.createdBy && Number(entry.createdBy.id) !== Number(ownerId)
                            ? ` [Vekâleten: ${entry.createdBy.displayName || entry.createdBy.username}]`
                            : '';

                    const fullDetails = [entry.content, contactText, tagText, delegateText].filter(Boolean).join(' — ');

                    return [entry.timeSlot || '—', statusSymbol(entry.status), fullDetails];
                });

                await doc.table(
                    {
                        headers: ['Saat', 'Durum', 'Program / Telefon Notu / Görev'],
                        rows,
                    },
                    {
                        prepareHeader: () => doc.font('Roboto-Bold').fontSize(9).fillColor('#0f172a'),
                        prepareRow: () => doc.font('Roboto-Regular').fontSize(9).fillColor('#1e293b'),
                        columnsSize: [50, 48, 425],
                    },
                );
            } else {
                doc.font('Roboto-Regular')
                    .fontSize(9.5)
                    .fillColor('#64748b')
                    .text('Bu güne ait saatli program veya madde kaydı bulunmuyor.');
                doc.moveDown(0.5);
            }

            if (hasFreeform) {
                doc.moveDown(0.3);
                doc.font('Roboto-Bold').fontSize(10).fillColor('#0f172a').text('Günlük Serbest Notlar:');
                doc.font('Roboto-Regular').fontSize(9.5).fillColor('#1e293b').text(dayPage.freeformNotes.trim());
                doc.moveDown(0.5);
            }

            if (hasPrivate) {
                doc.moveDown(0.3);
                doc.font('Roboto-Bold').fontSize(10).fillColor('#b45309').text('Özel Karalama (Gizli):');
                doc.font('Roboto-Regular').fontSize(9.5).fillColor('#1e293b').text(dayPage.privateNotes.trim());
                doc.moveDown(0.5);
            }

            doc.moveDown(0.4);
        }

        if (includeBlankLines) {
            doc.moveDown(0.6);
            doc.font('Roboto-Bold').fontSize(10).fillColor('#334155').text('Toplantı / El Yazısı Not Alanı:');
            doc.moveDown(0.3);
            for (let i = 0; i < 7; i++) {
                const lineY = doc.y + 18;
                if (lineY > 780) break;
                doc.moveTo(36, lineY).lineTo(559, lineY).strokeColor('#cbd5e1').lineWidth(0.6).stroke();
                doc.y = lineY + 4;
            }
        }

        doc.end();

        await logAction({
            action: 'AGENDA_PDF_EXPORT',
            details: `Ajanda PDF çıktısı alındı (${startDate}..${endDate}, ownerId=${ownerId})`,
            req,
        });
    } catch (error) {
        console.error('[AGENDA PDF EXPORT ERROR]', error);
        if (!res.headersSent) {
            return res.status(500).json({ errorCode: 'AGENDA_PDF_EXPORT_FAILED' });
        }
    }
};
