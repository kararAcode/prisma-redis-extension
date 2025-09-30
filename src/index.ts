import { Prisma } from "@prisma/client/extension";
import { createCache } from "async-cache-dedupe";
import { defaultCacheMethods, defaultMutationMethods } from "./cacheMethods.js";
import type {
    CreatePrismaRedisCache,
    PrismaMutationAction,
    PrismaQueryAction,
} from "./types";

const DEFAULT_CACHE_TIME = 0;

export function createPrismaRedisExtension({
    onDedupe,
    onError,
    onHit,
    onMiss,
    storage,
    cacheTime = DEFAULT_CACHE_TIME,
    excludeModels = [],
    excludeMethods = [],
    transformer,
}: CreatePrismaRedisCache) {
    const cacheOptions = {
        onDedupe,
        onError,
        onHit,
        onMiss,
        storage,
        ttl: cacheTime,
        transformer,
    };
    const cache: any = createCache(cacheOptions);

    type QueryParams = {
        model: string;
        operation: string;
        args: object;
        query: Function;
    };

    type FetchFromPrismaFn = (params: QueryParams) => Promise<any>;

    const handleCacheFunctionCreation = (params: QueryParams) => {
        if (!cache[params.model]) {
            cache.define(
                params.model,
                {
                    references: ({ params }: { params: QueryParams }, key: string) => {
                        return [`${params.model}~${key}`];
                    },
                },
                async function modelFetch({ cb, params }: { cb: FetchFromPrismaFn; params: QueryParams }) {
                    return await cb(params);
                },
            );
        }
    };
    return Prisma.defineExtension({
        query: {
            $allModels: {
                async $allOperations({ model, operation, query, args }: any) {
                    try {
                        const params = { model, operation, query, args };
                        if (
                            defaultCacheMethods.includes(operation as PrismaQueryAction) &&
                            !excludeMethods.includes(operation as PrismaQueryAction) &&
                            !excludeModels.includes(model)
                        ) {
                            handleCacheFunctionCreation(params);
                            const cacheFunction = cache[model];

                            // console.log(cache)
                            if (typeof cacheFunction !== "function") {
                                return query(args);
                            }

                            return await cacheFunction({ cb: () => query(args), params });
                        } else if (
                            defaultMutationMethods.includes(operation as PrismaMutationAction)
                        ) {
                            const result = await query(args);

                            await cache.invalidateAll(`*${model}~*`);

                            return result;
                        }
                    } catch (err) {
                        console.log(err);
                    }
                },
            },
        },
    });
}
