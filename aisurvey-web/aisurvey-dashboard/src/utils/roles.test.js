import { canViewResults, canEditSurveys, canShareSurveys, canMessageSiteAdmin, homePath } from './roles';

// Rol matrisi tek yerde tanımlı olduğu için tek testte tutuluyor: bir rolün
// yetkisi sessizce genişlerse burası kırılır.
describe('rol matrisi', () => {
    const cases = {
        COMPANY_OWNER: { results: true, edit: true, share: true, message: true, home: '/admin/dashboard' },
        COMPANY_STAFF: { results: true, edit: false, share: false, message: false, home: '/admin/dashboard' },
        SURVEY_EDITOR: { results: false, edit: true, share: true, message: false, home: '/admin/survey-templates' },
        SURVEY_SHARER: { results: false, edit: false, share: true, message: false, home: '/admin/survey-templates' },
        ADMIN: { results: false, edit: false, share: false, message: false, home: '/admin/super/dashboard' }
    };

    Object.entries(cases).forEach(([role, expected]) => {
        it(role, () => {
            const roles = [role];
            expect(canViewResults(roles)).toBe(expected.results);
            expect(canEditSurveys(roles)).toBe(expected.edit);
            expect(canShareSurveys(roles)).toBe(expected.share);
            expect(canMessageSiteAdmin(roles)).toBe(expected.message);
            expect(homePath(roles)).toBe(expected.home);
        });
    });

    it('rolsüz kullanıcı sonuç sayfalarını görmez', () => {
        expect(canViewResults([])).toBe(false);
        expect(homePath([])).toBe('/admin/profile');
    });
});
