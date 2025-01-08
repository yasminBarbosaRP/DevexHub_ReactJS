// NunjucksBlocker.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { NunjucksBlocker } from './NunjucksBlocker';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import { AdditionalInformationApi, TemplateContext, additionalInformationApiRef } from '@internal/plugin-picpay-commons';
import { TestApiProvider } from '@backstage/test-utils';
import { CatalogApi, catalogApiRef } from '@backstage/plugin-catalog-react';
import { AlertApi, ConfigApi, IdentityApi, alertApiRef, configApiRef, identityApiRef } from '@backstage/core-plugin-api';
import { MemoryRouter } from 'react-router-dom';

const MockTemplateProvider: React.FC<{ value: any, children: any }> = ({ value, children }) => {
    return (
        <TemplateContext.Provider value={value}>
            {children}
        </TemplateContext.Provider>
    );
};

describe('NunjucksBlocker', () => {
    const mockContextValue = { extractIdentityValue: jest.fn(), loading: false, processItem: jest.fn() };
    const mockCatalogApi: jest.Mocked<CatalogApi> = {
        getLocationById: jest.fn(),
        getEntityByName: jest.fn(),
        getEntities: jest.fn(async () => ({ items: [] })),
        addLocation: jest.fn(),
        getLocationByRef: jest.fn(),
        removeEntityByUid: jest.fn(),
    } as any;
    const mockAlertApi: jest.Mocked<AlertApi> = {
        post: jest.fn(),
        alert$: jest.fn(),
    };
    const mockConfigApi: jest.Mocked<ConfigApi> = {
        subscribe: jest.fn(),
        has: jest.fn(),
        keys: jest.fn(),
        get: jest.fn(),
        getConfig: jest.fn(),
        getOptionalConfig: jest.fn(),
        getConfigArray: jest.fn(),
        getOptionalConfigArray: jest.fn(),
        getNumber: jest.fn(),
        getOptionalNumber: jest.fn(),
        getBoolean: jest.fn(),
        getOptionalBoolean: jest.fn(),
        getString: jest.fn(),
        getOptionalString: jest.fn(),
        getStringArray: jest.fn(),
        getOptionalStringArray: jest.fn(),
    } as any;
    const mockAdditionalInformationApi: jest.Mocked<AdditionalInformationApi> = {
        getByEntityRef: jest.fn()
    } as any;
    const mockIdentityApi: jest.Mocked<IdentityApi> = {
        getProfileInfo: jest.fn(),
        getBackstageIdentity: jest.fn(), getCredentials: jest.fn(),
        signOut: jest.fn(),
    } as any;
    const defaultProps: FieldExtensionComponentProps<boolean> = {
        onChange: jest.fn(),
        uiSchema: {
            'ui:options': {
                expression: 'someExpression',
                blockerMessage: 'This action is blocked.',
                redirectTo: '/redirect-page',
                redirectSeconds: 5,
            },
        },
        formData: false, rawErrors: [],
        // @ts-ignore
        idSchema: { $id: 'someId', $ref: 'someRef' },
        schema: { type: 'boolean' }, disabled: false,
        readonly: false,
        required: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the markdown message when formData is false', () => {
        mockContextValue.extractIdentityValue.mockImplementation(value => {
            if (value === 'someExpression') return 'false';
            if (value === 'This action is blocked.') return 'This action is blocked.';
            return '';
        });

        const props = { ...defaultProps };
        render(
            <MemoryRouter>
                <TestApiProvider apis={[[catalogApiRef, mockCatalogApi], [additionalInformationApiRef, mockAdditionalInformationApi], [configApiRef, mockConfigApi], [alertApiRef, mockAlertApi], [identityApiRef, mockIdentityApi]]}>
                    <MockTemplateProvider value={mockContextValue}>
                        <NunjucksBlocker {...props} />
                    </MockTemplateProvider>
                </TestApiProvider>
            </MemoryRouter>);

        expect(screen.getByText('This action is blocked.')).toBeInTheDocument();
    });

    it('does not render anything when formData is true', () => {
        const props = { ...defaultProps, formData: true };
        render(
            <MemoryRouter>
                <TestApiProvider apis={[[catalogApiRef, mockCatalogApi], [additionalInformationApiRef, mockAdditionalInformationApi], [configApiRef, mockConfigApi], [alertApiRef, mockAlertApi], [identityApiRef, mockIdentityApi]]}>
                    <MockTemplateProvider value={mockContextValue}>
                        <NunjucksBlocker {...props} />
                    </MockTemplateProvider>
                </TestApiProvider>
            </MemoryRouter>);

        expect(screen.queryByText('This action is blocked.')).not.toBeInTheDocument();
    });

    it('calls onChange with the correct value based on expression evaluation', () => {
        const props = { ...defaultProps };
        mockContextValue.extractIdentityValue.mockReturnValue('true');

        render(
            <MemoryRouter>
                <TestApiProvider apis={[[catalogApiRef, mockCatalogApi], [additionalInformationApiRef, mockAdditionalInformationApi], [configApiRef, mockConfigApi], [alertApiRef, mockAlertApi], [identityApiRef, mockIdentityApi]]}>
                    <MockTemplateProvider value={mockContextValue}>
                        <NunjucksBlocker {...props} />
                    </MockTemplateProvider>
                </TestApiProvider>
            </MemoryRouter>);

        expect(props.onChange).toHaveBeenCalledWith(true);
    });

    it('calls onChange with false when expression evaluates to false', () => {
        const props = { ...defaultProps };
        mockContextValue.extractIdentityValue.mockReturnValue('false');

        render(
            <MemoryRouter>
                <TestApiProvider apis={[[catalogApiRef, mockCatalogApi], [additionalInformationApiRef, mockAdditionalInformationApi], [configApiRef, mockConfigApi], [alertApiRef, mockAlertApi], [identityApiRef, mockIdentityApi]]}>
                    <MockTemplateProvider value={mockContextValue}>
                        <NunjucksBlocker {...props} />
                    </MockTemplateProvider>
                </TestApiProvider>
            </MemoryRouter>);

        expect(props.onChange).toHaveBeenCalledWith(false);
    });

    it('redirects after countdown and displays countdown', async () => {
        const props = {
            ...defaultProps
        };
        mockContextValue.extractIdentityValue.mockReturnValue('false');

        render(
            <MemoryRouter>
                <TestApiProvider apis={[[catalogApiRef, mockCatalogApi], [additionalInformationApiRef, mockAdditionalInformationApi], [configApiRef, mockConfigApi], [alertApiRef, mockAlertApi], [identityApiRef, mockIdentityApi]]}>
                    <MockTemplateProvider value={mockContextValue}>
                        <NunjucksBlocker {...props} />
                    </MockTemplateProvider>
                </TestApiProvider>
            </MemoryRouter>);

        expect(screen.queryByText('This action is blocked.')).toBe(null);
        expect(screen.getByText(/Redirecting in/)).toBeInTheDocument();
    });
});
