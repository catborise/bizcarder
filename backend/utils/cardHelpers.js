const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Op } = require('sequelize');
const { body } = require('express-validator');
const { Tag } = require('../models');
const { getSafeExtension } = require('./fileSecurity');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMPORT_EXTS = ['.xlsx', '.csv', '.vcf'];
const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_EXPORT_ROWS = 2000;
const UPLOADS_DIR = path.join(__dirname, '../uploads');

function escapeLikeWildcards(str) {
    return String(str).replace(/[%_\\]/g, '\\$&');
}

function sanitizeForExcel(value) {
    if (typeof value !== 'string') return value;
    if (/^[=+\-@\t\r]/.test(value)) return "'" + value;
    return value;
}

// Helper: filter tag IDs so non-admins can only attach their own tags or system tags (ownerId === null)
async function getAuthorizedTagIds(rawTagIds, user, transaction) {
    if (!Array.isArray(rawTagIds) || rawTagIds.length === 0) return [];
    const parsedIds = rawTagIds.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id) && id > 0);
    if (parsedIds.length === 0) return [];

    const where = { id: { [Op.in]: parsedIds } };
    if (user && user.role !== 'admin') {
        where[Op.or] = [{ ownerId: user.id }, { ownerId: null }];
    }
    const tags = await Tag.findAll({ where, attributes: ['id'], transaction });
    return tags.map((tag) => tag.id);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const ext = getSafeExtension(file.mimetype, false);
        if (!ext) return cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed.'));
        cb(null, crypto.randomUUID() + ext);
    },
});

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed.'), false);
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

const uploadFields = upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
    { name: 'logoImage', maxCount: 1 },
]);

const importStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (!ALLOWED_IMPORT_EXTS.includes(ext)) {
            return cb(new Error('Only .xlsx, .csv, and .vcf files are allowed.'));
        }
        cb(null, `import-${crypto.randomUUID()}${ext}`);
    },
});

const importFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ALLOWED_IMPORT_EXTS.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only .xlsx, .csv, and .vcf files are allowed.'), false);
    }
};

const importUpload = multer({
    storage: importStorage,
    fileFilter: importFileFilter,
    limits: { fileSize: MAX_IMPORT_FILE_SIZE },
});

const cardValidationRules = [
    body('firstName').trim().notEmpty().withMessage('Ad alanı zorunludur.'),
    body('lastName').trim().notEmpty().withMessage('Soyad alanı zorunludur.'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Geçerli bir e-posta adresi giriniz.'),
];

const buildCardsQuery = (req) => {
    const {
        remindersOnly,
        hasReminder,
        search,
        city,
        cities,
        sort,
        dateStart,
        dateEnd,
        leadStatus,
        statuses,
        source,
        priority,
    } = req.query;

    const whereClause = {
        deletedAt: null,
    };

    if (remindersOnly === 'true' || hasReminder === 'true') {
        whereClause.reminderDate = { [Op.ne]: null };
    }

    if (req.user && req.user.role !== 'admin') {
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push({
            [Op.or]: [{ ownerId: req.user.id }, { visibility: 'public' }],
        });
    }

    if (search) {
        const searchTerm = escapeLikeWildcards(search.toLowerCase());
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push({
            [Op.or]: [
                { firstName: { [Op.iLike]: `%${searchTerm}%` } },
                { lastName: { [Op.iLike]: `%${searchTerm}%` } },
                { company: { [Op.iLike]: `%${searchTerm}%` } },
                { email: { [Op.iLike]: `%${searchTerm}%` } },
                { title: { [Op.iLike]: `%${searchTerm}%` } },
                { city: { [Op.iLike]: `%${searchTerm}%` } },
                { phone: { [Op.iLike]: `%${searchTerm}%` } },
                { source: { [Op.iLike]: `%${searchTerm}%` } },
            ],
        });
    }

    if (city && typeof city === 'string') {
        whereClause.city = { [Op.iLike]: escapeLikeWildcards(city) };
    } else if (cities) {
        const cityList = Array.isArray(cities) ? cities : String(cities).split(',');
        whereClause.city = { [Op.in]: cityList };
    }

    if (leadStatus) {
        whereClause.leadStatus = leadStatus;
    } else if (statuses) {
        const statusList = Array.isArray(statuses) ? statuses : String(statuses).split(',');
        whereClause.leadStatus = { [Op.in]: statusList };
    }

    if (source && typeof source === 'string') {
        whereClause.source = { [Op.iLike]: `%${escapeLikeWildcards(source)}%` };
    }

    if (priority !== undefined && priority !== '') {
        const parsedPriority = parseInt(priority, 10);
        if (!isNaN(parsedPriority)) {
            whereClause.priority = parsedPriority;
        }
    }

    if (dateStart || dateEnd) {
        const dateFilter = {};
        if (dateStart) {
            const start = new Date(dateStart);
            if (!isNaN(start.getTime())) dateFilter[Op.gte] = start;
        }
        if (dateEnd) {
            const end = new Date(dateEnd);
            if (!isNaN(end.getTime())) {
                end.setHours(23, 59, 59, 999);
                dateFilter[Op.lte] = end;
            }
        }
        if (Object.keys(dateFilter).length > 0 || Object.getOwnPropertySymbols(dateFilter).length > 0) {
            whereClause.createdAt = dateFilter;
        }
    }

    let order = [['createdAt', 'DESC']];
    if (sort) {
        switch (sort) {
            case 'oldest':
                order = [['createdAt', 'ASC']];
                break;
            case 'nameAsc':
                order = [['firstName', 'ASC']];
                break;
            case 'nameDesc':
                order = [['firstName', 'DESC']];
                break;
            case 'companyAsc':
                order = [['company', 'ASC']];
                break;
            case 'newest':
                order = [['createdAt', 'DESC']];
                break;
            case 'priorityDesc':
                order = [['priority', 'DESC']];
                break;
            case 'lastInteraction':
                order = [['lastInteractionDate', 'DESC']];
                break;
        }
    }

    return { whereClause, order };
};

function buildTagFilterInclude(req) {
    if (!req.query.tagId && !req.query.tagIds) return null;
    return {
        model: Tag,
        as: 'tags',
        through: { attributes: [] },
        required: true,
        where: req.query.tagId
            ? { id: req.query.tagId }
            : {
                  id: {
                      [Op.in]: Array.isArray(req.query.tagIds) ? req.query.tagIds : String(req.query.tagIds).split(','),
                  },
              },
    };
}

function applySelectedIdsFilter(whereClause, idsQuery) {
    if (!idsQuery) return;
    const ids = String(idsQuery)
        .split(',')
        .slice(0, 500)
        .map((id) => parseInt(id, 10))
        .filter((id) => id > 0 && !isNaN(id));
    whereClause.id = { [Op.in]: ids };
}

module.exports = {
    MAX_EXPORT_ROWS,
    escapeLikeWildcards,
    sanitizeForExcel,
    getAuthorizedTagIds,
    upload,
    uploadFields,
    importUpload,
    cardValidationRules,
    buildCardsQuery,
    buildTagFilterInclude,
    applySelectedIdsFilter,
};
