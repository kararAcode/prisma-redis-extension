import type Redis from 'ioredis';

export type PrismaQueryAction =
	| 'findFirst'
	| 'findFirstOrThrow'
	| 'findUnique'
	| 'findUniqueOrThrow'
	| 'findMany'
	| 'aggregate'
	| 'count'
	| 'groupBy'
	| 'findRaw'
	| 'runCommandRaw'
	| 'queryRaw'
	| 'aggregateRaw';

export type PrismaMutationAction =
	| 'create'
	| 'createMany'
    | 'createManyAndReturn'
	| 'update'
	| 'updateMany'
	| 'upsert'
	| 'delete'
	| 'deleteMany'
	| 'executeRaw'
	| 'executeRawUnsafe';

export type PrismaAction = PrismaQueryAction | PrismaMutationAction;

export type Result = Record<string, unknown> | Record<string, unknown>[];


export type ExtensionParams = {
	model: string;
	operation: string;
	args: object;
	query: Function;
};

// https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#use


export type FetchFromPrisma = (params: ExtensionParams) => Promise<Result>;

export type RedisMemoryStorage = {
	type: 'redis';
	options?: RedisMemoryOptions;
};

export type RedisMemoryOptions = {
	client: Redis;
	invalidation?: boolean | { referencesTTL?: number };
	log?: any;
};

export type MemoryStorage = {
	type: 'memory';
	options?: MemoryStorageOptions;
};

export type MemoryStorageOptions = {
	size?: number;
	invalidation?: boolean;
	log?: any;
};

export type TtlFunction = (data: any) => number;

export type CreatePrismaRedisCache = {
	models?: {
		model: (string & {});
		cacheKey?: string;
		cacheTime?: number | TtlFunction;
		excludeMethods?: PrismaQueryAction[];
		invalidateRelated?: string[];
	}[];
	storage?: RedisMemoryStorage;
	cacheTime?: number;
	excludeModels?: string[];
	excludeMethods?: PrismaQueryAction[];
	onError?: (key: string) => void;
	onHit?: (key: string) => void;
	onMiss?: (key: string) => void;
	onDedupe?: (key: string) => void;
	transformer?: {
		serialize: (data: any) => any;
		deserialize: (data: any) => any;
	};
};
