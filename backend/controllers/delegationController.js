const { Op } = require('sequelize');
const { sequelize, AgendaDelegation, User } = require('../models');
const { logAction } = require('../utils/logger');

const MAX_DELEGATION_DAYS = 365;

exports.listDelegations = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const now = new Date();

        const [outgoing, incoming, colleagues] = await Promise.all([
            AgendaDelegation.findAll({
                where: { principalUserId: userId },
                include: [{ model: User, as: 'delegate', attributes: ['id', 'username', 'displayName', 'email'] }],
                order: [['createdAt', 'DESC']],
            }),
            AgendaDelegation.findAll({
                where: {
                    delegateUserId: userId,
                    isActive: true,
                    endsAt: { [Op.gte]: now },
                },
                include: [{ model: User, as: 'principal', attributes: ['id', 'username', 'displayName', 'email'] }],
                order: [['startsAt', 'ASC']],
            }),
            User.findAll({
                where: {
                    id: { [Op.ne]: userId },
                    isApproved: true,
                },
                attributes: ['id', 'username', 'displayName'],
                order: [['displayName', 'ASC']],
            }),
        ]);

        const activeIncoming = incoming.map((d) => {
            const plain = d.toJSON();
            plain.isCurrentlyActive = new Date(d.startsAt) <= now && now <= new Date(d.endsAt);
            return plain;
        });

        return res.json({
            outgoing,
            incoming: activeIncoming,
            colleagues,
        });
    } catch (error) {
        console.error('[AGENDA LIST DELEGATIONS ERROR]', error);
        return res.status(500).json({ errorCode: 'AGENDA_DELEGATIONS_LOAD_FAILED' });
    }
};

exports.createDelegation = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        // Sub-delegation prevention: if acting under X-Agenda-Owner-Id of someone else, forbid
        const requestedHeaderOwner = req.headers['x-agenda-owner-id'] || req.body?.ownerId;
        if (requestedHeaderOwner && Number(requestedHeaderOwner) !== Number(req.user.id)) {
            await t.rollback();
            return res.status(403).json({ errorCode: 'AGENDA_OWNER_ONLY' });
        }

        const principalUserId = Number(req.user.id);
        const delegateUserId = Number(req.body.delegateUserId);
        const { permission = 'write', startsAt, endsAt, note } = req.body;

        if (!Number.isInteger(delegateUserId) || delegateUserId <= 0) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'INVALID_DELEGATE_USER' });
        }
        if (delegateUserId === principalUserId) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'CANNOT_DELEGATE_TO_SELF' });
        }

        const startDate = startsAt ? new Date(startsAt) : new Date();
        const endDate = endsAt ? new Date(endsAt) : null;

        if (!endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'INVALID_DELEGATION_DATE_RANGE' });
        }

        const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        if (durationDays > MAX_DELEGATION_DAYS) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'DELEGATION_DURATION_TOO_LONG' });
        }

        const delegateUser = await User.findOne({
            where: { id: delegateUserId, isApproved: true },
            attributes: ['id', 'username', 'displayName'],
            transaction: t,
        });
        if (!delegateUser) {
            await t.rollback();
            return res.status(404).json({ errorCode: 'DELEGATE_USER_NOT_FOUND' });
        }

        const allowedPermissions = ['read', 'write'];
        if (!allowedPermissions.includes(permission)) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'INVALID_DELEGATION_PERMISSION' });
        }
        const finalPermission = permission;

        // Deactivate any previous active delegation for the same pair inside transaction
        await AgendaDelegation.update(
            { isActive: false },
            {
                where: {
                    principalUserId,
                    delegateUserId,
                    isActive: true,
                },
                transaction: t,
            },
        );

        const delegation = await AgendaDelegation.create(
            {
                principalUserId,
                delegateUserId,
                permission: finalPermission,
                startsAt: startDate,
                endsAt: endDate,
                note: note ? String(note).trim().slice(0, 255) : null,
                isActive: true,
            },
            { transaction: t },
        );

        await t.commit();

        const fullDelegation = await AgendaDelegation.findByPk(delegation.id, {
            include: [
                { model: User, as: 'principal', attributes: ['id', 'username', 'displayName'] },
                { model: User, as: 'delegate', attributes: ['id', 'username', 'displayName'] },
            ],
        });

        await logAction({
            action: 'AGENDA_DELEGATION_CREATE',
            details: `Ajanda vekâleti tanımlandı: principal=${principalUserId} -> delegate=${delegateUser.username} (${startDate.toISOString()} - ${endDate.toISOString()})`,
            req,
        });

        return res.status(201).json(fullDelegation);
    } catch (error) {
        if (t && !t.finished) await t.rollback();
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ errorCode: 'AGENDA_DELEGATION_CONFLICT' });
        }
        console.error('[AGENDA CREATE DELEGATION ERROR]', error);
        return res.status(500).json({ errorCode: 'AGENDA_DELEGATION_CREATE_FAILED' });
    }
};

exports.revokeDelegation = async (req, res) => {
    const delegationId = Number(req.params.id);
    if (!Number.isInteger(delegationId) || delegationId <= 0) {
        return res.status(400).json({ errorCode: 'INVALID_DELEGATION_ID' });
    }

    const t = await sequelize.transaction();
    try {
        const delegation = await AgendaDelegation.findByPk(delegationId, {
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        if (!delegation) {
            await t.rollback();
            return res.status(404).json({ errorCode: 'AGENDA_DELEGATION_NOT_FOUND' });
        }

        const actorId = Number(req.user.id);
        const canRevoke =
            Number(delegation.principalUserId) === actorId ||
            Number(delegation.delegateUserId) === actorId ||
            req.user.role === 'admin';

        if (!canRevoke) {
            await t.rollback();
            return res.status(403).json({ errorCode: 'AGENDA_OWNER_ONLY' });
        }

        delegation.isActive = false;
        await delegation.save({ transaction: t });
        await t.commit();

        await logAction({
            action: 'AGENDA_DELEGATION_REVOKE',
            details: `Ajanda vekâleti sonlandırıldı (id=${delegation.id}, principal=${delegation.principalUserId}, delegate=${delegation.delegateUserId}, actor=${actorId})`,
            req,
        });

        return res.json({ messageCode: 'AGENDA_DELEGATION_REVOKED' });
    } catch (error) {
        if (t && !t.finished) await t.rollback();
        console.error('[AGENDA REVOKE DELEGATION ERROR]', error);
        return res.status(500).json({ errorCode: 'AGENDA_DELEGATION_REVOKE_FAILED' });
    }
};
