import { Prisma } from "@prisma/client";
import { createCache } from "async-cache-dedupe";
import { CreatePrismaRedisCache, FetchFromPrisma, MiddlewareParams } from "./types";

const DEFAULT_CACHE_TIME = 0;

export function createPrismaRedisExtension({
    models,
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

    const handleCacheFunctionCreation = (params) => {
        if (!cache[params.model]) {
            cache.define(
                params.model,
                {
                    references: ({ params }: { params: MiddlewareParams }, key: string) => {
                        return [`${params.model}~${key}`];
                    },
                },
                async function modelFetch({ cb, params }: { cb: FetchFromPrisma; params: MiddlewareParams }) {
                    return await cb(params);
                },
            );
        }
    };
    return Prisma.defineExtension({
        query: {
            $allModels: {
                async $allOperations({ model, operation, query, args }) {
                    const params = { model, operation, query, args };
                    if (
                        operation === "findUnique" ||
                        operation === "findFirst" ||
                        operation === "findMany" ||
                        operation === "count" ||
                        operation === "aggregate" ||
                        operation === "groupBy"
                    ) {
                        handleCacheFunctionCreation(params);
                        const cacheFunction = cache[model];

                        if (typeof cacheFunction !== "function") {
                            return query(args);
                        }

                        return await cacheFunction({ cb: () => query(args), params });
                    } else if (
                        operation === "create" ||
                        operation === "createMany" ||
                        operation === "update" ||
                        operation === "updateMany" ||
                        operation === "delete" ||
                        operation === "deleteMany" ||
                        operation === "upsert"
                    ) {
                        const result = await query(args);

                        await cache.invalidateAll(`*${model}~*`);

                        return result;
                    }
                },
            },
        },
    });
}
