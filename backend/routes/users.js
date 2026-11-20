const express = require('express');
const router = express.Router();
const { User, BusinessCard, Tag, Interaction, AuditLog, BusinessCardHistory } = require('../models');
const sequelize = require('../config/database');
const { logger, logAction } = require('../utils/logger');
const { requireAdmin } = require('../middleware/auth');
const { sendApprovalEmail } = require('../utils/mailer');

// All user management routes require admin
router.use(requireAdmin);

// Tüm Kullanıcıları Getir
router.get('/', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'displayName', 'role', 'isApproved', 'createdAt'],
            order: [['createdAt', 'DESC']],
        });
        res.json(users);
    } catch (error) {
        logger.error('Users list error:', error);
        res.status(500).json({ errorCode: 'USERS_LIST_FAILED' });
    }
});

// Kullanıcı Rolünü Güncelle
router.put('/:id/role', async (req, res) => {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ errorCode: 'INVALID_ROLE' });
    }

    // Prevent admin self-demotion (lockout risk)
    if (parseInt(id, 10) === req.user.id && role !== 'admin') {
        return res.status(400).json({ errorCode: 'CANNOT_DEMOTE_SELF' });
    }

    const t = await sequelize.transaction();
    try {
        const user = await User.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ errorCode: 'USER_NOT_FOUND' });
        }

        const oldRole = user.role;
        await user.update({ role }, { transaction: t });
        await t.commit();

        // LOG: Role değişimi
        await logAction({
            action: 'USER_ROLE_UPDATE',
            details: `Kullanıcı rolü güncellendi: ${user.username} (${oldRole} -> ${role})`,
            req,
        });

        res.json({ message: 'Kullanıcı rolü güncellendi.', user });
    } catch (error) {
        await t.rollback();
        logger.error('User role update error:', error);
        await logAction({
            action: 'USER_ROLE_UPDATE_ERROR',
            details: 'Kullanıcı rolü güncellenirken hata oluştu.',
            req,
        });
        res.status(500).json({ errorCode: 'ROLE_UPDATE_FAILED' });
    }
});

// Admin Tarafından Kullanıcı Şifresi Sıfırlama
router.put('/:id/password', async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body || {};

    if (typeof newPassword !== 'string' || !newPassword) {
        return res.status(400).json({ errorCode: 'PASSWORD_REQUIRED' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ errorCode: 'PASSWORD_TOO_SHORT' });
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return res.status(400).json({ errorCode: 'PASSWORD_COMPLEXITY_FAILED' });
    }

    const t = await sequelize.transaction();
    try {
        const user = await User.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ errorCode: 'USER_NOT_FOUND' });
        }

        // Şifreyi güncelle (Model hook'u hashleyecek)
        user.password = newPassword;
        await user.save({ transaction: t });
        await t.commit();

        // LOG: Şifre sıfırlama
        await logAction({
            action: 'ADMIN_PASSWORD_RESET',
            details: `Admin ${req.user.username}, ${user.username} kullanıcısının şifresini sıfırladı.`,
            req,
        });

        res.json({ message: 'Kullanıcı şifresi başarıyla güncellendi.' });
    } catch (error) {
        await t.rollback();
        console.error('Admin password reset error:', error);
        res.status(500).json({ errorCode: 'PASSWORD_RESET_FAILED' });
    }
});

// Admin Tarafından Kullanıcı Onaylama
router.put('/:id/approve', async (req, res) => {
    const { id } = req.params;
    const { isApproved } = req.body || {};

    if (typeof isApproved !== 'boolean') {
        return res.status(400).json({ errorCode: 'INVALID_APPROVAL_VALUE' });
    }

    // Prevent admin from revoking own approval
    if (parseInt(id, 10) === req.user.id && isApproved === false) {
        return res.status(400).json({ errorCode: 'CANNOT_UNAPPROVE_SELF' });
    }

    const t = await sequelize.transaction();
    try {
        const user = await User.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ errorCode: 'USER_NOT_FOUND' });
        }

        // Onay durumunu güncelle
        await user.update({ isApproved }, { transaction: t });
        await t.commit();

        // LOG: Kullanıcı onaylama
        await logAction({
            action: 'USER_APPROVAL_UPDATE',
            details: `Admin ${req.user.username}, ${user.username} kullanıcısının onay durumunu güncelledi: ${isApproved}`,
            req,
        });

        // Send approval email when account is approved (non-blocking)
        if (isApproved) {
            sendApprovalEmail(user).catch(() => {});
        }

        res.json({
            message: isApproved ? 'Kullanıcı onaylandı.' : 'Kullanıcı onayı kaldırıldı.',
            user: {
                id: user.id,
                username: user.username,
                isApproved: user.isApproved,
            },
        });
    } catch (error) {
        await t.rollback();
        console.error('User approval error:', error);
        res.status(500).json({ errorCode: 'APPROVAL_FAILED' });
    }
});

// Kullanıcıyı Sil (Kartvizitleri Sil veya Aktar)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const { transferCards } = req.body || {}; // true: aktar, false: kartları da sil (soft delete)

    // Kendini silmeyi engelle
    if (parseInt(id, 10) === req.user.id) {
        return res.status(400).json({ errorCode: 'CANNOT_DELETE_SELF' });
    }

    const t = await sequelize.transaction();
    try {
        const userToDelete = await User.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!userToDelete) {
            await t.rollback();
            return res.status(404).json({ errorCode: 'USER_NOT_FOUND' });
        }

        const cardCount = await BusinessCard.count({ where: { ownerId: id }, transaction: t });

        if (transferCards === true) {
            // Kartları admin'e aktar
            await BusinessCard.update({ ownerId: req.user.id }, { where: { ownerId: id }, transaction: t });
        } else {
            // Kartları soft delete yap ve admin'e ata (çöp kutusunda admin görsün diye)
            await BusinessCard.update(
                {
                    ownerId: req.user.id,
                    deletedAt: new Date(),
                    deletedBy: req.user.id,
                },
                { where: { ownerId: id }, transaction: t },
            );
        }

        // Nullify remaining nullable FK references to prevent PostgreSQL 23503 FK violations
        await BusinessCard.update({ deletedBy: null }, { where: { deletedBy: id }, transaction: t });
        await Tag.update({ ownerId: null }, { where: { ownerId: id }, transaction: t });
        await Interaction.update({ authorId: null }, { where: { authorId: id }, transaction: t });
        await AuditLog.update({ userId: null }, { where: { userId: id }, transaction: t });
        await BusinessCardHistory.update({ changedBy: null }, { where: { changedBy: id }, transaction: t });

        // Kullanıcıyı sil
        await userToDelete.destroy({ transaction: t });
        await t.commit();

        await logAction({
            action: transferCards === true ? 'USER_DELETE_TRANSFER' : 'USER_DELETE_WITH_CARDS',
            details:
                transferCards === true
                    ? `Admin ${req.user.username}, ${userToDelete.username} kullanıcısını sildi ve ${cardCount} kartviziti devraldı.`
                    : `Admin ${req.user.username}, ${userToDelete.username} kullanıcısını ve ${cardCount} kartvizitini sildi.`,
            req,
        });

        res.json({ message: 'Kullanıcı başarıyla silindi.' });
    } catch (error) {
        await t.rollback();
        console.error('User delete error:', error);
        res.status(500).json({ errorCode: 'USER_DELETE_FAILED' });
    }
});

module.exports = router;
