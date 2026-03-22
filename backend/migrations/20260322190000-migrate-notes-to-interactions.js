'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [cards] = await queryInterface.sequelize.query(
      'SELECT id, notes, "ownerId", "updatedAt" FROM "BusinessCards" WHERE notes IS NOT NULL AND notes != \'\''
    );

    const interactions = cards.map(card => ({
      type: 'Not',
      notes: card.notes,
      cardId: card.id,
      authorId: card.ownerId,
      date: card.updatedAt,
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    if (interactions.length > 0) {
      await queryInterface.bulkInsert('Interactions', interactions);
    }
    
    // Opsiyonel: BusinessCards tablosundaki notes alanını temizlemiyoruz (güvenlik için), 
    // ancak ön yüzde artık Interactions kullanılacak.
  },

  async down(queryInterface, Sequelize) {
    // Geri alma işlemi karmaşık olabilir (hangi etkileşimin taşındığını bilmek gerekir).
    // Bu veri taşıma işlemi olduğu için 'down' boş bırakılabilir veya manuel müdahale gerekebilir.
  }
};
