const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize, AgendaShare, AgendaPage, AgendaEntry, AgendaEntryContact, Tag, User } = require('../models');
const { logAction } = require('../utils/logger');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HEX64_REGEX = /^[0-9a-f]{64}$/i;

function isValidDateString(dateStr) {
    if (!DATE_REGEX.test(String(dateStr || ''))) return false;
    const d = new Date(`${dateStr}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr;
}

function hashToken(rawToken) {
    return crypto.createHash('sha256').update(String(rawToken).toLowerCase()).digest('hex');
}

exports.createShare = async (req, res) => {
    try {
        const { ownerId, isOwner } = req.agendaAccess;
        if (!isOwner) {
            return res.status(403).json({ errorCode: 'AGENDA_OWNER_ONLY' });
        }

        const { startDate, endDate: rawEndDate, title, sharedWithUserId, expiresAt } = req.body;
        if (!isValidDateString(startDate)) {
            return res.status(400).json({ errorCode: 'INVALID_AGENDA_DATE' });
        }

        const endDate = rawEndDate ? String(rawEndDate) : startDate;
        if (!isValidDateString(endDate) || endDate < startDate) {
            return res.status(400).json({ errorCode: 'INVALID_SHARE_DATE_RANGE' });
        }

        const diffDays =
            (new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) /
            (1000 * 60 * 60 * 24);
        if (diffDays > 31) {
            return res.status(400).json({ errorCode: 'SHARE_RANGE_TOO_LARGE' });
        }

        let expDate = null;
        if (expiresAt) {
            expDate = new Date(expiresAt);
            if (Number.isNaN(expDate.getTime()) || expDate <= new Date()) {
                return res.status(400).json({ errorCode: 'INVALID_SHARE_EXPIRY' });
            }
        }

        let recipientUserId = null;
        if (sharedWithUserId !== undefined && sharedWithUserId !== null && sharedWithUserId !== '') {
            const parsedRecipient = Number(sharedWithUserId);
            if (!Number.isInteger(parsedRecipient) || parsedRecipient <= 0) {
                return res.status(400).json({ errorCode: 'INVALID_SHARE_RECIPIENT' });
            }
            const recipientUser = await User.findOne({
                where: { id: parsedRecipient, isApproved: true },
                attributes: ['id'],
            });
            if (!recipientUser) {
                return res.status(400).json({ errorCode: 'INVALID_SHARE_RECIPIENT' });
            }
            recipientUserId = recipientUser.id;
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const shareTokenHash = hashToken(rawToken);

        const share = await AgendaShare.create({
            ownerId,
            shareTokenHash,
            startDate,
            endDate,
            title: title ? String(title).trim().slice(0, 150) : null,
            sharedWithUserId: recipientUserId,
            expiresAt: expDate,
            isActive: true,
        });

        await logAction({
            action: 'AGENDA_SHARE_CREATE',
            details: `Ajanda sayfa paylaşımı oluşturuldu (id=${share.id}, ${startDate}..${endDate}, ownerId=${ownerId})`,
            req,
        });

        res.setHeader('Cache-Control', 'no-store');
        return res.status(201).json({
            share: {
                id: share.id,
                ownerId: share.ownerId,
                startDate: share.startDate,
                endDate: share.endDate,
                title: share.title,
                sharedWithUserId: share.sharedWithUserId,
                expiresAt: share.expiresAt,
                isActive: share.isActive,
                viewCount: share.viewCount,
                createdAt: share.createdAt,
            },
            rawToken,
        });
    } catch (error) {
        console.error('[AGENDA CREATE SHARE ERROR]', error);
        return res.status(500).json({ errorCode: 'AGENDA_SHARE_CREATE_FAILED' });
    }
};

exports.listShares = async (req, res) => {
    try {
        const { ownerId, isOwner } = req.agendaAccess;
        if (!isOwner) {
            return res.status(403).json({ errorCode: 'AGENDA_OWNER_ONLY' });
        }

        const [outgoing, sharedWithMe] = await Promise.all([
            AgendaShare.findAll({
                attributes: [
                    'id',
                    'ownerId',
                    'startDate',
                    'endDate',
                    'title',
                    'sharedWithUserId',
                    'expiresAt',
                    'isActive',
                    'viewCount',
                    'createdAt',
                ],
                where: { ownerId },
                include: [{ model: User, as: 'sharedWith', attributes: ['id', 'username', 'displayName'] }],
                order: [['createdAt', 'DESC']],
            }),
            AgendaShare.findAll({
                attributes: ['id', 'ownerId', 'startDate', 'endDate', 'title', 'expiresAt', 'isActive', 'createdAt'],
                where: {
                    sharedWithUserId: ownerId,
                    isActive: true,
                    [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
                },
                include: [{ model: User, as: 'owner', attributes: ['id', 'username', 'displayName'] }],
                order: [['createdAt', 'DESC']],
            }),
        ]);

        return res.json({
            outgoing,
            sharedWithMe,
        });
    } catch (error) {
        console.error('[AGENDA LIST SHARES ERROR]', error);
        return res.status(500).json({ errorCode: 'AGENDA_SHARES_LOAD_FAILED' });
    }
};

exports.revokeShare = async (req, res) => {
    const shareId = Number(req.params.id);
    if (!Number.isInteger(shareId) || shareId <= 0) {
        return res.status(400).json({ errorCode: 'INVALID_SHARE_ID' });
    }

    const t = await sequelize.transaction();
    try {
        const { ownerId, isOwner } = req.agendaAccess;
        if (!isOwner) {
            await t.rollback();
            return res.status(403).json({ errorCode: 'AGENDA_OWNER_ONLY' });
        }

        const share = await AgendaShare.findOne({
            where: {
                id: shareId,
                ownerId,
            },
            lock: t.LOCK.UPDATE,
            transaction: t,
        });

        if (!share) {
            await t.rollback();
            return res.status(404).json({ errorCode: 'AGENDA_SHARE_NOT_FOUND' });
        }

        share.isActive = false;
        await share.save({ transaction: t });
        await t.commit();

        await logAction({
            action: 'AGENDA_SHARE_REVOKE',
            details: `Ajanda sayfa paylaşımı iptal edildi (id=${share.id}, ownerId=${ownerId})`,
            req,
        });

        return res.json({ messageCode: 'AGENDA_SHARE_REVOKED' });
    } catch (error) {
        if (t && !t.finished) await t.rollback();
        console.error('[AGENDA REVOKE SHARE ERROR]', error);
        return res.status(500).json({ errorCode: 'AGENDA_SHARE_REVOKE_FAILED' });
    }
};

exports.getPublicSharedAgenda = async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        res.setHeader('Referrer-Policy', 'no-referrer');

        const rawToken = String(req.params.token || '');
        if (!HEX64_REGEX.test(rawToken)) {
            return res.status(404).json({ errorCode: 'AGENDA_SHARE_NOT_FOUND' });
        }

        const shareTokenHash = hashToken(rawToken);
        const share = await AgendaShare.findOne({
            where: {
                shareTokenHash,
                isActive: true,
            },
            include: [{ model: User, as: 'owner', attributes: ['id', 'displayName', 'isApproved'] }],
        });

        // Uniform 404 for missing, revoked, expired, or unapproved-owner tokens
        if (!share || !share.owner?.isApproved || (share.expiresAt && new Date(share.expiresAt) <= new Date())) {
            return res.status(404).json({ errorCode: 'AGENDA_SHARE_NOT_FOUND' });
        }

        // If share is restricted to a specific recipient user (sharedWithUserId), enforce session match
        if (share.sharedWithUserId) {
            const viewerId = req.user?.id ? Number(req.user.id) : null;
            if (viewerId !== Number(share.sharedWithUserId) && viewerId !== Number(share.ownerId)) {
                return res.status(404).json({ errorCode: 'AGENDA_SHARE_NOT_FOUND' });
            }
        }

        if (!req.user || Number(req.user.id) !== Number(share.ownerId)) {
            await share.increment('viewCount');
        }

        // Strictly exclude privateNotes, isPrivate entries, and contact phone/email PII
        const [pages, entries] = await Promise.all([
            AgendaPage.findAll({
                attributes: ['date', 'freeformNotes', 'moodOrPriority', 'updatedAt'],
                where: {
                    ownerId: share.ownerId,
                    date: { [Op.between]: [share.startDate, share.endDate] },
                },
                order: [['date', 'ASC']],
            }),
            AgendaEntry.findAll({
                attributes: [
                    'id',
                    'date',
                    'timeSlot',
                    'endTime',
                    'entryType',
                    'content',
                    'status',
                    'priority',
                    'migratedToDate',
                ],
                where: {
                    ownerId: share.ownerId,
                    date: { [Op.between]: [share.startDate, share.endDate] },
                    deletedAt: null,
                    isPrivate: false,
                },
                include: [
                    { model: User, as: 'createdBy', attributes: ['displayName'] },
                    {
                        model: AgendaEntryContact,
                        as: 'contactLinks',
                        attributes: ['displayNameSnapshot'],
                    },
                    {
                        model: Tag,
                        as: 'tags',
                        attributes: ['name', 'color'],
                        through: { attributes: [] },
                    },
                ],
                order: [
                    ['date', 'ASC'],
                    ['timeSlot', 'ASC'],
                    ['sortOrder', 'ASC'],
                    ['id', 'ASC'],
                ],
            }),
        ]);

        return res.json({
            share: {
                title: share.title,
                startDate: share.startDate,
                endDate: share.endDate,
                ownerName: share.owner?.displayName || '',
                expiresAt: share.expiresAt,
            },
            pages,
            entries,
        });
    } catch (error) {
        console.error('[PUBLIC AGENDA SHARE ERROR]', error);
        return res.status(500).json({ errorCode: 'PUBLIC_AGENDA_LOAD_FAILED' });
    }
};
