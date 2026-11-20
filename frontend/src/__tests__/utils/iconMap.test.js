import { TILE_ICON_MAP, resolveTileIcon } from '../../utils/iconMap';

describe('iconMap', () => {
    it('returns the mapped icon component for known icon names', () => {
        expect(resolveTileIcon('FaAddressBook')).toBe(TILE_ICON_MAP.FaAddressBook);
        expect(resolveTileIcon('FaFileImport')).toBe(TILE_ICON_MAP.FaFileImport);
        expect(resolveTileIcon('FaHistory')).toBe(TILE_ICON_MAP.FaHistory);
    });

    it('falls back to FaLink for unknown or empty icon names', () => {
        expect(resolveTileIcon('FaNonExistentIcon')).toBe(TILE_ICON_MAP.FaLink);
        expect(resolveTileIcon('')).toBe(TILE_ICON_MAP.FaLink);
        expect(resolveTileIcon(null)).toBe(TILE_ICON_MAP.FaLink);
    });
});
