const supertest = require('supertest');
const passport = require('passport');
const app = require('../../server');
const { User } = require('../../models');

const P = 'saml';

describe('SAML Auth Routes & Passport Strategy', () => {
    const origEnv = { ...process.env };

    afterEach(() => {
        delete passport.samlStrategy;
        if (passport._strategies && passport._strategies.saml) {
            delete passport._strategies.saml;
        }
        process.env = { ...origEnv };
        jest.restoreAllMocks();
    });

    describe('SAML HTTP Routes', () => {
        test('GET /auth/login redirects with SAML_NOT_CONFIGURED when strategy is absent', async () => {
            process.env.FRONTEND_URL = 'http://localhost:5173';
            const res = await supertest(app).get('/auth/login');

            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('http://localhost:5173/login?errorCode=SAML_NOT_CONFIGURED');
        });

        test('GET /auth/login/fail redirects to /login with default SAML_LOGIN_FAILED errorCode', async () => {
            process.env.FRONTEND_URL = 'http://localhost:5173';
            const res = await supertest(app).get('/auth/login/fail');

            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('http://localhost:5173/login?errorCode=SAML_LOGIN_FAILED');
        });

        test('GET /auth/metadata.xml returns 404 SAML_NOT_CONFIGURED when strategy is absent', async () => {
            const res = await supertest(app).get('/auth/metadata.xml');

            expect(res.status).toBe(404);
            expect(res.body.errorCode).toBe('SAML_NOT_CONFIGURED');
        });

        test('GET /auth/metadata.xml returns SP XML when samlStrategy is configured', async () => {
            passport.samlStrategy = {
                generateServiceProviderMetadata: jest.fn().mockReturnValue('<EntityDescriptor entityID="crm" />'),
            };

            const res = await supertest(app).get('/auth/metadata.xml');

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('application/xml');
            expect(res.text).toContain('<EntityDescriptor entityID="crm" />');
        });

        test('GET /auth/metadata.xml returns 500 SAML_METADATA_FAILED when metadata generation throws', async () => {
            jest.spyOn(console, 'error').mockImplementation(() => {});
            passport.samlStrategy = {
                generateServiceProviderMetadata: jest.fn(() => {
                    throw new Error('bad cert');
                }),
            };

            const res = await supertest(app).get('/auth/metadata.xml');

            expect(res.status).toBe(500);
            expect(res.body.errorCode).toBe('SAML_METADATA_FAILED');
        });
    });

    describe('Passport SAML Strategy Verify Callback', () => {
        function loadSamlVerifyCallback(envOverrides = {}) {
            let capturedVerify = null;
            let capturedOptions = null;

            jest.isolateModules(() => {
                Object.assign(process.env, {
                    SAML_ENTRY_POINT: 'https://idp.example.com/sso',
                    SAML_CERT: 'MIIC-REAL-TEST-CERT',
                    SAML_ISSUER: 'crm-test-sp',
                    SAML_CALLBACK_URL: 'http://localhost:5000/auth/login/callback',
                    ...envOverrides,
                });

                jest.doMock('@node-saml/passport-saml', () => ({
                    Strategy: jest.fn().mockImplementation((options, verify) => {
                        capturedOptions = options;
                        capturedVerify = verify;
                        return { name: 'saml', authenticate: jest.fn() };
                    }),
                }));

                jest.spyOn(console, 'log').mockImplementation(() => {});
                jest.spyOn(console, 'warn').mockImplementation(() => {});
                jest.spyOn(console, 'error').mockImplementation(() => {});

                require('../../config/passport');
            });

            jest.dontMock('@node-saml/passport-saml');
            return { verify: capturedVerify, options: capturedOptions };
        }

        test('creates a new approved SSO user from SAML profile attributes and updates changed fields', async () => {
            delete process.env.SAML_ALLOWED_ORG_UNITS;
            const { verify, options } = loadSamlVerifyCallback();

            expect(typeof verify).toBe('function');
            expect(options.entryPoint).toBe('https://idp.example.com/sso');

            const doneCreate = jest.fn();
            await verify(
                {
                    nameID: `${P}_alice@corp.test`,
                    attributes: {
                        mail: `${P}_alice@corp.test`,
                        givenName: 'Alice',
                        sn: 'Yilmaz',
                    },
                },
                doneCreate,
            );

            expect(doneCreate).toHaveBeenCalledWith(
                null,
                expect.objectContaining({
                    shibbolethId: `${P}_alice@corp.test`,
                    username: `${P}_alice`,
                    email: `${P}_alice@corp.test`,
                    displayName: 'Alice Yilmaz',
                    role: 'user',
                    isApproved: true,
                }),
            );

            // Subsequent login with updated displayName updates user record
            const doneUpdate = jest.fn();
            await verify(
                {
                    nameID: `${P}_alice@corp.test`,
                    attributes: {
                        mail: `${P}_alice@corp.test`,
                        displayName: 'Alice Yilmaz Updated',
                    },
                },
                doneUpdate,
            );

            const reloaded = await User.findOne({ where: { shibbolethId: `${P}_alice@corp.test` } });
            expect(reloaded.displayName).toBe('Alice Yilmaz Updated');
        });

        test('enforces SAML_ALLOWED_ORG_UNITS and denies unauthorized org units', async () => {
            const { verify } = loadSamlVerifyCallback({
                SAML_ALLOWED_ORG_UNITS: 'ou=Engineering,ou=Sales',
            });

            const doneDenied = jest.fn();
            await verify(
                {
                    nameID: `${P}_blocked@corp.test`,
                    attributes: {
                        mail: `${P}_blocked@corp.test`,
                        eduPersonPrimaryOrgUnitDN: 'ou=External,dc=corp',
                    },
                },
                doneDenied,
            );

            expect(doneDenied).toHaveBeenCalledWith(null, false, { message: 'SAML_ORG_ACCESS_DENIED' });

            const doneAllowed = jest.fn();
            await verify(
                {
                    nameID: `${P}_allowed@corp.test`,
                    attributes: {
                        mail: `${P}_allowed@corp.test`,
                        displayName: 'Allowed User',
                        eduPersonPrimaryOrgUnitDN: 'ou=Engineering,dc=corp',
                    },
                },
                doneAllowed,
            );

            expect(doneAllowed).toHaveBeenCalledWith(
                null,
                expect.objectContaining({
                    shibbolethId: `${P}_allowed@corp.test`,
                }),
            );
        });

        test('returns error when profile has no unique SAML identifier', async () => {
            delete process.env.SAML_ALLOWED_ORG_UNITS;
            const { verify } = loadSamlVerifyCallback();

            const done = jest.fn();
            await verify({ attributes: { mail: 'noid@corp.test' } }, done);

            expect(done).toHaveBeenCalledWith(expect.any(Error));
        });
    });
});
