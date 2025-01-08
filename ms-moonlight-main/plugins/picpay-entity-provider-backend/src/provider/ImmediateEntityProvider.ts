import {
    ANNOTATION_LOCATION,
    ANNOTATION_ORIGIN_LOCATION,
    Entity,
    entitySchemaValidator,
} from '@backstage/catalog-model';
import { InputError } from '@backstage/errors';
import {
    DeferredEntity,
    EntityProvider,
    EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { parseEntityYaml } from '@backstage/plugin-catalog-backend';
import bodyParser from 'body-parser';
import express from 'express';
import Router from 'express-promise-router';
import lodash from 'lodash';
import { Logger } from 'winston';
import yaml from 'js-yaml';

/**
 * An entity provider attached to a router, that lets users perform direct
 * manipulation of a set of entities using REST requests.
 *
 * @remarks
 *
 * Installation:
 *
 * Add it to the catalog builder in your
 * `packages/backend/src/plugins/catalog.ts`. Note that it BOTH adds a provider
 * and amends the catalog router:
 *
 * ```
 * const immediate = new ImmediateEntityProvider({
 *   logger: env.logger,
 *   handleEntity: (deferred) => {
 *     // Optionally modify the incoming entity
 *   },
 * });
 * builder.addEntityProvider(immediate);
 *
 * // ...
 *
 * return router.use('/immediate', immediate.getRouter());
 * ```
 *
 * API (assume a catalog prefix, e.g. `/api/catalog`):
 *
 * - `POST /immediate/entities`: Accepts a YAML document of entities, and
 *   inserts or updates the entities that match that document. Returns 201 OK on
 *   success.
 *
 * - `PUT /immediate/entities`: Accepts a YAML document of entities, and
 *   replaces the entire set of entities managed by the provider with those
 *   entities. Returns 201 OK on success.
 */



export class ImmediateEntityProvider implements EntityProvider {
    private connection?: EntityProviderConnection;
    private readonly entityValidator: (data: unknown) => Entity;

    constructor(private readonly options: ImmediateEntityProviderOptions) {
        this.entityValidator = entitySchemaValidator();
    }

    /** {@inheritdoc @backstage/plugin-catalog-backend#EntityProvider.getProviderName} */
    getProviderName() {
        return `ImmediateEntityProvider`;
    }

    /** {@inheritdoc @backstage/plugin-catalog-backend#EntityProvider.connect} */
    async connect(connection: EntityProviderConnection) {
        this.connection = connection;
    }

    getRouter(): express.Router {
        const router = Router();

        router.use(bodyParser.raw({ type: '*/*' }));

        router.post('/entities/:locationKey', async (req, res) => {
            try {

                if (!this.connection) {
                    throw new Error(`Service is not yet initialized`);
                }
                const deferred = await this.getRequestBodyEntities(req);
                await this.connection.applyMutation({
                    type: 'delta',
                    added: deferred,
                    removed: [],
                });
                res.status(201).end();
            } catch (err: any) {
                if (err instanceof InputError) {
                    res.status(400).json({ error: err.message });
                    return;
                }
                res.status(500).json({ error: err.message });
            }
        });

        router.put('/entities/:locationKey', async (req, res) => {
            try {
                if (!this.connection) {
                    throw new Error(`Service is not yet initialized`);
                }
                const deferred = await this.getRequestBodyEntities(req);
                await this.connection.applyMutation({
                    type: 'full',
                    entities: deferred,
                });
                res.status(201).end();
            } catch (err: any) {
                if (err instanceof InputError) {
                    res.status(400).json({ error: err.message });
                    return;
                }
                res.status(500).json({ error: err.message });
            }
        });

        return router;
    }

    private async getRequestBodyEntities(
        req: express.Request,
    ): Promise<DeferredEntity[]> {
        if (!Buffer.isBuffer(req.body) || !req.body.length) {
            throw new InputError(`Missing request body`);
        }

        const result: DeferredEntity[] = [];
        if (req.body !== null && /^[\s]*[\{\[]/.test(req.body.toString('utf8'))) {
            const parsed = JSON.parse(req.body.toString('utf8'));
            if (Array.isArray(parsed)) {
                req.body = Buffer.from(parsed.map(item => yaml.dump(item)).join('---\n'), 'utf8');
            } else {
                req.body = Buffer.from(yaml.dump(parsed), 'utf8');
            }
        }
        for await (const item of parseEntityYaml(req.body, {
            type: 'immediate',
            target: 'immediate',
        })) {
            if (item.type === 'entity') {
                const deferred: DeferredEntity = {
                    entity: lodash.merge(
                        {
                            metadata: {
                                annotations: {
                                    [ANNOTATION_ORIGIN_LOCATION]: `immediate:${req.params.locationKey}`,
                                    [ANNOTATION_LOCATION]: `immediate:${req.params.locationKey}`,
                                },
                            },
                        },
                        item.entity,
                    ),
                    locationKey: `immediate:${req.params.locationKey}`,
                };

                await this.options.handleEntity?.(req, deferred);
                deferred.entity = this.entityValidator(deferred.entity);

                result.push(deferred);
            } else if (item.type === 'error') {
                throw new InputError(`Malformed entity YAML, ${item.error}`);
            } else {
                throw new InputError(`Internal error, failed to parse entity`);
            }
        }

        return result;
    }
}

/**
 * Options for {@link ImmediateEntityProvider}.
 */
export interface ImmediateEntityProviderOptions {
    /**
     * The logger to use.
     */
    logger: Logger;

    /**
     * An optional function to perform adjustments to, or validate, an incoming
     * entity before being stored. It is permitted to modify the deferred entity,
     * but the request is static and has had its body consumed.
     */
    handleEntity?: (
        request: express.Request,
        deferred: DeferredEntity,
    ) => void | Promise<void>;
}
