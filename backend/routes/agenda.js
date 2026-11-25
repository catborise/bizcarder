const express = require('express');
const router = express.Router();
const { resolveAgendaAccess } = require('../middleware/agendaAccess');
const agendaController = require('../controllers/agendaController');
const delegationController = require('../controllers/delegationController');
const agendaShareController = require('../controllers/agendaShareController');

// Daily page & notes
router.get('/day/:date', resolveAgendaAccess('read'), agendaController.getDailyPage);
router.put('/day/:date/notes', resolveAgendaAccess('write'), agendaController.updateDailyPageNotes);

// Entries CRUD & roll-over migration
router.post('/entries', resolveAgendaAccess('write'), agendaController.createEntry);
router.post('/entries/migrate-unfinished', resolveAgendaAccess('write'), agendaController.migrateUnfinishedEntries);
router.patch('/entries/:id', resolveAgendaAccess('write'), agendaController.updateEntry);
router.delete('/entries/:id', resolveAgendaAccess('write'), agendaController.deleteEntry);

// Search, yearly index & contact agenda history
router.get('/search', resolveAgendaAccess('read'), agendaController.searchAgenda);
router.get('/year-overview/:year', resolveAgendaAccess('read'), agendaController.getYearOverview);
router.get('/contact/:cardId', resolveAgendaAccess('read'), agendaController.getContactAgendaHistory);

// Substitute Secretary Delegations (Vekâlet / Görevlendirme)
router.get('/delegations', delegationController.listDelegations);
router.post('/delegations', delegationController.createDelegation);
router.delete('/delegations/:id', delegationController.revokeDelegation);

// Selective Page Shares (Owner only)
router.get('/shares', resolveAgendaAccess('read', { requireOwner: true }), agendaShareController.listShares);
router.post('/shares', resolveAgendaAccess('write', { requireOwner: true }), agendaShareController.createShare);
router.delete('/shares/:id', resolveAgendaAccess('write', { requireOwner: true }), agendaShareController.revokeShare);

module.exports = router;
