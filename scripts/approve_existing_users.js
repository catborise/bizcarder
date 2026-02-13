const { User, sequelize } = require('../backend/models');

async function approveAllUsers() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connection established.');

        console.log('Approving all existing users...');
        const [updatedRows] = await User.update(
            { isApproved: true },
            { where: {} } // Tüm kullanıcıları güncelle
        );

        console.log(`Successfully approved ${updatedRows} users.`);
    } catch (error) {
        console.error('Error approving users:', error);
    } finally {
        await sequelize.close();
    }
}

approveAllUsers();
