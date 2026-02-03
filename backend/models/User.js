const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true // Shibboleth kullanıcıları için null olabilir
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    displayName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    shibbolethId: { // IdP'den gelen benzersiz ID (örn: uid veya sub)
        type: DataTypes.STRING,
        unique: true,
        allowNull: true // Yerel kullanıcılar için null olabilir
    },
    role: {
        type: DataTypes.ENUM('user', 'admin'),
        defaultValue: 'user'
    },
    trashRetentionDays: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
        allowNull: false,
        validate: {
            min: 1,
            max: 365
        }
    },
    aiOcrEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    aiOcrProvider: {
        type: DataTypes.ENUM('openai', 'gemini', 'anthropic'),
        defaultValue: 'openai'
    },
    aiOcrApiKey: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    hooks: {
        // Kullanıcı oluşturulmadan önce şifreyi hashle
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
        // Kullanıcı güncellenirken şifre değişmişse hashle
        beforeUpdate: async (user) => {
            if (user.changed('password') && user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

// Şifre doğrulama metodu
User.prototype.validatePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = User;
