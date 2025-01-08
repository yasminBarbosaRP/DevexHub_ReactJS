// UrlDataPicker.test.tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { UrlDataPicker } from './UrlData';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import { AlertApi, ConfigApi, IdentityApi, alertApiRef, configApiRef, identityApiRef } from '@backstage/core-plugin-api';
import { TestApiProvider } from '@backstage/test-utils';
import { AdditionalInformationApi, TemplateContext, additionalInformationApiRef } from '@internal/plugin-picpay-commons';
import { CatalogApi, catalogApiRef } from '@backstage/plugin-catalog-react';


const mockFetch = jest.fn();
global.fetch = mockFetch;


const MockTemplateProvider: React.FC<{ value: any, children: any }> = ({ value, children }) => {
    return (
        <TemplateContext.Provider value={value}>
            {children}
        </TemplateContext.Provider>
    );
};

describe('UrlDataPicker', () => {

    const mockContextValue = { extractIdentityValue: jest.fn(), loading: false, processItem: jest.fn() };
    const mockIdentityApiRef: jest.Mocked<IdentityApi> = {
        getProfileInfo: jest.fn(),
        getBackstageIdentity: jest.fn(),
        getCredentials: jest.fn(),
        signOut: jest.fn(),
    } as any;
    const mockAdditionalInformationApi: jest.Mocked<AdditionalInformationApi> = {
        getByEntityRef: jest.fn()
    } as any;
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

    const defaultProps: FieldExtensionComponentProps<string> = {
        onChange: jest.fn(),
        uiSchema: {
            'ui:options': {
                key: 'name',
                endpoint: '/api/entities',
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer token'
                }
            },
        },
        formData: '',
        rawErrors: [],
        // @ts-ignore
        idSchema: { $id: 'root' },
        schema: { type: 'string', title: 'Entity', description: 'An entity from the catalog' },
        disabled: false,
        readonly: false,
        required: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockClear();
        mockContextValue.extractIdentityValue = jest.fn(value => value)
    });

    it('renders correctly with default props', () => {
        render(
            <TestApiProvider apis={[[catalogApiRef, mockCatalogApi], [additionalInformationApiRef, mockAdditionalInformationApi], [configApiRef, mockConfigApi], [alertApiRef, mockAlertApi], [identityApiRef, mockIdentityApiRef]]}>
                <MockTemplateProvider value={mockContextValue}>
                    <UrlDataPicker {...defaultProps} />
                </MockTemplateProvider>
            </TestApiProvider>
        );

        expect(screen.getByLabelText('Entity')).toBeInTheDocument();
        expect(screen.getByText('An entity from the catalog')).toBeInTheDocument();
    });

    it('displays options fetched from the API', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [{ name: 'Entity1' }, { name: 'Entity2' }],
        });

        render(
            <TestApiProvider apis={[[catalogApiRef, mockCatalogApi], [additionalInformationApiRef, mockAdditionalInformationApi], [configApiRef, mockConfigApi], [alertApiRef, mockAlertApi], [identityApiRef, mockIdentityApiRef]]}>
                <MockTemplateProvider value={mockContextValue}>
                    <UrlDataPicker {...defaultProps} />
                </MockTemplateProvider>
            </TestApiProvider>
        );

        // Wait for the fetch to complete
        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

        // Simulate user interaction to open the dropdown
        fireEvent.mouseDown(screen.getByRole('textbox'));

        // Wait for the options to appear
        await waitFor(() => {
            expect(screen.getByText('Entity1')).toBeInTheDocument();
            expect(screen.getByText('Entity2')).toBeInTheDocument();
        });
    });

    it('handles fetch errors gracefully', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Error fetching data'));

        render(
            <TestApiProvider apis={[[catalogApiRef, mockCatalogApi], [additionalInformationApiRef, mockAdditionalInformationApi], [configApiRef, mockConfigApi], [alertApiRef, mockAlertApi], [identityApiRef, mockIdentityApiRef]]}>
                <MockTemplateProvider value={mockContextValue}>
                    <UrlDataPicker {...defaultProps} />
                </MockTemplateProvider>
            </TestApiProvider>
        );

        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

        await waitFor(() => {
            expect(mockAlertApi.post).toHaveBeenCalledWith({
                message: 'Error fetching data',
                severity: 'error',
            })
        });
    });

    it('allows changing selected options', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [{ name: 'Entity1' }, { name: 'Entity2' }],
        });

        render(
            <TestApiProvider apis={[[catalogApiRef, mockCatalogApi], [additionalInformationApiRef, mockAdditionalInformationApi], [configApiRef, mockConfigApi], [alertApiRef, mockAlertApi], [identityApiRef, mockIdentityApiRef]]}>
                <MockTemplateProvider value={mockContextValue}>
                    <UrlDataPicker {...defaultProps} />
                </MockTemplateProvider>
            </TestApiProvider>
        );

        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'Entity1' } });

        expect(screen.getByText('Entity1')).toBeInTheDocument();
        expect(screen.queryByText('Entity2')).not.toBeInTheDocument();

        fireEvent.change(input, { target: { value: 'Entity2' } });

        expect(screen.queryByText('Entity1')).not.toBeInTheDocument();
        expect(screen.queryByText('Entity2')).toBeInTheDocument();


        fireEvent.change(input, { target: { value: 'xpto' } });

        await waitFor(() => expect(screen.queryByText('Entity1')).not.toBeInTheDocument());
        expect(screen.queryByText('Entity2')).not.toBeInTheDocument();
    });

    it('handles headers and body correctly in fetch', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [{ name: 'Entity1' }, { name: 'Entity2' }],
        });

        render(
            <TestApiProvider apis={[[catalogApiRef, mockCatalogApi], [additionalInformationApiRef, mockAdditionalInformationApi], [configApiRef, mockConfigApi], [alertApiRef, mockAlertApi], [identityApiRef, mockIdentityApiRef]]}>
                <MockTemplateProvider value={mockContextValue}>
                    <UrlDataPicker {...defaultProps} />
                </MockTemplateProvider>
            </TestApiProvider>
        );

        await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/entities', {
            method: 'GET',
            headers: { 'Authorization': 'Bearer token' },
            body: undefined,
        }));
    });
});
