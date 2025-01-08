/**
 * @jest-environment jsdom
 */

import { EntityFilterQuery } from '@backstage/catalog-client';
import { Entity } from '@backstage/catalog-model';
import { CatalogApi, catalogApiRef } from '@backstage/plugin-catalog-react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { FieldProps, IdSchema } from '@rjsf/utils';
import { fireEvent, waitFor, screen } from '@testing-library/react';
import React from 'react';
import { EntitiesPicker } from './EntitiesPicker';
import { AdditionalInformationApiClient, additionalInformationApiRef } from '@internal/plugin-picpay-commons';
import { AlertApi, alertApiRef } from '@backstage/core-plugin-api';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';

const makeEntity = (kind: string, namespace: string, name: string): Entity => ({
    apiVersion: 'backstage.io/v1beta1',
    kind,
    metadata: { namespace, name },
});

describe('<EntitiesPicker />', () => {
    let entities: Entity[];
    const onChange = jest.fn();
    const onChangeWithEntity = jest.fn();

    const schema = {};
    const required = false;
    let uiSchema: {
        'ui:options': {
            allowedKinds?: string[];
            allowedTypes?: string[];
            defaultKind?: string;
            allowArbitraryValues?: boolean;
            defaultNamespace?: string | false;
            catalogFilter?: EntityFilterQuery;
            useLabel?: string;
            useValue?: string;
            group?: {
                key: string;
                explicitly: boolean;
            };
        };
    };
    const rawErrors: string[] = [];
    const formData = undefined;

    let props: FieldProps;

    const catalogApi: jest.Mocked<CatalogApi> = {
        getLocationById: jest.fn(),
        getEntityByName: jest.fn(),
        queryEntities: jest.fn(async () => ({ items: entities })),
        addLocation: jest.fn(),
        getLocationByRef: jest.fn(),
        removeEntityByUid: jest.fn(),
    } as any;
    interface WrapperProps {
        children?: React.ReactNode;
    }
    let Wrapper: React.FC<WrapperProps>;

    const alertApi: jest.Mocked<AlertApi> = {
        post: jest.fn(),
    } as any;

    const additionalInformationApi: jest.Mocked<AdditionalInformationApiClient> = {
        getByEntityRef: jest.fn()
    } as any;


    beforeEach(() => {
        entities = [
            makeEntity('Group', 'default', 'team-a'),
            makeEntity('Group', 'default', 'squad-b'),
            makeEntity('Group', 'default', 'squad-c'),
            makeEntity('Group', 'default', 'squad-d'),
            makeEntity('Group', 'default', 'squad-e'),
        ];

        Wrapper = ({ children }: { children?: React.ReactNode }) => (
            <TestApiProvider apis={[[catalogApiRef, catalogApi], [alertApiRef, alertApi], [additionalInformationApiRef, additionalInformationApi]]}>
                {children}
            </TestApiProvider>
        );
    });

    afterEach(() => jest.resetAllMocks());

    describe('multiple selects', () => {
        beforeEach(() => {
            uiSchema = { 'ui:options': {} };
            props = {
                onChange,
                onChangeWithEntity,
                schema,
                required,
                uiSchema,
                rawErrors,
                formData,
            } as unknown as FieldProps<string[]>;

            catalogApi.queryEntities.mockResolvedValue({ items: entities, totalItems: entities.length, pageInfo: { nextCursor: undefined } });
        });

        it('calls api on render', async () => {
            const newProp = {
                ...props,
                uiSchema: {
                    'ui:options': {
                        catalogFilter: [
                            {
                                kind: "Group"
                            }
                        ], typeToSearch: false, maxEntities: 1
                    }
                },
                idSchema: { $id: 'test' } as IdSchema<string[]>
            } as unknown as FieldExtensionComponentProps<string[], { typeToSearch: boolean; maxEntities: number }>;

            const { getByRole } = await renderInTestApp(
                <Wrapper>
                    <EntitiesPicker {...newProp} />
                </Wrapper>,
            );

            await waitFor(() => { expect(catalogApi.queryEntities).toHaveBeenCalledTimes(1) });

            const input = getByRole('textbox');
            input.click();

            fireEvent.keyDown(input, {
                target: { value: 'squa' },
            });

            await waitFor(() => { expect(catalogApi.queryEntities).toHaveBeenCalledTimes(1) });
        });

        it('calls api only on typeToSearch', async () => {
            const newProp = {
                ...props,
                uiSchema: { 'ui:options': { typeToSearch: true, maxEntities: 1 } },
                idSchema: { $id: 'test' } as IdSchema<string[]>
            } as unknown as FieldExtensionComponentProps<string[], { typeToSearch: boolean; maxEntities: number }>;

            const { getByRole } = await renderInTestApp(
                <Wrapper>
                    <EntitiesPicker {...newProp} />
                </Wrapper>,
            );

            await waitFor(() => { expect(catalogApi.queryEntities).toHaveBeenCalledTimes(0) });

            const input = getByRole('textbox');
            input.click();

            fireEvent.keyDown(input, {
                target: { value: 'squa' },
            });

            await waitFor(() => { expect(catalogApi.queryEntities).toHaveBeenCalledTimes(1) });
        });

        it('select more than allowed using advanced filters', async () => {
            const newProp = {
                ...props,
                uiSchema: {
                    'ui:options': {
                        catalogFilter: [
                            {
                                kind: "Group"
                            }
                        ],
                        typeToSearch: false,
                        maxEntities: 1
                    }
                },
                idSchema: { $id: 'test' } as IdSchema<string[]>
            } as unknown as FieldExtensionComponentProps<string[], { typeToSearch: boolean; maxEntities: number }>;

            const { getByRole } = await renderInTestApp(
                <Wrapper>
                    <EntitiesPicker {...newProp} />
                </Wrapper>,
            );

            await waitFor(() => { expect(catalogApi.queryEntities).toHaveBeenCalledTimes(1) });

            const input = getByRole('textbox');

            fireEvent.keyDown(input, {
                target: { value: 'filter:metadata.name=squad-b' },
                key: 'Enter'
            });
            fireEvent.blur(input);

            await waitFor(() => { expect(alertApi.post).toHaveBeenCalledTimes(0) });

            fireEvent.keyDown(input, {
                target: { value: 'filter:metadata.name=squad-c' },
                key: 'Enter'
            });
            fireEvent.blur(input);

            await waitFor(() => { expect(alertApi.post).toHaveBeenCalledTimes(1) });
        });

        it('select more than allowed', async () => {
            const newProp = {
                ...props,
                uiSchema: {
                    'ui:options': {
                        catalogFilter: [
                            {
                                kind: "Group"
                            }
                        ],
                        typeToSearch: false,
                        maxEntities: 1
                    }
                },
                idSchema: { $id: 'test' } as IdSchema<string[]>
            } as unknown as FieldExtensionComponentProps<string[], { typeToSearch: boolean; maxEntities: number }>;

            const { getByTestId } = await renderInTestApp(
                <Wrapper>
                    <EntitiesPicker {...newProp} />
                </Wrapper>,
            );

            await waitFor(() => { expect(catalogApi.queryEntities).toHaveBeenCalledTimes(1) });

            const input = await waitFor(() => screen.getByRole('textbox'), { timeout: 1000 });

            await waitFor(() => fireEvent.click(input));
            fireEvent.change(input, {
                target: { value: 'squad' },
            });

            await waitFor(() => { expect(alertApi.post).toHaveBeenCalledTimes(0) });

            const opt1 = getByTestId('option-group-squad-b')
            expect(opt1).toBeInTheDocument()
            fireEvent.click(opt1);

            await waitFor(() => fireEvent.click(input));
            fireEvent.change(input, {
                target: { value: 'squad' },
            });

            const opt2 = getByTestId('option-group-squad-c')
            expect(opt2).toBeInTheDocument()
            fireEvent.click(opt2);

            await waitFor(() => { expect(alertApi.post).toHaveBeenCalledTimes(1) });
            await waitFor(() => {
                expect(alertApi.post).toHaveBeenCalledWith({
                    message: 'You can only select up to 1 entities.',
                    severity: 'warning',
                })
            });
        });
    });
});
