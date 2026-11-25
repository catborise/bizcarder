const { Op } = require('sequelize');
const { AgendaDelegation, User } = require('../models');

/**
 * Resolves effective agenda owner and enforces the Principal vs Substitute permission matrix.
 *
 * @param {'read'|'write'} requiredPermission
 * @param {{ requireOwner?: boolean }} options
 */
function resolveAgendaAccess(requiredPermission = 'read', { requireOwner = false } = {}) {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({ errorCode: 'AUTH_REQUIRED' });
            }

            const rawOwnerId =
                req.headers['x-agenda-owner-id'] || req.query?.ownerId || req.body?.ownerId || req.user.id;
            const targetOwnerId = Number(rawOwnerId);

            if (!Number.isInteger(targetOwnerId) || targetOwnerId <= 0) {
                return res.status(400).json({ errorCode: 'INVALID_AGENDA_OWNER' });
            }

            if (targetOwnerId === Number(req.user.id)) {
                req.agendaAccess = {
                    ownerId: targetOwnerId,
                    actorUserId: Number(req.user.id),
                    isOwner: true,
                    isDelegate: false,
                    permission: 'owner',
                    delegation: null,
                };
                return next();
            }

            if (requireOwner) {
                return res.status(403).json({ errorCode: 'AGENDA_OWNER_ONLY' });
            }

            const now = new Date();
            const [principalUser, delegation] = await Promise.all([
                User.findOne({
                    where: { id: targetOwnerId, isApproved: true },
                    attributes: ['id'],
                }),
                AgendaDelegation.findOne({
                    where: {
                        principalUserId: targetOwnerId,
                        delegateUserId: req.user.id,
                        isActive: true,
                        startsAt: { [Op.lte]: now },
                        endsAt: { [Op.gte]: now },
                    },
                    order: [['createdAt', 'DESC']],
                }),
            ]);

            if (!principalUser || !delegation) {
                return res.status(403).json({ errorCode: 'AGENDA_ACCESS_DENIED' });
            }

            if (requiredPermission === 'write' && delegation.permission !== 'write') {
                return res.status(403).json({ errorCode: 'AGENDA_WRITE_DENIED' });
            }

            req.agendaAccess = {
                ownerId: targetOwnerId,
                actorUserId: Number(req.user.id),
                isOwner: false,
                isDelegate: true,
                permission: delegation.permission,
                delegation,
            };
            return next();
        } catch (error) {
            console.error('[AGENDA ACCESS ERROR]', error);
            return res.status(500).json({ errorCode: 'AGENDA_ACCESS_CHECK_FAILED' });
        }
    };
}

module.exports = { resolveAgendaAccess };
